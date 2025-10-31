import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, writeOutboxEvent } from '@los/shared-libs';

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
  const CaptureSchema = z.object({ 
    fee: z.number().positive(), 
    currency: z.string().default('INR'),
    scheduledAt: z.string().datetime().optional(), // ISO 8601 date-time for future payments
    isRecurring: z.boolean().optional(),
    recurringFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).optional()
  });
  const parsed = CaptureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'fee required and must be positive' });

  const paymentId = uuidv4();
  const providerRef = uuidv4();
  const client = await pool.connect();
  
  // Determine status and schedule
  const scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  const isRecurring = parsed.data.isRecurring || false;
  const status = scheduledAt && scheduledAt > new Date() ? 'SCHEDULED' : 'CAPTURED';
  
  // Calculate next payment date for recurring
  let nextPaymentDate: Date | null = null;
  if (isRecurring && parsed.data.recurringFrequency) {
    const baseDate = scheduledAt || new Date();
    switch (parsed.data.recurringFrequency) {
      case 'MONTHLY':
        nextPaymentDate = new Date(baseDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextPaymentDate = new Date(baseDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextPaymentDate = new Date(baseDate);
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
        break;
    }
  }
  
  try {
    await client.query('BEGIN');
    
    // Persist payment with scheduling info
    await client.query(
      'INSERT INTO fee_payments (payment_id, application_id, amount, currency, status, provider_ref, scheduled_at, is_recurring, recurring_frequency, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [paymentId, req.params.id, parsed.data.fee, parsed.data.currency, status, providerRef, scheduledAt, isRecurring, parsed.data.recurringFrequency || null, nextPaymentDate]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.payment.FeePaymentCaptured.v1', 'los.payment.FeePaymentCaptured.v1', JSON.stringify({ applicationId: req.params.id, paymentId, amount: parsed.data.fee, currency: parsed.data.currency, providerRef }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('FeePaymentCaptured', { correlationId: (req as any).correlationId, applicationId: req.params.id, paymentId, status });
    return res.status(201).json({ 
      paymentId, 
      providerRef, 
      status,
      scheduledAt: scheduledAt?.toISOString() || null,
      isRecurring,
      nextPaymentDate: nextPaymentDate?.toISOString().split('T')[0] || null
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('FeeCaptureError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to capture payment' });
  } finally {
    client.release();
  }
});

// GET /api/payments - list payments with filters and pagination
app.get('/api/payments', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.query.applicationId) {
      conditions.push(`application_id = $${paramCount++}`);
      values.push(req.query.applicationId);
    }
    if (req.query.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(req.query.status);
    }
    if (req.query.reconciliationStatus) {
      conditions.push(`reconciliation_status = $${paramCount++}`);
      values.push(req.query.reconciliationStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const countQuery = `SELECT COUNT(*) as total FROM fee_payments ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    values.push(limit, offset);
    const dataQuery = `
      SELECT 
        payment_id, application_id, amount, currency, status, provider_ref,
        scheduled_at, is_recurring, recurring_frequency, next_payment_date,
        reconciled_at, reconciliation_status, gateway_amount, gateway_status,
        gateway_transaction_id, reconciliation_notes,
        created_at
      FROM fee_payments 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const { rows } = await pool.query(dataQuery, values);
    
    return res.status(200).json({
      payments: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('ListPaymentsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list payments' });
  }
});

// POST /api/payments/:paymentId/reconcile - reconcile payment with gateway response
app.post('/api/payments/:paymentId/reconcile', async (req, res) => {
  const ReconcileSchema = z.object({
    gatewayTransactionId: z.string().min(1),
    gatewayAmount: z.number().positive(),
    gatewayStatus: z.enum(['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED']),
    notes: z.string().optional()
  });
  
  const parsed = ReconcileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get payment record
    const { rows } = await client.query(
      'SELECT payment_id, amount, status, reconciliation_status FROM fee_payments WHERE payment_id = $1',
      [req.params.paymentId]
    );
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const payment = rows[0];
    const paymentAmount = Number(payment.amount);
    const gatewayAmount = parsed.data.gatewayAmount;
    
    // Determine reconciliation status
    let reconciliationStatus: string;
    let notes = parsed.data.notes || '';
    
    if (paymentAmount === gatewayAmount && parsed.data.gatewayStatus === 'SUCCESS') {
      reconciliationStatus = 'RECONCILED';
    } else if (paymentAmount !== gatewayAmount) {
      reconciliationStatus = 'DISCREPANCY';
      notes = `${notes} Amount mismatch: Expected ${paymentAmount}, Got ${gatewayAmount}. `.trim();
    } else if (parsed.data.gatewayStatus !== 'SUCCESS') {
      reconciliationStatus = 'FAILED';
      notes = `${notes} Gateway status: ${parsed.data.gatewayStatus}. `.trim();
    } else {
      reconciliationStatus = 'RECONCILED';
    }
    
    // Update payment with reconciliation data
    await client.query(
      `UPDATE fee_payments SET
         reconciled_at = now(),
         reconciliation_status = $1,
         gateway_amount = $2,
         gateway_status = $3,
         gateway_transaction_id = $4,
         reconciliation_notes = $5
       WHERE payment_id = $6`,
      [
        reconciliationStatus,
        gatewayAmount,
        parsed.data.gatewayStatus,
        parsed.data.gatewayTransactionId,
        notes,
        req.params.paymentId
      ]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, payment.application_id, 'los.payment.PaymentReconciled.v1', 'los.payment.PaymentReconciled.v1', JSON.stringify({ paymentId: req.params.paymentId, applicationId: payment.application_id, reconciliationStatus, gatewayAmount, gatewayStatus: parsed.data.gatewayStatus }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('PaymentReconciled', { correlationId: (req as any).correlationId, paymentId: req.params.paymentId, reconciliationStatus });
    return res.status(200).json({ 
      paymentId: req.params.paymentId, 
      reconciliationStatus,
      reconciledAt: new Date().toISOString(),
      discrepancy: paymentAmount !== gatewayAmount
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('PaymentReconcileError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to reconcile payment' });
  } finally {
    client.release();
  }
});

// GET /api/payments/reconciliation/discrepancies - get payments with reconciliation discrepancies
app.get('/api/payments/reconciliation/discrepancies', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
         payment_id, application_id, amount, gateway_amount, status, gateway_status,
         gateway_transaction_id, reconciliation_status, reconciliation_notes, created_at, reconciled_at
       FROM fee_payments
       WHERE reconciliation_status = 'DISCREPANCY' OR reconciliation_status = 'FAILED'
       ORDER BY reconciled_at DESC
       LIMIT 100`
    );
    
    return res.status(200).json({ discrepancies: rows, count: rows.length });
  } catch (err) {
    logger.error('GetDiscrepanciesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch discrepancies' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3008;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Payments service listening on ${port}`);
});


