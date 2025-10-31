import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';

const pool = createPgPool();
const logger = createLogger('customer-kyc-service');

const app = express();
app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

const ApplicantSchema = z.object({
  firstName: z.string().min(2).max(200).optional(),
  lastName: z.string().min(2).max(200).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  aadhaarMasked: z.string().length(12).optional()
});

// PUT /api/applicants/:id - upsert applicant
app.put('/api/applicants/:id', async (req, res) => {
  const parsed = ApplicantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Upsert applicant
    await client.query(
      `INSERT INTO applicants (applicant_id, first_name, last_name, dob, mobile, email, pan, aadhaar_masked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (applicant_id) DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, applicants.first_name),
         last_name = COALESCE(EXCLUDED.last_name, applicants.last_name),
         dob = COALESCE(EXCLUDED.dob, applicants.dob),
         mobile = COALESCE(EXCLUDED.mobile, applicants.mobile),
         email = COALESCE(EXCLUDED.email, applicants.email),
         pan = COALESCE(EXCLUDED.pan, applicants.pan),
         aadhaar_masked = COALESCE(EXCLUDED.aadhaar_masked, applicants.aadhaar_masked)`,
      [req.params.id, parsed.data.firstName, parsed.data.lastName, parsed.data.dob, parsed.data.mobile, parsed.data.email, parsed.data.pan, parsed.data.aadhaarMasked]
    );

    await client.query('COMMIT');
    logger.info('UpsertApplicant', { correlationId: (req as any).correlationId, applicantId: req.params.id });
    return res.status(200).json({ applicantId: req.params.id, updated: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('UpsertApplicantError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to upsert applicant' });
  } finally {
    client.release();
  }
});

// POST /api/applicants/:id/consent - capture consent
app.post('/api/applicants/:id/consent', async (req, res) => {
  const ConsentSchema = z.object({ purpose: z.string().min(1) });
  const parsed = ConsentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'purpose required' });
  }

  const consentId = uuidv4();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Persist consent
    await client.query(
      'INSERT INTO consents (consent_id, applicant_id, purpose) VALUES ($1, $2, $3)',
      [consentId, req.params.id, parsed.data.purpose]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.customer.ConsentCaptured.v1', 'los.customer.ConsentCaptured.v1', JSON.stringify({ applicantId: req.params.id, consentId, purpose: parsed.data.purpose }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('ConsentCaptured', { correlationId: (req as any).correlationId, applicantId: req.params.id, consentId });
    return res.status(201).json({ consentId });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('ConsentCaptureError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to capture consent' });
  } finally {
    client.release();
  }
});

// POST /api/kyc/:applicationId/start - trigger KYC
app.post('/api/kyc/:applicationId/start', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.applicationId, 'los.kyc.KycRequested.v1', 'los.kyc.KycRequested.v1', JSON.stringify({ applicationId: req.params.applicationId }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('StartKYC', { correlationId: (req as any).correlationId, applicationId: req.params.applicationId });
    return res.status(202).json({ applicationId: req.params.applicationId, started: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('StartKYCError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to start KYC' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Customer-KYC service listening on ${port}`);
});


