// Password reset and login lockout features
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { createLogger } from '@los/shared-libs';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('auth-service-security');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-secret-key-min-32-chars';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export function setupAuthFeatures(app: any, pool: Pool) {
  // POST /api/auth/forgot-password - request password reset OTP
  const ForgotPasswordSchema = z.object({
    username: z.string().min(1).optional(),
    email: z.string().email().optional(),
  }).refine((data) => data.username || data.email, {
    message: 'Either username or email is required',
  });

  app.post('/api/auth/forgot-password', async (req: any, res: any) => {
    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    try {
      // Find user by username or email
      let query = 'SELECT user_id, username, email FROM users WHERE';
      const params: any[] = [];
      
      if (parsed.data.username && parsed.data.email) {
        query += ' (username = $1 OR email = $2)';
        params.push(parsed.data.username, parsed.data.email);
      } else if (parsed.data.username) {
        query += ' username = $1';
        params.push(parsed.data.username);
      } else {
        query += ' email = $1';
        params.push(parsed.data.email);
      }

      const { rows } = await pool.query(query, params);

      if (rows.length === 0) {
        // Don't reveal if user exists or not (security best practice)
        logger.warn('PasswordResetRequest', { reason: 'User not found', identifier: parsed.data.username || parsed.data.email });
        return res.status(200).json({ message: 'If the account exists, a password reset OTP has been sent' });
      }

      const user = rows[0];

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);

      // Store OTP in database (expires in 5 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);

      await pool.query(
        'INSERT INTO password_reset_otps (user_id, otp_hash, purpose, expires_at) VALUES ($1, $2, $3, $4)',
        [user.user_id, otpHash, 'password_reset', expiresAt]
      );

      // TODO: Send OTP via email/SMS (integrate with notification service)
      // For now, log it (remove in production!)
      logger.info('PasswordResetOTPGenerated', { userId: user.user_id, otp: '***' });

      // In production, send OTP via email/SMS
      // For development, return OTP in response (remove in production!)
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({
          message: 'Password reset OTP generated',
          otp: otp, // REMOVE IN PRODUCTION!
          expiresIn: '5 minutes'
        });
      }

      return res.status(200).json({
        message: 'If the account exists, a password reset OTP has been sent to your email/mobile',
        expiresIn: '5 minutes'
      });
    } catch (err) {
      logger.error('ForgotPasswordError', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to process password reset request' });
    }
  });

  // POST /api/auth/reset-password - reset password with OTP
  const ResetPasswordSchema = z.object({
    username: z.string().min(1).optional(),
    email: z.string().email().optional(),
    otp: z.string().length(6),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }).refine((data) => data.username || data.email, {
    message: 'Either username or email is required',
  });

  app.post('/api/auth/reset-password', async (req: any, res: any) => {
    const parsed = ResetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find user
      let query = 'SELECT user_id, username, email FROM users WHERE';
      const params: any[] = [];
      
      if (parsed.data.username && parsed.data.email) {
        query += ' (username = $1 OR email = $2)';
        params.push(parsed.data.username, parsed.data.email);
      } else if (parsed.data.username) {
        query += ' username = $1';
        params.push(parsed.data.username);
      } else {
        query += ' email = $1';
        params.push(parsed.data.email);
      }

      const { rows: userRows } = await client.query(query, params);

      if (userRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(401).json({ error: 'Invalid OTP or user not found' });
      }

      const user = userRows[0];

      // Find valid OTP
      const { rows: otpRows } = await client.query(
        'SELECT otp_id, otp_hash, expires_at, used_at FROM password_reset_otps WHERE user_id = $1 AND purpose = $2 AND expires_at > now() AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [user.user_id, 'password_reset']
      );

      if (otpRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(401).json({ error: 'Invalid or expired OTP' });
      }

      const otpRecord = otpRows[0];

      // Verify OTP
      const otpValid = await bcrypt.compare(parsed.data.otp, otpRecord.otp_hash);
      if (!otpValid) {
        await client.query('ROLLBACK');
        return res.status(401).json({ error: 'Invalid OTP' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = now() WHERE user_id = $2',
        [newPasswordHash, user.user_id]
      );

      // Mark OTP as used
      await client.query(
        'UPDATE password_reset_otps SET used_at = now() WHERE otp_id = $1',
        [otpRecord.otp_id]
      );

      // Delete all refresh tokens for security
      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.user_id]);

      // Reset failed login attempts
      await client.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1',
        [user.user_id]
      );

      await client.query('COMMIT');

      logger.info('PasswordResetSuccess', { userId: user.user_id });

      return res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('ResetPasswordError', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to reset password' });
    } finally {
      client.release();
    }
  });

  // Helper function to check and handle login lockout
  async function checkLoginLockout(username: string): Promise<{ locked: boolean; lockoutUntil?: Date; error?: string }> {
    const { rows } = await pool.query(
      'SELECT user_id, failed_login_attempts, locked_until FROM users WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      return { locked: false };
    }

    const user = rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockoutUntil = new Date(user.locked_until);
      const minutesRemaining = Math.ceil((lockoutUntil.getTime() - Date.now()) / 60000);
      return {
        locked: true,
        lockoutUntil,
        error: `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`
      };
    }

    // If lockout period has expired, reset
    if (user.locked_until && new Date(user.locked_until) <= new Date()) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1',
        [user.user_id]
      );
    }

    return { locked: false };
  }

  // Helper function to increment failed login attempts
  async function incrementFailedAttempts(username: string): Promise<void> {
    const { rows } = await pool.query(
      'SELECT user_id, failed_login_attempts FROM users WHERE username = $1',
      [username]
    );

    if (rows.length === 0) return;

    const user = rows[0];
    const newAttempts = (user.failed_login_attempts || 0) + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Lock account
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE user_id = $3',
        [newAttempts, lockoutUntil, user.user_id]
      );

      logger.warn('AccountLocked', { username, userId: user.user_id, attempts: newAttempts });
    } else {
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1 WHERE user_id = $2',
        [newAttempts, user.user_id]
      );
    }
  }

  // Helper function to reset failed login attempts
  async function resetFailedAttempts(userId: string): Promise<void> {
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1',
      [userId]
    );
  }

  return {
    checkLoginLockout,
    incrementFailedAttempts,
    resetFailedAttempts
  };
}

