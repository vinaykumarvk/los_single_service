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

// Apply general limiter to all routes
app.use(generalLimiter);

// Minimal Keycloak JWT presence check (placeholder)
// JWT validation provided by requireAuth (Keycloak JWKS)

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

// GET /api/user/roles - get user roles and UI permissions
app.get('/api/user/roles', requireAuth, getUserRolesHandler);

// Authentication routes (public endpoints, no auth required)
app.use('/auth', createProxyMiddleware({ 
  target: 'http://localhost:3016', 
  changeOrigin: true, 
  pathRewrite: { '^/auth': '' } 
}));

// Leads/Sourcing routes
app.use('/leads', requireAuth, createProxyMiddleware({ 
  target: 'http://localhost:3017', 
  changeOrigin: true, 
  pathRewrite: { '^/leads': '' } 
}));

// Service routing with rate limiting by operation type
// Write operations (POST, PUT, PATCH, DELETE) - stricter limits
app.use('/application', requireAuth, (req, res, next) => {
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
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || []));
      proxyReq.setHeader('X-User-Email', user.email || '');
    }
  }
}));

app.use('/kyc', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // KYC is sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true, pathRewrite: { '^/kyc': '' } }));

app.use('/document', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true, pathRewrite: { '^/document': '' } }));

app.use('/underwriting', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Underwriting decisions are sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3006', changeOrigin: true, pathRewrite: { '^/underwriting': '' } }));

app.use('/sanction', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Sanction is sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3007', changeOrigin: true, pathRewrite: { '^/sanction': '' } }));

app.use('/payments', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Payments are highly sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3008', changeOrigin: true, pathRewrite: { '^/payments': '' } }));

app.use('/disbursement', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return sensitiveLimiter(req, res, next); // Disbursement is highly sensitive
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3009', changeOrigin: true, pathRewrite: { '^/disbursement': '' } }));

app.use('/reporting', requireAuth, createProxyMiddleware({ target: 'http://localhost:3015', changeOrigin: true, pathRewrite: { '^/reporting': '' } }));

// Scoring Service (new)
app.use('/scoring', requireAuth, createProxyMiddleware({ 
  target: 'http://localhost:3018', 
  changeOrigin: true, 
  pathRewrite: { '^/scoring': '' },
  onProxyReq: (proxyReq, req) => {
    // Forward user information for access control
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || []));
    }
  }
}));

// Analytics Service (new)
app.use('/analytics', requireAuth, createProxyMiddleware({ 
  target: 'http://localhost:3019', 
  changeOrigin: true, 
  pathRewrite: { '^/analytics': '' },
  onProxyReq: (proxyReq, req) => {
    // Forward user information for access control
    const user: any = (req as any).user;
    if (user) {
      proxyReq.setHeader('X-User-Id', user.sub || user.id || '');
      proxyReq.setHeader('X-User-Roles', JSON.stringify(user.realm_access?.roles || []));
    }
  }
}));
app.use('/notifications', requireAuth, (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
}, createProxyMiddleware({ target: 'http://localhost:3011', changeOrigin: true, pathRewrite: { '^/notifications': '' } }));
app.use('/audit', requireAuth, createProxyMiddleware({ target: 'http://localhost:3012', changeOrigin: true, pathRewrite: { '^/audit': '' } }));
app.use('/bureau', requireAuth, createProxyMiddleware({ target: 'http://localhost:3013', changeOrigin: true, pathRewrite: { '^/bureau': '' } }));
app.use('/verification', requireAuth, (req, res, next) => {
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


