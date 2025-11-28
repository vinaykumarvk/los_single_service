import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import cors from 'cors';
import multer from 'multer';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import { createSupabaseClient, querySupabase, connectSupabase, correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler, createS3Client, putObjectBuffer, getPresignedUrl, SupabaseClient } from '@los/shared-libs';

import { setupApplicationSSE, broadcastApplicationUpdate } from './sse-handler';
import { setupRMDashboardEndpoint } from './rm-dashboard';
import { setupHierarchicalDashboards } from './hierarchical-dashboards';
import { setupPropertyEndpoints } from './property-endpoints';
import { extractDocumentMetadata } from './ocr';

// Export supabaseClient and app for testing
// Ensure DATABASE_URL is set before creating client
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://los:los@localhost:5432/los';
  console.warn('⚠️  DATABASE_URL not set, using default: postgres://los:los@localhost:5432/los');
  console.warn('💡 To use Supabase, set DATABASE_URL to your Supabase connection string');
}

// Initialize Supabase client - this is now the primary database interface
let supabaseClient: SupabaseClient;
try {
  supabaseClient = createSupabaseClient();
  console.log('✅ Supabase SDK client initialized - all database operations will use Supabase SDK');
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', (error as Error).message);
  console.error('   Make sure DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  console.error('   Attempting to start server anyway - health endpoint will work but API calls will fail');
  console.error('   Set up secrets in GCP Secret Manager and redeploy to fix this');
  // Create a stub client to prevent crashes during initialization
  // This allows the container to start and pass health checks
  supabaseClient = null as any;
}

// Export for compatibility with existing code
export { supabaseClient };
const logger = createLogger('monolith'); // Consolidated monolithic service

export const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

app.use(json());
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

// JWT Authentication Middleware - Extract user from token
app.use((req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.sub,
        sub: decoded.sub,
        username: decoded.username,
        email: decoded.email,
        roles: decoded.roles || []
      };
    } catch (err) {
      // Token invalid or expired - continue without user (will be handled by endpoint)
    }
  }
  next();
});

// Configure multer for file uploads (document upload functionality)
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } });

// S3/MinIO client for document storage
const s3 = createS3Client();
const bucket = process.env.MINIO_BUCKET || 'los-docs';

// Helper function to record application history
async function recordHistory(
  applicationId: string,
  eventType: string,
  eventSource: string,
  eventData: any,
  actorId?: string
) {
  try {
    const historyId = uuidv4();
    const userId = actorId || 'system';
    await querySupabase(
      supabaseClient,
      `INSERT INTO application_history 
       (history_id, application_id, event_type, event_source, event_data, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [historyId, applicationId, eventType, eventSource, JSON.stringify(eventData), userId]
    );
  } catch (err) {
    logger.error('RecordHistoryError', { error: (err as Error).message, applicationId, eventType });
    // Don't fail the main operation if history recording fails
  }
}

// Root endpoint - Serve frontend or API info
app.get('/', (_req, res) => {
  // Try to serve frontend index.html
  const frontendIndexPath = path.join(__dirname, '../../web-dist/index.html');
  res.sendFile(frontendIndexPath, (err) => {
    if (err) {
      // Fallback to API info if frontend not available
      res.json({
        service: 'LOS Monolith API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          metrics: '/metrics',
          auth: '/api/auth/login',
          applications: '/api/applications',
          applicants: '/api/applicants',
          masters: '/api/masters/products',
          documents: '/api/documents',
          dashboard: '/api/dashboard'
        },
        documentation: 'See API documentation for details'
      });
    }
  });
});

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

// Serve static frontend files (if available)
const frontendPath = path.join(__dirname, '../../web-dist');
app.use(express.static(frontendPath));

// ============================================
// AUTHENTICATION ENDPOINTS (Consolidated)
// ============================================

// Initialize users table - skip if using Supabase (tables should already exist from migrations)
async function ensureUsersTable() {
  // Using Supabase - tables should already exist from migrations
  // This function is kept for backward compatibility but does nothing with Supabase
  try {
    // Tables should be created via migrations, not here
    logger.debug('EnsureUsersTable', { message: 'Using Supabase - tables should exist from migrations' });
  } catch (err) {
    logger.error('EnsureUsersTableError', { error: (err as Error).message });
  }
}
ensureUsersTable();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-secret-key-min-32-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-in-production-refresh-secret-key-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

async function checkLoginLockout(username: string) {
  const { rows } = await querySupabase(
    supabaseClient,
    'SELECT failed_login_attempts, locked_until FROM users WHERE username = $1',
    [username]
  );
  if (rows.length === 0) return { locked: false };
  const user = rows[0];
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return { locked: true, lockoutUntil: user.locked_until, error: 'Account locked' };
  }
  return { locked: false };
}

async function incrementFailedAttempts(username: string) {
  // Get current attempts first
  const { data: user } = await supabaseClient
    .from('users')
    .select('failed_login_attempts')
    .eq('username', username)
    .single();
  
  const newAttempts = (user?.failed_login_attempts || 0) + 1;
  const lockedUntil = newAttempts >= MAX_LOGIN_ATTEMPTS 
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString()
    : null;
  
  await supabaseClient
    .from('users')
    .update({ 
      failed_login_attempts: newAttempts,
      locked_until: lockedUntil
    })
    .eq('username', username);
}

async function resetFailedAttempts(userId: string) {
  await supabaseClient
    .from('users')
    .update({ failed_login_attempts: 0, locked_until: null })
    .eq('user_id', userId);
}

const LoginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

// TEST MODE: Bypass login for testing (only in development)
app.post('/api/auth/login', async (req, res) => {
  // TEST BYPASS: If TEST_MODE is enabled, return a test token without database access
  if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'development') {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
    
    const { username } = parsed.data;
    const testUsers: Record<string, { id: string; roles: string[]; email: string }> = {
      'rm1': { id: '00000001-0000-0000-0000-000000000001', roles: ['rm', 'relationship_manager'], email: 'rm1@los.local' },
      'rm2': { id: '00000001-0000-0000-0000-000000000002', roles: ['rm', 'relationship_manager'], email: 'rm2@los.local' },
      'srm1': { id: 'a0000001-0000-0000-0000-000000000001', roles: ['srm', 'relationship_manager'], email: 'srm1@los.local' },
      'admin': { id: 'a0000004-0000-0000-0000-000000000001', roles: ['admin', 'maker', 'checker'], email: 'admin@los.local' },
      'ops1': { id: 'b0000003-0000-0000-0000-000000000001', roles: ['ops', 'operations'], email: 'ops1@los.local' },
    };
    
    const testUser = testUsers[username] || testUsers['rm1'];
    const accessToken = jwt.sign(
      { sub: testUser.id, username, email: testUser.email, roles: testUser.roles },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    const refreshToken = jwt.sign(
      { sub: testUser.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info('TestLoginBypass', { username, userId: testUser.id });
    return res.status(200).json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: { id: testUser.id, username, email: testUser.email, roles: testUser.roles }
    });
  }

  // Normal login flow (requires database)
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const { username, password } = parsed.data;
    const lockoutCheck = await checkLoginLockout(username);
    if (lockoutCheck.locked) return res.status(403).json({ error: 'Account locked' });
    // Use Supabase SDK or pool
    let user: any;
    const { data, error } = await supabaseClient
      .from('users')
      .select('user_id, username, email, password_hash, roles, is_active')
      .eq('username', username)
      .single();
    if (error || !data || !data.is_active) return res.status(401).json({ error: 'Invalid credentials' });
    user = data;
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      await incrementFailedAttempts(username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const accessToken = jwt.sign({ sub: user.user_id, username: user.username, email: user.email, roles: user.roles || [] }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ sub: user.user_id, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await querySupabase(supabaseClient, 'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [user.user_id, refreshTokenHash, expiresAt]);
    await resetFailedAttempts(user.user_id);
    await querySupabase(supabaseClient, 'UPDATE users SET last_login = now() WHERE user_id = $1', [user.user_id]);
    return res.status(200).json({ accessToken, refreshToken, tokenType: 'Bearer', expiresIn: 900, user: { id: user.user_id, username: user.username, email: user.email, roles: user.roles || [] } });
  } catch (err) {
    logger.error('LoginError', { error: (err as Error).message });
    return res.status(500).json({ error: 'Login failed' });
  }
});

const RefreshTokenSchema = z.object({ refreshToken: z.string().min(1) });
app.post('/api/auth/refresh', async (req, res) => {
  const parsed = RefreshTokenSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  try {
    const decoded = jwt.verify(parsed.data.refreshToken, JWT_REFRESH_SECRET) as any;
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid refresh token' });
    const { rows } = await querySupabase(supabaseClient, 'SELECT user_id, username, email, roles, is_active FROM users WHERE user_id = $1', [decoded.sub]);
    if (rows.length === 0 || !rows[0].is_active) return res.status(401).json({ error: 'User not found or inactive' });
    const user = rows[0];
    const accessToken = jwt.sign({ sub: user.user_id, username: user.username, email: user.email, roles: user.roles || [] }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.status(200).json({ accessToken, tokenType: 'Bearer', expiresIn: 900 });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ============================================
// APPLICANT/KYC ENDPOINTS (Consolidated)
// ============================================

app.get('/api/applicants/:id', async (req, res) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) return res.status(400).json({ error: 'Invalid UUID format' });
    const { rows } = await querySupabase(
      supabaseClient,
      `SELECT applicant_id, first_name, middle_name, last_name, date_of_birth, date_of_birth as dob, gender, 
       marital_status, mobile, email, pan, address_line1, address_line2, city, state, pincode, country,
       employment_type, monthly_income, employer_name, other_income_sources, years_in_job,
       bank_account_number, bank_ifsc, bank_verified, created_at, updated_at
       FROM applicants WHERE applicant_id = $1`,
      [req.params.id]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Applicant not found' });
    const applicant = rows[0];
    const transformed: any = { ...applicant };
    if (!transformed.date_of_birth && transformed.dob) transformed.date_of_birth = transformed.dob;
    return res.status(200).json(transformed);
  } catch (err: any) {
    logger.error('GetApplicantError', { error: err?.message });
    return res.status(500).json({ error: 'Failed to fetch applicant' });
  }
});

const ApplicantSchema = z.object({
  firstName: z.string().min(2).max(200).optional(),
  lastName: z.string().min(2).max(200).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Male', 'Female', 'Other', 'PreferNotToSay']).optional(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  addressLine1: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  employmentType: z.enum(['Salaried', 'Self-employed', 'SelfEmployed', 'Business', 'Retired', 'Student', 'Unemployed']).optional(),
  monthlyIncome: z.number().min(0).optional(),
  employerName: z.string().max(200).optional(),
  yearsInJob: z.number().min(0).max(50).optional(),
});

app.put('/api/applicants/:id', async (req, res) => {
  const parsed = ApplicantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const client = await connectSupabase(supabaseClient);
  try {
    await client.query(
      `INSERT INTO applicants (applicant_id, first_name, last_name, date_of_birth, gender, marital_status, 
       mobile, email, pan, address_line1, city, state, pincode, country, employment_type, monthly_income, 
       employer_name, years_in_job)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (applicant_id) DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, applicants.first_name),
         last_name = COALESCE(EXCLUDED.last_name, applicants.last_name),
         date_of_birth = COALESCE(EXCLUDED.date_of_birth, applicants.date_of_birth),
         gender = COALESCE(EXCLUDED.gender, applicants.gender),
         marital_status = COALESCE(EXCLUDED.marital_status, applicants.marital_status),
         mobile = COALESCE(EXCLUDED.mobile, applicants.mobile),
         email = COALESCE(EXCLUDED.email, applicants.email),
         pan = COALESCE(EXCLUDED.pan, applicants.pan),
         address_line1 = COALESCE(EXCLUDED.address_line1, applicants.address_line1),
         city = COALESCE(EXCLUDED.city, applicants.city),
         state = COALESCE(EXCLUDED.state, applicants.state),
         pincode = COALESCE(EXCLUDED.pincode, applicants.pincode),
         employment_type = COALESCE(EXCLUDED.employment_type, applicants.employment_type),
         monthly_income = COALESCE(EXCLUDED.monthly_income, applicants.monthly_income),
         employer_name = COALESCE(EXCLUDED.employer_name, applicants.employer_name),
         years_in_job = COALESCE(EXCLUDED.years_in_job, applicants.years_in_job),
         updated_at = now()`,
      [req.params.id, parsed.data.firstName, parsed.data.lastName, parsed.data.dateOfBirth, parsed.data.gender,
       parsed.data.maritalStatus, parsed.data.mobile, parsed.data.email, parsed.data.pan, parsed.data.addressLine1,
       parsed.data.city, parsed.data.state, parsed.data.pincode, 'India', parsed.data.employmentType,
       parsed.data.monthlyIncome, parsed.data.employerName, parsed.data.yearsInJob]
    );
    await client.commit();
    return res.status(200).json({ applicantId: req.params.id, updated: true });
  } catch (err) {
    await client.rollback();
    logger.error('UpsertApplicantError', { error: (err as Error).message });
    return res.status(500).json({ error: 'Failed to upsert applicant' });
  } finally {
    // Transaction handles cleanup automatically
  }
});

// ============================================
// END CONSOLIDATED ENDPOINTS
// ============================================

const CreateApplicationSchema = z.object({
  applicantId: z.string(),
  channel: z.enum(['Branch', 'DSA', 'Online', 'Mobile']),
  productCode: z.string().min(1),
  requestedAmount: z.number().positive(),
  requestedTenureMonths: z.number().int().positive()
});

const UpdateApplicationSchema = z.object({
  channel: z.enum(['Branch', 'DSA', 'Online', 'Mobile']).optional(),
  productCode: z.string().min(1).optional(),
  requestedAmount: z.number().positive().optional(),
  requestedTenureMonths: z.number().int().positive().optional()
});

// Helper function to fetch and validate product limits (direct database query in monolith)
async function validateProductLimits(productCode: string, requestedAmount: number, requestedTenureMonths: number): Promise<{ valid: boolean; error?: string }> {
  try {
    // Query product directly from database (monolith - no external service call needed)
    const { rows } = await querySupabase(supabaseClient, 
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months FROM products WHERE product_code = $1',
      [productCode]
    );
    
    if (rows.length === 0) {
      return { valid: false, error: `Product ${productCode} not found` };
    }
    
    const product = rows[0];
    
    // Validate amount limits
    if (requestedAmount < Number(product.min_amount)) {
      return { valid: false, error: `Requested amount ${requestedAmount} is below minimum ${product.min_amount} for product ${productCode}` };
    }
    if (requestedAmount > Number(product.max_amount)) {
      return { valid: false, error: `Requested amount ${requestedAmount} exceeds maximum ${product.max_amount} for product ${productCode}` };
    }
    
    // Validate tenure limits
    if (requestedTenureMonths < product.min_tenure_months) {
      return { valid: false, error: `Requested tenure ${requestedTenureMonths} months is below minimum ${product.min_tenure_months} months for product ${productCode}` };
    }
    if (requestedTenureMonths > product.max_tenure_months) {
      return { valid: false, error: `Requested tenure ${requestedTenureMonths} months exceeds maximum ${product.max_tenure_months} months for product ${productCode}` };
    }
    
    return { valid: true };
  } catch (err) {
    logger.warn('ProductValidationError', { error: (err as Error).message, productCode });
    // Fail-open for resilience (skip validation on error)
    // In production, you might want to fail-closed instead
    return { valid: true };
  }
}

// POST /api/applications - create
app.post('/api/applications', async (req, res) => {
  const parsed = CreateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  // Validate product limits
  const validation = await validateProductLimits(parsed.data.productCode, parsed.data.requestedAmount, parsed.data.requestedTenureMonths);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Generate application ID - try RPC first, fallback to querySupabase, then UUID
    let id: string;
    try {
      const { data: idData, error: idError } = await supabaseClient.rpc('generate_application_id', {
        product_code: parsed.data.productCode
      });
      
      if (idError || !idData) {
        throw idError || new Error('RPC returned no data');
      }
      
      id = idData;
    } catch (rpcError) {
      // Fallback: Use querySupabase to call the function
      try {
        const idResult = await querySupabase(supabaseClient,
          'SELECT generate_application_id($1) as application_id',
          [parsed.data.productCode]
        );
        id = idResult.rows[0]?.application_id;
      } catch (queryError) {
        // Final fallback: Generate UUID-based ID
        id = `${parsed.data.productCode}_${uuidv4().substring(0, 8).toUpperCase()}`;
        logger.warn('Using fallback application ID', { id, correlationId: (req as any).correlationId });
      }
    }
    
    // Check if applicant exists using Supabase SDK
    const { data: applicantData, error: applicantError } = await supabaseClient
      .from('applicants')
      .select('applicant_id')
      .eq('applicant_id', parsed.data.applicantId)
      .maybeSingle();
    
    if (applicantError && applicantError.code !== 'PGRST116') { // PGRST116 = not found, which is OK
      logger.error('CheckApplicantError', { error: applicantError.message, correlationId: (req as any).correlationId });
    }
    
    // Create minimal applicant if it doesn't exist
    if (!applicantData) {
      const { error: insertError } = await supabaseClient
        .from('applicants')
        .insert({
          applicant_id: parsed.data.applicantId,
          first_name: 'New',
          last_name: 'Applicant',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError && insertError.code !== '23505') { // 23505 = duplicate key, ignore
        logger.warn('CreateApplicantError', { error: insertError.message, correlationId: (req as any).correlationId });
      } else {
        logger.info('Created minimal applicant', { applicantId: parsed.data.applicantId, correlationId: (req as any).correlationId });
      }
    }
    
    // Create application using Supabase SDK
    const { error: appError } = await supabaseClient
      .from('applications')
      .insert({
        application_id: id,
        applicant_id: parsed.data.applicantId,
        channel: parsed.data.channel,
        product_code: parsed.data.productCode,
        requested_amount: parsed.data.requestedAmount,
        requested_tenure_months: parsed.data.requestedTenureMonths,
        status: 'Draft'
      });
    
    if (appError) {
      logger.error('CreateApplicationInsertError', { error: appError.message, correlationId: (req as any).correlationId });
      return res.status(500).json({ error: 'Failed to create application', details: appError.message });
    }
    
    // Write outbox event (non-blocking)
    const eventId = uuidv4();
    try {
      await querySupabase(supabaseClient,
        'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
        [eventId, id, 'los.application.ApplicationCreated.v1', 'los.application.ApplicationCreated.v1', JSON.stringify({ applicationId: id, ...parsed.data }), JSON.stringify({ correlationId: (req as any).correlationId })]
      );
    } catch (outboxError) {
      // Log but don't fail if outbox write fails
      logger.warn('CreateApplicationOutboxError', { error: (outboxError as Error).message, correlationId: (req as any).correlationId });
    }
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    try {
      await recordHistory(id, 'ApplicationCreated', 'application', { ...parsed.data, status: 'Draft' }, actorId);
    } catch (historyError) {
      logger.warn('CreateApplicationHistoryError', { error: (historyError as Error).message, correlationId: (req as any).correlationId });
    }
    
    logger.info('CreateApplication', { correlationId: (req as any).correlationId, applicationId: id });
    return res.status(201).json({ applicationId: id, status: 'Draft' });
  } catch (err) {
    const error = err as Error;
    // Log full error details including stack trace
    logger.error('CreateApplicationError', { 
      error: error.message, 
      stack: error.stack,
      name: error.name,
      correlationId: (req as any).correlationId,
      payload: parsed.success ? parsed.data : req.body
    });
    // Return detailed error in development, generic in production
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({ 
      error: 'Failed to create application',
      ...(isDev && { details: error.message, stack: error.stack })
    });
  }
});

// GET /api/applications - list with filters and pagination
app.get('/api/applications', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.query.status) {
      // Handle both string and array formats (Express can send arrays for multiple query params)
      let statuses: string[];
      if (Array.isArray(req.query.status)) {
        // If it's already an array, use it directly
        statuses = (req.query.status as string[]).map(s => String(s).trim());
      } else {
        // If it's a string, split by comma
        statuses = String(req.query.status).split(',').map(s => s.trim());
      }
      
      if (statuses.length === 1) {
        conditions.push(`status = $${paramCount++}`);
        values.push(statuses[0]);
      } else {
        conditions.push(`status = ANY($${paramCount++})`);
        values.push(statuses);
      }
    }
    if (req.query.channel) {
      conditions.push(`channel = $${paramCount++}`);
      values.push(req.query.channel);
    }
    if (req.query.productCode) {
      conditions.push(`product_code = $${paramCount++}`);
      values.push(req.query.productCode);
    }
    if (req.query.applicantId) {
      conditions.push(`applicant_id = $${paramCount++}`);
      values.push(req.query.applicantId);
    }
    if (req.query.minAmount) {
      conditions.push(`requested_amount >= $${paramCount++}`);
      values.push(parseFloat(req.query.minAmount as string));
    }
    if (req.query.maxAmount) {
      conditions.push(`requested_amount <= $${paramCount++}`);
      values.push(parseFloat(req.query.maxAmount as string));
    }
    // Date range filters
    if (req.query.startDate) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(req.query.startDate);
    }
    if (req.query.endDate) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(req.query.endDate);
    }
    // Search by assigned user
    if (req.query.assignedTo) {
      conditions.push(`assigned_to = $${paramCount++}`);
      values.push(req.query.assignedTo);
    }

    // Automatic RM filtering: If user is an RM, filter by assigned_to
    const userId = (req as any).user?.id || (req as any).user?.sub || req.headers['x-user-id'];
    const userRoles = (req as any).user?.roles || JSON.parse(req.headers['x-user-roles'] || '[]');
    const isRM = userRoles.some((role: string) => 
      role.toLowerCase() === 'rm' || role.toLowerCase() === 'relationship_manager'
    );
    
    // If user is RM and no explicit assignedTo filter, automatically filter by their user ID
    if (isRM && userId && !req.query.assignedTo) {
      conditions.push(`assigned_to = $${paramCount++}`);
      values.push(userId);
      logger.debug('RMAutoFilter', { userId, correlationId: (req as any).correlationId });
    }
    // Search by partial application ID
    if (req.query.applicationIdPattern) {
      conditions.push(`application_id::text LIKE $${paramCount++}`);
      values.push(`%${req.query.applicationIdPattern}%`);
    }

    // Use Supabase SDK or pool
    let rows: any[] = [];
    let total = 0;
    
    if (supabaseClient) {
      // Build Supabase query
      let query = supabaseClient
        .from('applications')
        .select('application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status, created_at, updated_at', { count: 'exact' });
      
      // Apply filters
      if (req.query.status) {
        const statuses = Array.isArray(req.query.status) 
          ? (req.query.status as string[]).map(s => String(s).trim())
          : String(req.query.status).split(',').map(s => s.trim());
        if (statuses.length === 1) {
          query = query.eq('status', statuses[0]);
        } else {
          query = query.in('status', statuses);
        }
      }
      if (req.query.channel) {
        query = query.eq('channel', req.query.channel as string);
      }
      if (req.query.productCode) {
        query = query.eq('product_code', req.query.productCode as string);
      }
      if (req.query.applicantId) {
        query = query.eq('applicant_id', req.query.applicantId as string);
      }
      if (req.query.minAmount) {
        query = query.gte('requested_amount', parseFloat(req.query.minAmount as string));
      }
      if (req.query.maxAmount) {
        query = query.lte('requested_amount', parseFloat(req.query.maxAmount as string));
      }
      if (req.query.startDate) {
        query = query.gte('created_at', req.query.startDate as string);
      }
      if (req.query.endDate) {
        query = query.lte('created_at', req.query.endDate as string);
      }
      if (req.query.assignedTo) {
        query = query.eq('assigned_to', req.query.assignedTo as string);
      }
      
      // Auto-filter by RM user if applicable
      const userId = (req as any).user?.id || (req as any).user?.sub || req.headers['x-user-id'];
      const userRoles = (req as any).user?.roles || JSON.parse(req.headers['x-user-roles'] || '[]');
      const isRM = userRoles.some((role: string) => 
        role.toLowerCase() === 'rm' || role.toLowerCase() === 'relationship_manager'
      );
      
      if (isRM && userId && !req.query.assignedTo) {
        query = query.eq('assigned_to', userId);
        logger.debug('RMAutoFilter', { userId, correlationId: (req as any).correlationId });
      }
      
      if (req.query.applicationIdPattern) {
        query = query.like('application_id', `%${req.query.applicationIdPattern}%`);
      }
      
      // Apply pagination and ordering
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      rows = data || [];
      total = count || 0;
    } else {
      // Use pool for local PostgreSQL
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM applications ${whereClause}`;
      const countResult = await pool!.query(countQuery, values);
      total = parseInt(countResult.rows[0].total, 10);

      // Get paginated results
      values.push(limit, offset);
      const dataQuery = `
        SELECT 
          application_id, applicant_id, channel, product_code, 
          requested_amount, requested_tenure_months, status, 
          created_at, updated_at 
        FROM applications 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount++} OFFSET $${paramCount++}
      `;
      const result = await pool!.query(dataQuery, values);
      rows = result.rows;
    }

    logger.debug('ListApplications', { 
      correlationId: (req as any).correlationId, 
      page, 
      limit, 
      total,
      filters: req.query 
    });

    return res.status(200).json({
      applications: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    logger.error('ListApplicationsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list applications' });
  }
});

// GET /api/applications/:id - get single application by ID
app.get('/api/applications/:id', async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;

    let application: any;

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('applications')
        .select('application_id, applicant_id, status, channel, product_code, requested_amount, requested_tenure_months, assigned_to, assigned_at, created_at, updated_at')
        .eq('application_id', applicationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Application not found' });
      }
      application = data;
    } else {
      const { rows } = await querySupabase(supabaseClient, 
        `SELECT 
          application_id,
          applicant_id,
          status,
          channel,
          product_code,
          requested_amount,
          requested_tenure_months,
          assigned_to,
          assigned_at,
          created_at,
          updated_at
        FROM applications
        WHERE application_id = $1`,
        [applicationId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }
      application = rows[0];
    }

    logger.debug('GetApplication', {
      applicationId,
      correlationId: (req as any).correlationId
    });

    return res.status(200).json(application);
  } catch (err) {
    logger.error('GetApplicationError', {
      error: (err as Error).message,
      applicationId: req.params.id,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// PUT /api/applications/:id - update application
app.put('/api/applications/:id', async (req: any, res: any) => {
  const parsed = UpdateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await connectSupabase(supabaseClient);
  
  try {
    await client.query('BEGIN');
    
    // Check application exists
    const { rows: appRows } = await client.query(
      'SELECT application_id, status FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (appRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (parsed.data.channel) {
      updates.push(`channel = $${paramCount++}`);
      values.push(parsed.data.channel);
    }
    if (parsed.data.productCode) {
      updates.push(`product_code = $${paramCount++}`);
      values.push(parsed.data.productCode);
    }
    if (parsed.data.requestedAmount) {
      updates.push(`requested_amount = $${paramCount++}`);
      values.push(parsed.data.requestedAmount);
    }
    if (parsed.data.requestedTenureMonths) {
      updates.push(`requested_tenure_months = $${paramCount++}`);
      values.push(parsed.data.requestedTenureMonths);
    }
    
    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`updated_at = now()`);
    values.push(req.params.id);
    
    await client.query(
      `UPDATE applications SET ${updates.join(', ')} WHERE application_id = $${paramCount++}`,
      values
    );

    await client.query('COMMIT');
    
    logger.info('UpdateApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id });
    return res.status(200).json({ applicationId: req.params.id, updated: true });
  } catch (err) {
    await client.rollback();
    logger.error('UpdateApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to update application' });
  } finally {
    // Transaction handles cleanup automatically
  }
});

// POST /api/applications/:id/submit - submit application for verification
app.post('/api/applications/:id/submit', async (req: any, res: any) => {
  try {
    // Check application exists and is in Draft status using Supabase SDK
    const { data: appData, error: appError } = await supabaseClient
      .from('applications')
      .select('application_id, status')
      .eq('application_id', req.params.id)
      .single();
    
    if (appError || !appData) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Development mode: Allow re-submission from Submitted status
    // In production, only allow submission from Draft status
    if (appData.status !== 'Draft' && appData.status !== 'Submitted') {
      return res.status(400).json({ error: `Cannot submit application in ${appData.status} status` });
    }
    
    // If already submitted, just return success (idempotent)
    if (appData.status === 'Submitted') {
      logger.info('SubmitApplicationAlreadySubmitted', { correlationId: (req as any).correlationId, applicationId: req.params.id });
      return res.status(200).json({ applicationId: req.params.id, status: 'Submitted', message: 'Application already submitted' });
    }
    
    // Update status to Submitted using Supabase SDK
    const { error: updateError } = await supabaseClient
      .from('applications')
      .update({ 
        status: 'Submitted',
        updated_at: new Date().toISOString()
      })
      .eq('application_id', req.params.id);
    
    if (updateError) {
      logger.error('SubmitApplicationUpdateError', { error: updateError.message, correlationId: (req as any).correlationId });
      return res.status(500).json({ error: 'Failed to update application status' });
    }
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    try {
      await recordHistory(req.params.id, 'ApplicationSubmitted', 'application', { status: 'Submitted' }, actorId);
    } catch (historyError) {
      // Log but don't fail the submission if history recording fails
      logger.warn('SubmitApplicationHistoryError', { error: (historyError as Error).message, correlationId: (req as any).correlationId });
    }
    
    logger.info('SubmitApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id });
    return res.status(200).json({ applicationId: req.params.id, status: 'Submitted' });
  } catch (err) {
    logger.error('SubmitApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to submit application' });
  }
});

// GET /api/applications/:id/applicant - get applicant data for an application
app.get('/api/applications/:id/applicant', async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;
    
    let applicantId: string;
    let applicant: any;
    
    if (supabaseClient) {
      // Get applicant_id from application
      const { data: app, error: appError } = await supabaseClient
        .from('applications')
        .select('applicant_id')
        .eq('application_id', applicationId)
        .single();
      
      if (appError || !app) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      applicantId = app.applicant_id;
      
      // Get applicant data from applicants table
      const { data: applicantData, error: applicantError } = await supabaseClient
        .from('applicants')
        .select('applicant_id, first_name, last_name, date_of_birth, gender, marital_status, mobile, email, pan, address_line1, address_line2, city, state, pincode, country, employment_type, monthly_income, employer_name, other_income_sources, years_in_job, bank_account_number, bank_ifsc, bank_verified, bank_verified_at, bank_verification_method, created_at, updated_at')
        .eq('applicant_id', applicantId)
        .maybeSingle(); // Use maybeSingle() to handle not found gracefully
      
      if (applicantError) {
        logger.error('GetApplicantByApplicationSDKError', { error: applicantError.message, applicantId, applicationId, correlationId: (req as any).correlationId });
        // Fallback to pool
        const { rows: applicantRows } = await querySupabase(supabaseClient, 
          `SELECT 
            applicant_id, first_name, last_name, date_of_birth, gender, marital_status,
            mobile, email, pan, address_line1, address_line2, city, state, pincode, country,
            employment_type, monthly_income, employer_name, other_income_sources,
            years_in_job, bank_account_number, bank_ifsc,
            bank_verified, bank_verified_at, bank_verification_method,
            created_at, updated_at
          FROM applicants 
          WHERE applicant_id = $1`,
          [applicantId]
        );
        if (applicantRows.length === 0) {
          logger.warn('ApplicantNotFoundInLocalDB', { applicantId, applicationId, correlationId: (req as any).correlationId });
          return res.status(200).json({ data: null });
        }
        applicant = applicantRows[0];
      } else if (!applicantData) {
        logger.warn('ApplicantNotFoundInLocalDB', { applicantId, applicationId, correlationId: (req as any).correlationId });
        return res.status(200).json({ data: null }); // Return null instead of 404
      } else {
        applicant = applicantData;
      }
    } else {
      // Get applicant_id from application
      const { rows: appRows } = await querySupabase(supabaseClient, 
        'SELECT applicant_id FROM applications WHERE application_id = $1',
        [applicationId]
      );
      
      if (appRows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      applicantId = appRows[0].applicant_id;
      
      // Get applicant data from applicants table (may not exist if only in KYC service)
      const { rows: applicantRows } = await querySupabase(supabaseClient, 
        `SELECT 
          applicant_id, first_name, last_name, date_of_birth, gender, marital_status,
          mobile, email, pan, address_line1, address_line2, city, state, pincode, country,
          employment_type, monthly_income, employer_name, other_income_sources,
          years_in_job, bank_account_number, bank_ifsc,
          bank_verified, bank_verified_at, bank_verification_method,
          created_at, updated_at
        FROM applicants 
        WHERE applicant_id = $1`,
        [applicantId]
      );
      
      // If applicant not found in local DB, return empty object (data might be in KYC service)
      if (applicantRows.length === 0) {
        logger.warn('ApplicantNotFoundInLocalDB', { applicantId, applicationId, correlationId: (req as any).correlationId });
        return res.status(200).json({ data: null }); // Return null instead of 404
      }
      
      applicant = applicantRows[0];
    }
    
    logger.debug('GetApplicantByApplication', {
      applicationId,
      applicantId,
      correlationId: (req as any).correlationId
    });
    
    return res.status(200).json({ data: applicant });
  } catch (err) {
    logger.error('GetApplicantByApplicationError', {
      error: (err as Error).message,
      applicationId: req.params.id,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to fetch applicant data' });
  }
});

// PUT /api/applications/:id/applicant - update applicant data via application ID
app.put('/api/applications/:id/applicant', async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;
    
    // Get applicant_id from application
    const { rows: appRows } = await querySupabase(supabaseClient, 
      'SELECT applicant_id FROM applications WHERE application_id = $1',
      [applicationId]
    );
    
    if (appRows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const applicantId = appRows[0].applicant_id;
    
    // Parse request body - support partial updates
    const updateData: any = {};
    
    if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
    if (req.body.dateOfBirth !== undefined) updateData.dateOfBirth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) updateData.gender = req.body.gender;
    if (req.body.maritalStatus !== undefined) updateData.maritalStatus = req.body.maritalStatus;
    if (req.body.mobile !== undefined) updateData.mobile = req.body.mobile;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.pan !== undefined) updateData.pan = req.body.pan;
    if (req.body.addressLine1 !== undefined) updateData.addressLine1 = req.body.addressLine1;
    if (req.body.addressLine2 !== undefined) updateData.addressLine2 = req.body.addressLine2;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.pincode !== undefined) updateData.pincode = req.body.pincode;
    if (req.body.employmentType !== undefined) updateData.employmentType = req.body.employmentType;
    if (req.body.monthlyIncome !== undefined) updateData.monthlyIncome = req.body.monthlyIncome;
    if (req.body.employerName !== undefined) updateData.employerName = req.body.employerName;
    if (req.body.businessName !== undefined) updateData.businessName = req.body.businessName;
    if (req.body.yearsInJob !== undefined) updateData.yearsInJob = req.body.yearsInJob;
    if (req.body.otherIncomeSources !== undefined) updateData.otherIncomeSources = req.body.otherIncomeSources;
    if (req.body.bankAccountNumber !== undefined) updateData.bankAccountNumber = req.body.bankAccountNumber;
    if (req.body.bankIfsc !== undefined) updateData.bankIfsc = req.body.bankIfsc;
    if (req.body.accountHolderName !== undefined) updateData.accountHolderName = req.body.accountHolderName;
    if (req.body.bankName !== undefined) updateData.bankName = req.body.bankName;
    if (req.body.bankVerified !== undefined) updateData.bankVerified = req.body.bankVerified;
    if (req.body.bankVerificationMethod !== undefined) updateData.bankVerificationMethod = req.body.bankVerificationMethod;
    
    // Validate using ApplicantSchema (allows partial updates)
    const parsed = ApplicantSchema.partial().safeParse(updateData);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }
    
    const client = await connectSupabase(supabaseClient);
    try {
      await client.query('BEGIN');
      
      // Build dynamic UPDATE query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (parsed.data.firstName !== undefined) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(parsed.data.firstName);
      }
      if (parsed.data.lastName !== undefined) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(parsed.data.lastName);
      }
      if (parsed.data.dateOfBirth !== undefined) {
        updates.push(`date_of_birth = $${paramCount++}`);
        values.push(parsed.data.dateOfBirth);
      }
      if (parsed.data.gender !== undefined) {
        updates.push(`gender = $${paramCount++}`);
        values.push(parsed.data.gender);
      }
      if (parsed.data.maritalStatus !== undefined) {
        updates.push(`marital_status = $${paramCount++}`);
        values.push(parsed.data.maritalStatus);
      }
      if (parsed.data.mobile !== undefined) {
        updates.push(`mobile = $${paramCount++}`);
        values.push(parsed.data.mobile);
      }
      if (parsed.data.email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(parsed.data.email);
      }
      if (parsed.data.pan !== undefined) {
        updates.push(`pan = $${paramCount++}`);
        values.push(parsed.data.pan);
      }
      if (parsed.data.addressLine1 !== undefined) {
        updates.push(`address_line1 = $${paramCount++}`);
        values.push(parsed.data.addressLine1);
      }
      if (parsed.data.addressLine2 !== undefined) {
        updates.push(`address_line2 = $${paramCount++}`);
        values.push(parsed.data.addressLine2);
      }
      if (parsed.data.city !== undefined) {
        updates.push(`city = $${paramCount++}`);
        values.push(parsed.data.city);
      }
      if (parsed.data.state !== undefined) {
        updates.push(`state = $${paramCount++}`);
        values.push(parsed.data.state);
      }
      if (parsed.data.pincode !== undefined) {
        updates.push(`pincode = $${paramCount++}`);
        values.push(parsed.data.pincode);
      }
      if (parsed.data.employmentType !== undefined) {
        updates.push(`employment_type = $${paramCount++}`);
        values.push(parsed.data.employmentType);
      }
      if (parsed.data.monthlyIncome !== undefined) {
        updates.push(`monthly_income = $${paramCount++}`);
        values.push(parsed.data.monthlyIncome);
      }
      if (parsed.data.employerName !== undefined) {
        updates.push(`employer_name = $${paramCount++}`);
        values.push(parsed.data.employerName);
      }
      if (parsed.data.businessName !== undefined) {
        updates.push(`business_name = $${paramCount++}`);
        values.push(parsed.data.businessName);
      }
      if (parsed.data.yearsInJob !== undefined) {
        updates.push(`years_in_job = $${paramCount++}`);
        values.push(parsed.data.yearsInJob);
      }
      if (parsed.data.otherIncomeSources !== undefined) {
        updates.push(`other_income_sources = $${paramCount++}`);
        values.push(parsed.data.otherIncomeSources);
      }
      if (req.body.bankAccountNumber !== undefined) {
        updates.push(`bank_account_number = $${paramCount++}`);
        values.push(req.body.bankAccountNumber);
      }
      if (req.body.bankIfsc !== undefined) {
        updates.push(`bank_ifsc = $${paramCount++}`);
        values.push(req.body.bankIfsc);
      }
      if (req.body.accountHolderName !== undefined) {
        updates.push(`bank_account_holder_name = $${paramCount++}`);
        values.push(req.body.accountHolderName);
      }
      if (req.body.bankName !== undefined) {
        updates.push(`bank_name = $${paramCount++}`);
        values.push(req.body.bankName);
      }
      if (req.body.bankVerified !== undefined) {
        updates.push(`bank_verified = $${paramCount++}`);
        values.push(req.body.bankVerified);
      }
      if (req.body.bankVerificationMethod !== undefined) {
        updates.push(`bank_verification_method = $${paramCount++}`);
        values.push(req.body.bankVerificationMethod);
      }
      
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updates.push(`updated_at = now()`);
      values.push(applicantId);
      
      await client.query(
        `UPDATE applicants SET ${updates.join(', ')} WHERE applicant_id = $${paramCount++}`,
        values
      );
      
      await client.query('COMMIT');
      
      logger.debug('UpdateApplicantByApplication', {
        applicationId,
        applicantId,
        updatedFields: updates.length - 1,
        correlationId: (req as any).correlationId
      });
      
      return res.status(200).json({ applicationId, applicantId, updated: true });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('UpdateApplicantByApplicationError', {
        error: (err as Error).message,
        applicationId,
        correlationId: (req as any).correlationId
      });
      return res.status(500).json({ error: 'Failed to update applicant' });
    } finally {
      // Transaction handles cleanup automatically
    }
  } catch (err) {
    logger.error('UpdateApplicantByApplicationError', {
      error: (err as Error).message,
      applicationId: req.params.id,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to update applicant' });
  }
});

// GET /api/applications/:id/completeness - get application completeness percentage
app.get('/api/applications/:id/completeness', async (req: any, res: any) => {
  try {
    const applicationId = req.params.id;
    
    let application: any;
    let applicant: any = {};
    let hasProperty = false;
    let docCount = 0;
    
    if (supabaseClient) {
      // Get application data
      const { data: app, error: appError } = await supabaseClient
        .from('applications')
        .select('application_id, product_code, requested_amount, requested_tenure_months, applicant_id')
        .eq('application_id', applicationId)
        .single();
      
      if (appError || !app) {
        return res.status(404).json({ error: 'Application not found' });
      }
      application = app;
      
      // Get applicant data
      if (app.applicant_id) {
        const { data: applicantData } = await supabaseClient
          .from('applicants')
          .select('applicant_id, first_name, last_name, mobile, address_line1, employment_type, monthly_income, bank_verified')
          .eq('applicant_id', app.applicant_id)
          .single();
        applicant = applicantData || {};
      }
      
      // Get property data
      const { count: propertyCount } = await supabaseClient
        .from('property_details')
        .select('*', { count: 'exact', head: true })
        .eq('application_id', applicationId);
      hasProperty = (propertyCount || 0) > 0;
      
      // Get documents count
      const { count: docCountResult } = await supabaseClient
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('application_id', applicationId);
      docCount = docCountResult || 0;
    } else {
      // Get application data
      const { rows: appRows } = await querySupabase(supabaseClient, 
        'SELECT application_id, product_code, requested_amount, requested_tenure_months FROM applications WHERE application_id = $1',
        [applicationId]
      );
      
      if (appRows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }
      
      application = appRows[0];
      
      // Get applicant data
      const { rows: applicantRows } = await querySupabase(supabaseClient, 
        `SELECT applicant_id, first_name, last_name, mobile, address_line1, employment_type, monthly_income, bank_verified
         FROM applicants 
         WHERE applicant_id = (SELECT applicant_id FROM applications WHERE application_id = $1)`,
        [applicationId]
      );
      
      applicant = applicantRows[0] || {};
      
      // Get property data
      const { rows: propertyRows } = await querySupabase(supabaseClient, 
        'SELECT property_type FROM property_details WHERE application_id = $1',
        [applicationId]
      );
      hasProperty = propertyRows.length > 0;
      
      // Get documents count
      const { rows: docRows } = await querySupabase(supabaseClient, 
        'SELECT COUNT(*) as count FROM documents WHERE application_id = $1',
        [applicationId]
      );
      docCount = parseInt(docRows[0]?.count || '0', 10);
    }
    
    // Calculate completeness
    let completed = 0;
    let total = 0;
    
    // Personal info (3 fields)
    total += 3;
    if (applicant.first_name) completed++;
    if (applicant.mobile) completed++;
    if (applicant.address_line1) completed++;
    
    // Employment info (2 fields)
    total += 2;
    if (applicant.employment_type) completed++;
    if (applicant.monthly_income) completed++;
    
    // Loan info (2 fields)
    total += 2;
    if (application.requested_amount) completed++;
    if (application.product_code) completed++;
    
    // Property info (1 field - only if home loan)
    if (application.product_code === 'HOME_LOAN_V1') {
      total += 1;
      if (hasProperty) completed++;
    }
    
    // Documents (at least 3 required)
    total += 1;
    if (docCount >= 3) completed++;
    
    const completeness = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    logger.debug('GetCompleteness', {
      applicationId,
      completeness,
      correlationId: (req as any).correlationId
    });
    
    return res.status(200).json({ 
      applicationId,
      completeness,
      completed,
      total
    });
  } catch (err) {
    logger.error('GetCompletenessError', {
      error: (err as Error).message,
      applicationId: req.params.id,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to calculate completeness' });
  }
});

// GET /api/applications/:id/events - SSE stream for real-time updates
app.get('/api/applications/:id/events', (req, res) => {
  setupApplicationSSE(req, res, supabaseClient);
});

// Setup RM Dashboard endpoint
setupRMDashboardEndpoint(app, null, supabaseClient);

// Setup Hierarchical Dashboards (SRM and Regional Head)
setupHierarchicalDashboards(app, supabaseClient);

// Setup Property endpoints
setupPropertyEndpoints(app, supabaseClient);

// ============================================
// Document Upload & Management Endpoints
// Consolidated from document service for easier integration
// ============================================

// POST /api/applications/:id/documents - upload document
app.post('/api/applications/:id/documents', upload.single('file'), async (req: any, res: any) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Allowed: PDF, JPG, PNG' });
  }

  // Support both 'documentCode' (from frontend) and 'docType' (legacy)
  const docType = req.body.documentCode || req.body.docType;
  if (!docType) {
    return res.status(400).json({ error: 'documentCode or docType is required' });
  }

  const docId = uuidv4();
  const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const client = await connectSupabase(supabaseClient);
  
  try {
    await client.query('BEGIN');
    
    // Extract OCR metadata (non-blocking, but await for transaction)
    let extractedData = null;
    let ocrProvider = null;
    let ocrConfidence = null;
    try {
      const metadata = await extractDocumentMetadata(req.file.buffer, req.file.mimetype, docType);
      extractedData = metadata;
      ocrProvider = process.env.OCR_PROVIDER || 'mock';
      ocrConfidence = metadata.confidence || null;
    } catch (ocrErr) {
      logger.warn('OCRFailed', { error: (ocrErr as Error).message, docId, docType });
      // Continue without OCR data
    }
    
    // Check if this is a re-upload (delete existing if same type)
    const existingDoc = await client.query(
      'SELECT doc_id FROM documents WHERE application_id = $1 AND doc_type = $2 LIMIT 1',
      [req.params.id, docType]
    );
    
    // If document of same type exists, delete it (simple versioning - keep only latest)
    if (existingDoc.rows.length > 0) {
      await client.query(
        'DELETE FROM documents WHERE application_id = $1 AND doc_type = $2',
        [req.params.id, docType]
      );
    }
    
    // Persist document metadata (only columns that exist in schema)
    await client.query(
      'INSERT INTO documents (doc_id, application_id, doc_type, file_name, file_type, size_bytes, hash, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [docId, req.params.id, docType, req.file.originalname, req.file.mimetype, req.file.size, fileHash, 'Uploaded']
    );

    // Upload to MinIO (outside transaction but awaited before event)
    // If MinIO/S3 is not available, continue without object storage (for development)
    const objectKey = `${req.params.id}/${docId}/${req.file.originalname}`;
    try {
      await putObjectBuffer(s3, { bucket, key: objectKey, body: req.file.buffer, contentType: req.file.mimetype });
      // Store object key only if upload succeeded
      await client.query('UPDATE documents SET object_key = $1 WHERE doc_id = $2', [objectKey, docId]);
    } catch (s3Err: any) {
      logger.warn('MinIOUploadFailed', { 
        error: (s3Err as Error).message, 
        docId, 
        applicationId: req.params.id,
        correlationId: (req as any).correlationId 
      });
      // Continue without object storage - metadata is still in database
      // In production, this should fail or retry, but for development we continue
    }

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.document.DocumentUploaded.v1', 'los.document.DocumentUploaded.v1', JSON.stringify({ applicationId: req.params.id, docId, docType, fileName: req.file.originalname, sizeBytes: req.file.size, objectKey }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('DocumentUploaded', { correlationId: (req as any).correlationId, applicationId: req.params.id, docId, docType });
    return res.status(201).json({ applicationId: req.params.id, docId, docType, fileName: req.file.originalname });
  } catch (err) {
    await client.rollback();
    logger.error('DocumentUploadError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    // Transaction handles cleanup automatically
  }
});

// GET /api/applications/:id/documents - list documents
app.get('/api/applications/:id/documents', async (req: any, res: any) => {
  try {
    const { rows } = await querySupabase(supabaseClient, 
      'SELECT doc_id, doc_type, file_name, file_type, size_bytes, status, created_at, object_key FROM documents WHERE application_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    // Map to match frontend interface
    const documents = rows.map((row: any) => ({
      document_id: row.doc_id,
      document_code: row.doc_type,
      document_name: row.file_name || row.doc_type,
      file_url: row.object_key ? `/api/documents/${row.doc_id}/download` : undefined,
      verification_status: row.status,
      uploaded_at: row.created_at,
      file_type: row.file_type,
      size_bytes: row.size_bytes,
    }));
    return res.status(200).json({ documents });
  } catch (err) {
    logger.error('ListDocumentsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

// GET /api/applications/:id/documents/checklist - get document checklist for application's product
app.get('/api/applications/:id/documents/checklist', async (req: any, res: any) => {
  try {
    // Get product code from application
    const appResult = await querySupabase(supabaseClient, 
      'SELECT product_code FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const productCode = appResult.rows[0].product_code;

    // Get checklist for this product - join with document_master to get document names
    // Use DISTINCT ON to handle duplicate entries in document_checklist
    const { rows } = await querySupabase(supabaseClient, 
      `SELECT DISTINCT ON (dc.doc_type)
         dc.doc_type as document_code,
         COALESCE(dm.document_name, 
           CASE 
             WHEN dc.doc_type = 'PAN' THEN 'PAN Card'
             WHEN dc.doc_type = 'ITR' THEN 'Income Tax Return'
             WHEN dc.doc_type = 'SALARY_SLIP' THEN 'Salary Slip'
             WHEN dc.doc_type = 'FORM_16' THEN 'Form 16'
             WHEN dc.doc_type = 'BANK_STATEMENT' THEN 'Bank Statement'
             WHEN dc.doc_type = 'AADHAAR' THEN 'Aadhaar Card'
             WHEN dc.doc_type = 'PROPERTY_DOCS' THEN 'Property Documents'
             ELSE REPLACE(dc.doc_type, '_', ' ')
           END
         ) as document_name,
         dc.required as is_mandatory,
         CASE WHEN d.doc_id IS NOT NULL THEN true ELSE false END as uploaded
       FROM document_checklist dc
       LEFT JOIN document_master dm ON dm.document_code = dc.doc_type
       LEFT JOIN documents d ON d.application_id = $2 AND d.doc_type = dc.doc_type
       WHERE dc.product_code = $1
       ORDER BY dc.doc_type, dc.required DESC`,
      [productCode, req.params.id]
    );

    return res.status(200).json({ 
      productCode, 
      checklist: rows,
      completion: rows.length > 0 ? Math.round((rows.filter((r: any) => r.uploaded).length / rows.length) * 100) : 0
    });
  } catch (err) {
    logger.error('GetChecklistError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to get checklist', details: (err as Error).message });
  }
});

// Legacy checklist endpoint (for backward compatibility)
app.get('/api/applications/:id/checklist', async (req: any, res: any) => {
  // Redirect to the new endpoint by calling the handler directly
  const newReq = { ...req, url: `/api/applications/${req.params.id}/documents/checklist`, path: `/api/applications/${req.params.id}/documents/checklist` };
  return app._router.handle(newReq, res);
});

// PATCH /api/documents/:docId/verify - verify document
app.patch('/api/documents/:docId/verify', async (req: any, res: any) => {
  const VerifySchema = z.object({ remarks: z.string().optional() });
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const client = await connectSupabase(supabaseClient);
  
  try {
    await client.query('BEGIN');
    
    // Check document exists and get application_id
    const { rows } = await client.query('SELECT application_id, status FROM documents WHERE doc_id = $1', [req.params.docId]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update status
    await client.query(
      'UPDATE documents SET status = $1 WHERE doc_id = $2',
      ['Verified', req.params.docId]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, rows[0].application_id, 'los.document.DocumentVerified.v1', 'los.document.DocumentVerified.v1', JSON.stringify({ docId: req.params.docId, remarks: parsed.data.remarks }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('DocumentVerified', { correlationId: (req as any).correlationId, docId: req.params.docId });
    return res.status(200).json({ docId: req.params.docId, status: 'Verified', verified: true });
  } catch (err) {
    await client.rollback();
    logger.error('DocumentVerifyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to verify document' });
  } finally {
    // Transaction handles cleanup automatically
  }
});

// GET /api/documents/:docId/download - presigned URL for download
app.get('/api/documents/:docId/download', async (req: any, res: any) => {
  try {
    const { rows } = await querySupabase(supabaseClient, 'SELECT object_key, file_name, file_type FROM documents WHERE doc_id = $1', [req.params.docId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (!rows[0].object_key) {
      return res.status(404).json({ error: 'Document file not found (object_key missing)' });
    }
    
    // Try to generate presigned URL
    try {
      const url = await getPresignedUrl(s3, { bucket, key: rows[0].object_key, expiresInSec: 300 });
      return res.status(200).json({ 
        url, 
        fileName: rows[0].file_name, 
        fileType: rows[0].file_type, 
        expiresInSec: 300 
      });
    } catch (s3Err: any) {
      // If S3/MinIO is not available, return a direct download URL (for development)
      logger.warn('S3PresignedUrlError', { 
        error: (s3Err as Error).message, 
        objectKey: rows[0].object_key,
        correlationId: (req as any).correlationId 
      });
      
      // Fallback: Return a direct URL pattern (for development/stub)
      const directUrl = `/api/documents/${req.params.docId}/file`;
      return res.status(200).json({ 
        url: directUrl,
        fileName: rows[0].file_name, 
        fileType: rows[0].file_type, 
        expiresInSec: 300,
        note: 'Using direct download URL (S3/MinIO not available)'
      });
    }
  } catch (err) {
    logger.error('DownloadPresignError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to generate download link', details: (err as Error).message });
  }
});

// ============================================
// MASTERS SERVICE ENDPOINTS (Consolidated)
// ============================================

// GET /api/masters/products - list all products
app.get('/api/masters/products', async (_req, res) => {
  try {
    const { rows } = await querySupabase(supabaseClient, 
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at FROM products ORDER BY product_code'
    );
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/masters/products/:productCode - get product by code
app.get('/api/masters/products/:productCode', async (req, res) => {
  try {
    const { rows } = await querySupabase(supabaseClient, 
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at FROM products WHERE product_code = $1',
      [req.params.productCode]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/masters/calendar/holidays - add business holiday
app.post('/api/masters/calendar/holidays', async (req, res) => {
  try {
    const { holidayDate, holidayName, holidayType, applicableStates } = req.body || {};
    if (!holidayDate || !holidayName || !holidayType) {
      return res.status(400).json({ error: 'holidayDate, holidayName, and holidayType required' });
    }
    const holidayId = uuidv4();
    await querySupabase(supabaseClient, 
      'INSERT INTO business_calendar (holiday_id, holiday_date, holiday_name, holiday_type, applicable_states) VALUES ($1, $2, $3, $4, $5)',
      [holidayId, holidayDate, holidayName, holidayType, applicableStates ? JSON.stringify(applicableStates) : null]
    );
    return res.status(201).json({ holidayId, holidayDate, holidayName });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// GET /api/masters/calendar/is-business-day - check if date is a business day
app.get('/api/masters/calendar/is-business-day', async (req, res) => {
  try {
    const date = req.query.date as string;
    const state = req.query.state as string | undefined;
    if (!date) {
      return res.status(400).json({ error: 'date parameter required (YYYY-MM-DD)' });
    }
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let holidayQuery = `SELECT holiday_id, holiday_name, holiday_type FROM business_calendar WHERE holiday_date = $1 AND is_active = true`;
    const queryParams: any[] = [date];
    if (state) {
      holidayQuery += ` AND (applicable_states IS NULL OR $2 = ANY(applicable_states))`;
      queryParams.push(state);
    } else {
      holidayQuery += ` AND (applicable_states IS NULL OR holiday_type = 'NATIONAL' OR holiday_type = 'BANK')`;
    }
    const { rows: holidays } = await querySupabase(supabaseClient, holidayQuery, queryParams);
    const isHoliday = holidays.length > 0;
    const isBusinessDay = !isWeekend && !isHoliday;
    return res.status(200).json({ date, isBusinessDay, isWeekend, isHoliday, holidays: holidays.map(h => ({ name: h.holiday_name, type: h.holiday_type })) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check business day' });
  }
});

// GET /api/masters/calendar/holidays - list holidays
app.get('/api/masters/calendar/holidays', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const state = req.query.state as string | undefined;
    let query = `SELECT holiday_id, holiday_date, holiday_name, holiday_type, applicable_states FROM business_calendar WHERE is_active = true AND EXTRACT(YEAR FROM holiday_date) = $1`;
    const queryParams: any[] = [year];
    if (state) {
      query += ` AND (applicable_states IS NULL OR $2 = ANY(applicable_states))`;
      queryParams.push(state);
    }
    query += ` ORDER BY holiday_date ASC`;
    const { rows } = await querySupabase(supabaseClient, query, queryParams);
    return res.status(200).json({ holidays: rows, year });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// Catch-all route for SPA - serve index.html for any non-API routes
// This must be LAST, after all API routes
app.get('*', (req, res) => {
  const frontendIndexPath = path.join(__dirname, '../../web-dist/index.html');
  res.sendFile(frontendIndexPath, (err) => {
    if (err) {
      // Frontend not available - this is API-only deployment
      res.status(404).json({ 
        error: 'Page not found',
        message: 'This is an API service. Frontend UI is not deployed.',
        availableEndpoints: {
          root: '/ - API info',
          health: '/health - Health check',
          api: '/api/* - API endpoints'
        }
      });
    }
  });
});

// Only start server if this file is run directly (not imported for tests)
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  
  console.log('🚀 Starting LOS Monolith Service...');
  console.log('📋 Environment check:');
  console.log(`   PORT: ${port}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'SET ✅' : 'NOT SET ❌'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✅' : 'NOT SET ❌'}`);
  
  app.listen(port, '0.0.0.0', () => {
    logger.info('MonolithServiceStarted', { port });
    console.log(`✅ LOS Monolith Service started successfully on port ${port}`);
    console.log(`   Health endpoint: http://0.0.0.0:${port}/health`);
  });
}
