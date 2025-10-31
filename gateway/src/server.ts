import express from 'express';
import { json } from 'express';
import { correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler } from '@los/shared-libs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth } from './auth';
import { maskingMiddleware } from './masking';
import rateLimit from 'express-rate-limit';

const app = express();
const logger = createLogger('gateway-bff');
app.use(json());
app.use(correlationIdMiddleware);
app.use(maskingMiddleware);
app.use(metricsMiddleware);

// Basic security hardening: rate limit and body size limits (set at app-level)
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use(limiter);

// Minimal Keycloak JWT presence check (placeholder)
// JWT validation provided by requireAuth (Keycloak JWKS)

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

// Simple service routing (ports per service dev defaults)
app.use('/application', requireAuth, createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true, pathRewrite: { '^/application': '' } }));
app.use('/kyc', requireAuth, createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true, pathRewrite: { '^/kyc': '' } }));
app.use('/document', requireAuth, createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true, pathRewrite: { '^/document': '' } }));
app.use('/underwriting', requireAuth, createProxyMiddleware({ target: 'http://localhost:3006', changeOrigin: true, pathRewrite: { '^/underwriting': '' } }));
app.use('/sanction', requireAuth, createProxyMiddleware({ target: 'http://localhost:3007', changeOrigin: true, pathRewrite: { '^/sanction': '' } }));
app.use('/payments', requireAuth, createProxyMiddleware({ target: 'http://localhost:3008', changeOrigin: true, pathRewrite: { '^/payments': '' } }));
app.use('/disbursement', requireAuth, createProxyMiddleware({ target: 'http://localhost:3009', changeOrigin: true, pathRewrite: { '^/disbursement': '' } }));
app.use('/reporting', requireAuth, createProxyMiddleware({ target: 'http://localhost:3015', changeOrigin: true, pathRewrite: { '^/reporting': '' } }));
app.use('/notifications', requireAuth, createProxyMiddleware({ target: 'http://localhost:3011', changeOrigin: true, pathRewrite: { '^/notifications': '' } }));
app.use('/audit', requireAuth, createProxyMiddleware({ target: 'http://localhost:3012', changeOrigin: true, pathRewrite: { '^/audit': '' } }));
app.use('/bureau', requireAuth, createProxyMiddleware({ target: 'http://localhost:3013', changeOrigin: true, pathRewrite: { '^/bureau': '' } }));
app.use('/verification', requireAuth, createProxyMiddleware({ target: 'http://localhost:3014', changeOrigin: true, pathRewrite: { '^/verification': '' } }));

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  logger.info('Gateway listening', { port });
});


