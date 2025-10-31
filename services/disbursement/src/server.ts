import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, verifySignature } from '@los/shared-libs';

const app = express();
app.use(json());
app.use(correlationIdMiddleware);
const pool = createPgPool();
const logger = createLogger('disbursement-service');

app.get('/health', (_req, res) => res.status(200).send('OK'));

const ReqSchema = z.object({
  amount: z.number().min(1),
  beneficiaryAccount: z.string().min(6),
  ifsc: z.string().min(4)
});

// POST /api/applications/:id/disburse - idempotent by Idempotency-Key header
app.post('/api/applications/:id/disburse', async (req, res) => {
  const idemp = req.header('Idempotency-Key') || uuidv4();
  const parsed = ReqSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check for existing disbursement with same idempotency key
    if (idemp) {
      const existing = await client.query(
        'SELECT disbursement_id, status FROM disbursements WHERE idempotency_key = $1',
        [idemp]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(200).json({ 
          disbursementId: existing.rows[0].disbursement_id, 
          status: existing.rows[0].status,
          message: 'Idempotent request' 
        });
      }
    }

    const disbursementId = uuidv4();
    
    // Persist disbursement
    await client.query(
      'INSERT INTO disbursements (disbursement_id, application_id, amount, beneficiary_account, ifsc, idempotency_key, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [disbursementId, req.params.id, parsed.data.amount, parsed.data.beneficiaryAccount, parsed.data.ifsc, idemp, 'REQUESTED']
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.disbursement.DisbursementRequested.v1', 'los.disbursement.DisbursementRequested.v1', JSON.stringify({ applicationId: req.params.id, disbursementId, amount: parsed.data.amount, idempotencyKey: idemp }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('DisbursementRequested', { correlationId: (req as any).correlationId, applicationId: req.params.id, disbursementId });
    return res.status(202).json({ disbursementId, status: 'REQUESTED' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('DisbursementRequestError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to request disbursement' });
  } finally {
    client.release();
  }
});

// POST /webhooks/cbs - reconciliation callback from Core/LMS (via Integration Hub)
app.post('/webhooks/cbs', async (req, res) => {
  const secret = process.env.INTEGRATION_SECRET || 'changeme';
  const sig = req.header('X-Signature');
  const raw = JSON.stringify(req.body || {});
  if (!verifySignature(raw, sig, secret)) return res.status(401).send('bad signature');

  const { applicationId, disbursementId, cbsRef, status } = req.body || {};
  if (!applicationId || !disbursementId) return res.status(400).json({ error: 'invalid payload' });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update disbursement status
    const newStatus = status === 'SUCCESS' ? 'DISBURSED' : 'FAILED';
    await client.query(
      'UPDATE disbursements SET status = $1, cbs_ref = $2, updated_at = now() WHERE disbursement_id = $3',
      [newStatus, cbsRef || null, disbursementId]
    );

    // Write outbox event
    const eventId = uuidv4();
    const eventTopic = status === 'SUCCESS' ? 'los.disbursement.Disbursed.v1' : 'los.disbursement.DisbursementFailed.v1';
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, applicationId, eventTopic, eventTopic, JSON.stringify({ applicationId, disbursementId, cbsRef, reason: status === 'SUCCESS' ? undefined : 'FAILED' }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('DisbursementReconciled', { correlationId: (req as any).correlationId, applicationId, disbursementId, status: newStatus });
    return res.status(200).json({ ack: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('DisbursementReconcileError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to reconcile disbursement' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3009;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Disbursement service listening on ${port}`);
});


