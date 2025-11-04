import express from 'express';
import { json } from 'express';
import { correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler } from '@los/shared-libs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth } from './auth';
import { maskingMiddleware } from './masking';
import { getUserRolesHandler } from './roles';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();
const logger = createLogger('gateway-bff');

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Request size limits (before json parsing)
app.use(json({ limit: '10mb' })); // 10MB max body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(correlationIdMiddleware);
app.use(maskingMiddleware);
app.use(metricsMiddleware);

// Enhanced rate limiting: per-endpoint limits
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 write requests per window
  message: 'Too many write requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limits for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 sensitive requests per window
  message: 'Too many sensitive requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter to all routes EXCEPT auth routes (which come before this)
// Auth routes are public and should not be rate limited
app.use((req, res, next) => {
  // Skip rate limiting for auth routes
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/auth')) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// Minimal Keycloak JWT presence check (placeholder)
// JWT validation provided by requireAuth (Keycloak JWKS)

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

// GET /api/user/roles - get user roles and UI permissions
app.get('/api/user/roles', requireAuth, getUserRolesHandler);

// Authentication routes (public endpoints, no auth required)
// Support both /auth and /api/auth for backward compatibility
// IMPORTANT: /api/auth must come BEFORE general /api routes to avoid conflicts
// Auth service runs on port 3016 by default (or PORT env var)
const AUTH_SERVICE_PORT = process.env.AUTH_SERVICE_PORT || '3016';
const AUTH_SERVICE_URL = `http://localhost:${AUTH_SERVICE_PORT}`;

app.use('/api/auth', createProxyMiddleware({ 
  target: AUTH_SERVICE_URL, 
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api/auth' }, // Forward /api/auth to auth service as-is
  logLevel: 'debug',
  timeout: 30000, // 30 second timeout
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    logger.error('AuthProxyError', { error: err.message, path: req.url, target: AUTH_SERVICE_URL });
    if (!res.headersSent) {
      res.status(502).json({ error: 'Authentication service unavailable' });
    }
  }
}));

app.use('/auth', createProxyMiddleware({ 
  target: AUTH_SERVICE_URL, 
  changeOrigin: true, 
  pathRewrite: { '^/auth': '' },
  logLevel: 'debug',
  onError: (err, req, res) => {
    logger.error('AuthProxyError', { error: err.message, path: req.url, target: AUTH_SERVICE_URL });
    res.status(502).json({ error: 'Authentication service unavailable' });
  }
}));

// Helper function to set user headers on request (MUST be defined before routes)
function setUserHeaders(req: express.Request, user: any) {
  if (user) {
    const userId = user.sub || user.id || '';
    if (userId) {
      req.headers['x-user-id'] = userId;
      req.headers['x-user-roles'] = JSON.stringify(user.realm_access?.roles || user.roles || []);
      req.headers['x-user-email'] = user.email || '';
      req.headers['x-user-username'] = user.username || '';
    }
  }
}

// Leads/Sourcing routes
app.use('/leads', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3017', 
  changeOrigin: true, 
  pathRewrite: { '^/leads': '' } 
}));

// API routes for applicants - handle /api/applicants prefix
// CRITICAL: MUST come before /api/applications to avoid route conflicts
// Express matches routes in order, so /api/applicants must be registered first
app.use('/api/applicants', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Applicant data is sensitive (PII)
  }
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3003', // KYC service handles applicants
  changeOrigin: true, 
  pathRewrite: { '^/api/applicants': '/api/applicants' }, // Keep /api/applicants prefix
  timeout: 30000, // 30 second timeout (increased for database operations)
  proxyTimeout: 30000,
  onProxyReq: (proxyReq, req) => {
    logger.debug('ApplicantsProxyRequest', { 
      method: req.method, 
      path: req.url,
      target: 'http://localhost:3003' 
    });
  },
  onProxyRes: (proxyRes, req) => {
    logger.debug('ApplicantsProxyResponse', { 
      method: req.method, 
      path: req.url,
      status: proxyRes.statusCode 
    });
  },
  onError: (err, req, res) => {
    logger.error('ApplicantsProxyError', { error: err.message, path: req.url, code: (err as any).code });
    if (!res.headersSent) {
      res.status(502).json({ error: 'Applicant service unavailable', details: err.message });
    }
  }
}));

// API routes - handle /api/applications prefix
// IMPORTANT: This comes AFTER /api/applicants to avoid route conflicts
app.use('/api/applications', requireAuth, (req, res, next) => {
  // Debug: Log user after requireAuth
  const user: any = (req as any).user;
  logger.debug('AfterRequireAuth', { 
    path: req.url, 
    hasUser: !!user, 
    userId: user?.sub || user?.id,
    userKeys: user ? Object.keys(user) : []
  });
  
  // Set user headers on the request so proxy middleware can forward them
  setUserHeaders(req, user);
  
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  timeout: 15000, // 15 second timeout
  proxyTimeout: 15000,
  pathRewrite: { '^/': '/api/applications/' }, // Restore the prefix that Express strips (proxy receives /rm/dashboard, rewrite to /api/applications/rm/dashboard)
  onProxyReq: (proxyReq, req) => {
    // Forward user information to backend services for access control
    const user: any = (req as any).user;
    console.log('[Gateway Proxy] onProxyReq called', { 
      path: req.url, 
      hasUser: !!user,
      userId: user?.sub || user?.id,
      userKeys: user ? Object.keys(user) : []
    });
    
    if (user) {
      // JWT tokens use 'sub' for user ID, but our custom tokens might use 'id' from the user object
      // Check both the token payload and any user object passed
      const userId = user.sub || user.id || (user as any).user_id || '';
      if (userId) {
        proxyReq.setHeader('X-User-Id', userId);
        proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
        proxyReq.setHeader('X-User-Email', user.email || '');
        proxyReq.setHeader('X-User-Username', user.username || '');
        console.log('[Gateway Proxy] Headers set', { userId, headersSet: true });
      } else {
        console.warn('[Gateway Proxy] Missing userId', { user });
      }
    } else {
      console.warn('[Gateway Proxy] No user object', { path: req.url });
    }
  }
}));

// Service routing with rate limiting by operation type
// Write operations (POST, PUT, PATCH, DELETE) - stricter limits
app.use('/application', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true, 
  pathRewrite: { '^/application': '' },
  onProxyReq: (proxyReq, req) => {
    // Forward user information to backend services for access control
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
      proxyReq.setHeader('X-User-Email', user.email || '');
    }
  }
}));

app.use('/kyc', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // KYC is sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true, pathRewrite: { '^/kyc': '' } }));

app.use('/document', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true, pathRewrite: { '^/document': '' } }));

app.use('/underwriting', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Underwriting decisions are sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3006', changeOrigin: true, pathRewrite: { '^/underwriting': '' } }));

app.use('/sanction', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Sanction is sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3007', changeOrigin: true, pathRewrite: { '^/sanction': '' } }));

app.use('/payments', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Payments are highly sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3008', changeOrigin: true, pathRewrite: { '^/payments': '' } }));

app.use('/disbursement', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Disbursement is highly sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3009', changeOrigin: true, pathRewrite: { '^/disbursement': '' } }));

app.use('/reporting', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ target: 'http://localhost:3015', changeOrigin: true, pathRewrite: { '^/reporting': '' } }));

// Scoring Service (new)
app.use('/scoring', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3018', 
  changeOrigin: true, 
  pathRewrite: { '^/scoring': '' },
  onProxyReq: (proxyReq, req) => {
    // Forward user information for access control
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
    }
  }
}));

// Analytics Service (new)
app.use('/analytics', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3019', 
  changeOrigin: true, 
  pathRewrite: { '^/analytics': '' },
  onProxyReq: (proxyReq, req) => {
    // Forward user information for access control
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
    }
  }
}));
app.use('/notifications', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3011', changeOrigin: true, pathRewrite: { '^/notifications': '' } }));
app.use('/audit', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ target: 'http://localhost:3012', changeOrigin: true, pathRewrite: { '^/audit': '' } }));
app.use('/bureau', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ target: 'http://localhost:3013', changeOrigin: true, pathRewrite: { '^/bureau': '' } }));

// API routes for integrations - handle /api/integrations prefix
app.use('/api/integrations', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Integrations are sensitive
  }
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3020', 
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
      proxyReq.setHeader('X-User-Email', user.email || '');
    }
  }
}));

// API routes for masters - handle /api/masters prefix
app.use('/api/masters', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3005', 
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
      proxyReq.setHeader('X-User-Email', user.email || '');
    }
  }
}));

// API routes for documents - handle /api/documents prefix (for document deletion)
app.use('/api/documents', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ 
  target: 'http://localhost:3005', 
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || user.roles || []));
      proxyReq.setHeader('X-User-Email', user.email || '');
    }
  }
}));
app.use('/verification', requireAuth, (req, res, next) => {
  setUserHeaders(req, (req as any).user);
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3014', changeOrigin: true, pathRewrite: { '^/verification': '' } }));

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  logger.info('Gateway listening', { port });
});


