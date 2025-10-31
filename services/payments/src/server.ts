import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';

const app = express();
app.use(json());
app.use(correlationIdMiddleware);
const pool = createPgPool();
const logger = createLogger('payments-service');

app.get('/health', (_req, res) => res.status(200).send('OK'));

const FeeConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('flat'), amount: z.number().min(0) }),
  z.object({ type: z.literal('percent'), percent: z.number().min(0).max(100), min?: z.number().min(0).optional(), max?: z.number().min(0).optional() }),
  z.object({ type: z.literal('slab'), slabs: z.array(z.object({ upto: z.number().min(1), percent: z.number().min(0).max(100) })), min?: z.number().min(0).optional(), max?: z.number().min(0).optional() })
]);

function calcFee(amount: number, cfg: z.infer<typeof FeeConfigSchema>): number {
  let fee = 0;
  if (cfg.type === 'flat') fee = cfg.amount;
  if (cfg.type === 'percent') fee = (amount * cfg.percent) / 100;
  if (cfg.type === 'slab') {
    const slab = cfg.slabs.find(s => amount <= s.upto) || cfg.slabs[cfg.slabs.length - 1];
    fee = (amount * slab.percent) / 100;
  }
  const min = (cfg as any).min as number | undefined;
  const max = (cfg as any).max as number | undefined;
  if (typeof min === 'number' && fee < min) fee = min;
  if (typeof max === 'number' && fee > max) fee = max;
  return +fee.toFixed(2);
}

// POST /api/applications/:id/fees/calculate
app.post('/api/applications/:id/fees/calculate', async (req, res) => {
  const amount = Number(req.body?.amount);
  const cfg = FeeConfigSchema.safeParse(req.body?.config);
  if (!Number.isFinite(amount) || amount <= 0 || !cfg.success) return res.status(400).json({ error: 'Invalid payload' });
  const fee = calcFee(amount, cfg.data);
  await writeOutboxEvent(pool, {
    id: uuidv4(),
    aggregateId: req.params.id,
    topic: 'los.payment.FeeCalculated.v1',
    eventType: 'los.payment.FeeCalculated.v1',
    payload: { applicationId: req.params.id, amount, fee, config: cfg.data }
  }).catch(() => {/* stub */});
  return res.status(200).json({ fee });
});

// POST /api/applications/:id/fees/capture
app.post('/api/applications/:id/fees/capture', async (req, res) => {
  const CaptureSchema = z.object({ fee: z.number().positive(), currency: z.string().default('INR') });
  const parsed = CaptureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'fee required and must be positive' });

  const paymentId = uuidv4();
  const providerRef = uuidv4();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Persist payment
    await client.query(
      'INSERT INTO fee_payments (payment_id, application_id, amount, currency, status, provider_ref) VALUES ($1, $2, $3, $4, $5, $6)',
      [paymentId, req.params.id, parsed.data.fee, parsed.data.currency, 'CAPTURED', providerRef]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.payment.FeePaymentCaptured.v1', 'los.payment.FeePaymentCaptured.v1', JSON.stringify({ applicationId: req.params.id, paymentId, amount: parsed.data.fee, currency: parsed.data.currency, providerRef }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('FeePaymentCaptured', { correlationId: (req as any).correlationId, applicationId: req.params.id, paymentId });
    return res.status(201).json({ paymentId, providerRef, status: 'CAPTURED' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('FeeCaptureError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to capture payment' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3008;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Payments service listening on ${port}`);
});


