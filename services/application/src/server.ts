import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler } from '@los/shared-libs';

const pool = createPgPool();
const logger = createLogger('application-service');

const app = express();
app.use(json());
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

const CreateApplicationSchema = z.object({
  applicantId: z.string().uuid(),
  channel: z.enum(['Branch', 'DSA', 'Online', 'Mobile']),
  productCode: z.string().min(1),
  requestedAmount: z.number().positive(),
  requestedTenureMonths: z.number().int().positive()
});

// POST /api/applications - create
app.post('/api/applications', async (req, res) => {
  const parsed = CreateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const id = uuidv4();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Persist application
    await client.query(
      'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, parsed.data.applicantId, parsed.data.channel, parsed.data.productCode, parsed.data.requestedAmount, parsed.data.requestedTenureMonths, 'Draft']
    );

    // Write outbox event in same transaction
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, id, 'los.application.ApplicationCreated.v1', 'los.application.ApplicationCreated.v1', JSON.stringify({ applicationId: id, ...parsed.data }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('CreateApplication', { correlationId: (req as any).correlationId, applicationId: id });
    return res.status(201).json({ applicationId: id, status: 'Draft' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CreateApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create application' });
  } finally {
    client.release();
  }
});

// GET /api/applications/:id - fetch
app.get('/api/applications/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status, created_at, updated_at FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Application not found' });
    logger.debug('GetApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id });
    return res.status(200).json(rows[0]);
  } catch (err) {
    logger.error('GetApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// POST /api/applications/:id/submit - submit
app.post('/api/applications/:id/submit', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check current status
    const { rows } = await client.query('SELECT status FROM applications WHERE application_id = $1', [req.params.id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    if (rows[0].status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Application is ${rows[0].status}, cannot submit` });
    }

    // Update status
    await client.query(
      'UPDATE applications SET status = $1, updated_at = now() WHERE application_id = $2',
      ['Submitted', req.params.id]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.application.ApplicationSubmitted.v1', 'los.application.ApplicationSubmitted.v1', JSON.stringify({ applicationId: req.params.id }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('SubmitApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id });
    return res.status(202).json({ applicationId: req.params.id, status: 'Submitted', submitted: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('SubmitApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to submit application' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Application service listening on ${port}`);
});


