import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifySignature } from '@los/shared-libs/src/webhook';

const app = express();

app.use(express.text({ type: ['application/json', 'text/plain'], limit: '1mb' }));
app.use((req, _res, next) => {
  // Preserve raw body for signature verification; parse JSON later on-demand
  (req as any).rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  next();
});
app.use(json());

app.get('/health', (_req, res) => res.status(200).send('OK'));

// Mock PAN validate
app.post('/api/integrations/pan/validate', (req, res) => {
  const { pan } = req.body || {};
  const valid = typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
  return res.status(200).json({ pan, valid, providerRef: uuidv4() });
});

// Mock eKYC start
app.post('/api/integrations/ekyc/start', (_req, res) => {
  return res.status(202).json({ sessionId: uuidv4(), status: 'PENDING' });
});

// Mock bureau pull
app.post('/api/integrations/bureau/pull', (_req, res) => {
  return res.status(202).json({ requestId: uuidv4(), status: 'REQUESTED' });
});

// Bureau webhook
app.post('/webhooks/bureau', (req, res) => {
  const secret = process.env.INTEGRATION_SECRET || 'changeme';
  const sig = req.header('X-Signature');
  const raw = (req as any).rawBody as string;
  if (!verifySignature(raw, sig, secret)) return res.status(401).send('bad signature');
  return res.status(200).json({ ack: true });
});

// eSign webhook
app.post('/webhooks/esign', (req, res) => {
  const secret = process.env.INTEGRATION_SECRET || 'changeme';
  const sig = req.header('X-Signature');
  const raw = (req as any).rawBody as string;
  if (!verifySignature(raw, sig, secret)) return res.status(401).send('bad signature');
  return res.status(200).json({ ack: true });
});

// Core/LMS callback
app.post('/webhooks/cbs', (req, res) => {
  const secret = process.env.INTEGRATION_SECRET || 'changeme';
  const sig = req.header('X-Signature');
  const raw = (req as any).rawBody as string;
  if (!verifySignature(raw, sig, secret)) return res.status(401).send('bad signature');
  return res.status(200).json({ ack: true });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3020;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Integration Hub service listening on ${port}`);
});


