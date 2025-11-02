import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createPgPool, correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler } from '@los/shared-libs';
import cors from 'cors';
import { setupAuthFeatures } from './auth-features';

// Ensure DATABASE_URL is set before creating pool
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://los:los@localhost:5432/los';
  console.warn('⚠️  DATABASE_URL not set, using default: postgres://los:los@localhost:5432/los');
}

export const pool = createPgPool();
const logger = createLogger('auth-service');

export const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  maxAge: 86400
};
app.use(cors(corsOptions));

app.use(json());
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

// Initialize users table if it doesn't exist
async function ensureUsersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        roles TEXT[] DEFAULT ARRAY['applicant']::TEXT[],
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    
    // Create refresh_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `);
    
    // Create a default admin user if none exists (password: admin123)
    const { rows: existingUsers } = await pool.query('SELECT user_id FROM users WHERE username = $1', ['admin']);
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (username, email, password_hash, roles) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin@los.local', hashedPassword, ['admin', 'maker', 'checker']]
      );
      logger.info('CreatedDefaultAdminUser', { username: 'admin' });
    }
  } catch (err) {
    logger.error('EnsureUsersTableError', { error: (err as Error).message });
  }
}

// Initialize on startup
ensureUsersTable();

// JWT secret keys (in production, use secure random keys from environment)
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-secret-key-min-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-in-production-refresh-secret-key-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Setup auth security features
const authHelpers = setupAuthFeatures(app, pool);

// POST /api/auth/login - login endpoint
app.post('/api/auth/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const { username, password } = parsed.data;

    // Check for login lockout
    const lockoutCheck = await authHelpers.checkLoginLockout(username);
    if (lockoutCheck.locked) {
      logger.warn('LoginFailed', { reason: 'Account locked', username, lockoutUntil: lockoutCheck.lockoutUntil });
      return res.status(403).json({ error: lockoutCheck.error || 'Account is locked' });
    }

    // Find user by username
    const { rows } = await pool.query(
      'SELECT user_id, username, email, password_hash, roles, is_active FROM users WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      logger.warn('LoginFailed', { reason: 'User not found', username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.is_active) {
      logger.warn('LoginFailed', { reason: 'User inactive', username });
      return res.status(403).json({ error: 'User account is inactive' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      // Increment failed login attempts
      await authHelpers.incrementFailedAttempts(username);
      logger.warn('LoginFailed', { reason: 'Invalid password', username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        sub: user.user_id,
        username: user.username,
        email: user.email,
        roles: user.roles || []
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        sub: user.user_id,
        type: 'refresh'
      },
      JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );

    // Store refresh token hash in database
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.user_id, refreshTokenHash, expiresAt]
    );

    // Reset failed login attempts on successful login
    await authHelpers.resetFailedAttempts(user.user_id);

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = now(), updated_at = now() WHERE user_id = $1',
      [user.user_id]
    );

    logger.info('LoginSuccess', { username, userId: user.user_id });

    return res.status(200).json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        roles: user.roles || []
      }
    });
  } catch (err) {
    logger.error('LoginError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh - refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const parsed = RefreshTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const { refreshToken } = parsed.data;

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      logger.warn('RefreshTokenInvalid', { error: (err as Error).message });
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const userId = decoded.sub;

    // Check if refresh token exists in database
    const { rows: tokenRows } = await pool.query(
      'SELECT token_id, token_hash, expires_at FROM refresh_tokens WHERE user_id = $1 AND expires_at > now() ORDER BY created_at DESC',
      [userId]
    );

    let tokenFound = false;
    for (const row of tokenRows) {
      const isValid = await bcrypt.compare(refreshToken, row.token_hash);
      if (isValid) {
        tokenFound = true;
        break;
      }
    }

    if (!tokenFound) {
      logger.warn('RefreshTokenNotFound', { userId });
      return res.status(401).json({ error: 'Refresh token not found or expired' });
    }

    // Get user details
    const { rows: userRows } = await pool.query(
      'SELECT user_id, username, email, roles, is_active FROM users WHERE user_id = $1',
      [userId]
    );

    if (userRows.length === 0 || !userRows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = userRows[0];

    // Generate new access token
    const accessToken = jwt.sign(
      {
        sub: user.user_id,
        username: user.username,
        email: user.email,
        roles: user.roles || []
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('TokenRefreshed', { username: user.username, userId: user.user_id });

    return res.status(200).json({
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900 // 15 minutes in seconds
    });
  } catch (err) {
    logger.error('RefreshTokenError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

// POST /api/auth/logout - logout (revoke refresh token)
app.post('/api/auth/logout', async (req, res) => {
  const auth = req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = auth.substring('Bearer '.length);
  
  try {
    // Verify token to get user ID
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.sub;

    // Delete all refresh tokens for this user
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    logger.info('LogoutSuccess', { userId });
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    // Token might be expired, but we still return success for logout
    logger.debug('LogoutWithExpiredToken', { error: (err as Error).message });
    return res.status(200).json({ message: 'Logged out successfully' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3016;
app.listen(port, () => {
  logger.info('Auth service listening', { port });
});

