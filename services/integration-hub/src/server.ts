import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationIdMiddleware, createLogger, verifySignature, checkBlacklistWhitelist } from '@los/shared-libs';
import { createBureauAdapter } from './adapters/bureau';
import { createEKYCAdapter } from './adapters/ekyc';
import { createPaymentAdapter } from './adapters/payment';

const app = express();
const logger = createLogger('integration-hub');

app.use(express.text({ type: ['application/json', 'text/plain'], limit: '1mb' }));
app.use((req, _res, next) => {
  // Preserve raw body for signature verification; parse JSON later on-demand
  (req as any).rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  next();
});
app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

// PAN validation endpoint (using adapter pattern with real NSDL integration)
app.post('/api/integrations/pan/validate', async (req, res) => {
  try {
    const { pan, applicantName } = req.body || {};
    
    // Basic format validation
    const valid = typeof pan === 'string' && /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
    
    if (!valid) {
      return res.status(400).json({ pan, valid: false, error: 'Invalid PAN format' });
    }
    
    // Check blacklist/whitelist
    const blacklistCheck = await checkBlacklistWhitelist('PAN', pan);
    if (blacklistCheck.isBlacklisted) {
      return res.status(403).json({ 
        pan, 
        valid: false, 
        blacklisted: true,
        reason: blacklistCheck.entry?.reason || 'PAN is blacklisted',
        source: blacklistCheck.entry?.source
      });
    }
    
    // Try to use NSDL adapter (will use fallback mode if API key not configured)
    const useMock = process.env.USE_MOCK_INTEGRATIONS !== 'false';
    
    if (!useMock) {
      try {
        const { NSDLPANAdapter } = await import('./adapters/pan/nsdl');
        const adapter = new NSDLPANAdapter();
        const result = await adapter.validate({ pan, applicantName });
        
        logger.info('PANValidation', { 
          correlationId: (req as any).correlationId, 
          pan: pan?.substring(0, 2) + '****' + pan?.substring(pan.length - 2),
          valid: result.valid,
          whitelisted: blacklistCheck.isWhitelisted,
          provider: 'NSDL',
          mode: (adapter as any).useFallback ? 'fallback' : 'real'
        });
        
        return res.status(200).json({ 
          pan, 
          valid: result.valid,
          holderName: result.holderName,
          whitelisted: blacklistCheck.isWhitelisted,
          providerRef: result.providerRef,
          status: result.status,
          note: (adapter as any).useFallback ? 'Dummy response - configure NSDL_PAN_API_KEY for real validation' : undefined
        });
      } catch (err) {
        logger.warn('NSDLPANAdapterError', { error: (err as Error).message });
        // Fall through to format validation only
      }
    }
    
    // Format validation only (mock mode)
    logger.info('PANValidation', { 
      correlationId: (req as any).correlationId, 
      pan: pan?.substring(0, 2) + '****' + pan?.substring(pan.length - 2),
      valid,
      whitelisted: blacklistCheck.isWhitelisted,
      mode: 'format-only'
    });
    
    return res.status(200).json({ 
      pan, 
      valid: true,
      whitelisted: blacklistCheck.isWhitelisted,
      providerRef: uuidv4(),
      note: 'Format validation only. Set USE_MOCK_INTEGRATIONS=false to use adapter fallback mode.'
    });
  } catch (err) {
    logger.error('PANValidationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'PAN validation failed' });
  }
});

// eKYC start endpoint (using adapter)
app.post('/api/integrations/ekyc/start', async (req, res) => {
  try {
    const { applicationId, applicantId, pan, aadhaar, mobile, consent, purpose, provider } = req.body || {};
    
    if (!applicationId || !applicantId || !consent) {
      return res.status(400).json({ error: 'applicationId, applicantId, and consent are required' });
    }
    
    const adapter = createEKYCAdapter(provider || 'NSDL');
    const result = await adapter.startVerification({
      applicationId,
      applicantId,
      pan,
      aadhaar,
      mobile,
      consent,
      purpose: purpose || 'KYC',
      provider: provider || 'NSDL'
    });
    
    logger.info('EKYCStart', { 
      correlationId: (req as any).correlationId, 
      sessionId: result.sessionId,
      applicationId 
    });
    
    return res.status(202).json(result);
  } catch (err) {
    logger.error('EKYCStartError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to start eKYC' });
  }
});

// eKYC status endpoint
app.get('/api/integrations/ekyc/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const adapter = createEKYCAdapter();
    const status = await adapter.getStatus(sessionId);
    
    if (!status) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    return res.status(200).json(status);
  } catch (err) {
    logger.error('EKYCStatusError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to get eKYC status' });
  }
});

// Bureau pull endpoint (using adapter)
app.post('/api/integrations/bureau/pull', async (req, res) => {
  try {
    const { applicationId, applicantId, pan, mobile, dob, provider } = req.body || {};
    
    if (!applicationId || !applicantId) {
      return res.status(400).json({ error: 'applicationId and applicantId are required' });
    }
    
    const adapter = createBureauAdapter(provider || 'CIBIL');
    const result = await adapter.pullCreditReport({
      applicationId,
      applicantId,
      pan,
      mobile,
      dob,
      provider: provider || 'CIBIL'
    });
    
    logger.info('BureauPull', { 
      correlationId: (req as any).correlationId, 
      requestId: result.requestId,
      applicationId,
      provider: result.provider 
    });
    
    return res.status(202).json(result);
  } catch (err) {
    logger.error('BureauPullError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to pull bureau report' });
  }
});

// Payment order creation endpoint
app.post('/api/integrations/payment/order', async (req, res) => {
  try {
    const { applicationId, amount, currency, description, customer, provider } = req.body || {};
    
    if (!applicationId || !amount) {
      return res.status(400).json({ error: 'applicationId and amount are required' });
    }
    
    const adapter = createPaymentAdapter(provider || 'RAZORPAY');
    const result = await adapter.createOrder({
      applicationId,
      amount,
      currency: currency || 'INR',
      description,
      customer,
      provider: provider || 'RAZORPAY'
    });
    
    logger.info('PaymentOrderCreated', { 
      correlationId: (req as any).correlationId, 
      orderId: result.orderId,
      applicationId,
      amount 
    });
    
    return res.status(201).json(result);
  } catch (err) {
    logger.error('PaymentOrderError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
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


