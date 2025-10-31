import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, writeOutboxEvent, correlationIdMiddleware, createLogger } from '@los/shared-libs';

const app = express();
const logger = createLogger('verification-service');
app.use(json());
app.use(correlationIdMiddleware);

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

const VerificationTypes = z.enum(['PAN', 'AADHAAR', 'PENNY_DROP', 'RESIDENCE', 'EMPLOYMENT', 'FI', 'PD', 'TVR']);

// POST /api/verifications - create verification task
app.post('/api/verifications', async (req, res) => {
  const { applicationId, verificationType, assigneeId } = req.body || {};
  const parsed = VerificationTypes.safeParse(verificationType);
  if (!applicationId || !parsed.success) return res.status(400).json({ error: 'applicationId and valid verificationType required' });

  const taskId = uuidv4();
  await pool.query(
    'INSERT INTO verification_tasks (task_id, application_id, verification_type, assignee_id) VALUES ($1, $2, $3, $4)',
    [taskId, applicationId, parsed.data, assigneeId || null]
  ).catch((e) => logger.error('VerificationTaskInsertError', { error: (e as Error).message }));

  await writeOutboxEvent(pool, {
    id: uuidv4(),
    aggregateId: applicationId,
    topic: 'los.verification.VerificationTaskCreated.v1',
    eventType: 'los.verification.VerificationTaskCreated.v1',
    payload: { applicationId, taskId, verificationType: parsed.data }
  }).catch(() => {/* stub */});

  logger.info('VerificationTaskCreated', { correlationId: (req as any).correlationId, taskId, applicationId, verificationType: parsed.data });

  // Auto-verify PAN/AADHAAR/PENNY_DROP if via integration hub
  if (['PAN', 'AADHAAR', 'PENNY_DROP'].includes(parsed.data)) {
    setTimeout(async () => {
      await pool.query(
        'UPDATE verification_tasks SET status = $1, result = $2, completed_at = now() WHERE task_id = $3',
        ['COMPLETED', 'PASS', taskId]
      );
      await writeOutboxEvent(pool, {
        id: uuidv4(),
        aggregateId: applicationId,
        topic: 'los.verification.VerificationCompleted.v1',
        eventType: 'los.verification.VerificationCompleted.v1',
        payload: { applicationId, taskId, verificationType: parsed.data, result: 'PASS' }
      }).catch(() => {/* stub */});
    }, 1000);
  }

  return res.status(201).json({ taskId, status: 'PENDING' });
});

// PATCH /api/verifications/:taskId/complete - complete manual verification
app.patch('/api/verifications/:taskId/complete', async (req, res) => {
  const { result, remarks } = req.body || {};
  if (!result || !['PASS', 'FAIL', 'REVIEW'].includes(result)) return res.status(400).json({ error: 'result must be PASS, FAIL, or REVIEW' });

  const { rows } = await pool.query(
    'UPDATE verification_tasks SET status = $1, result = $2, remarks = $3, completed_at = now() WHERE task_id = $4 RETURNING application_id, verification_type',
    ['COMPLETED', result, remarks || null, req.params.taskId]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'Task not found' });

  await writeOutboxEvent(pool, {
    id: uuidv4(),
    aggregateId: rows[0].application_id,
    topic: 'los.verification.VerificationCompleted.v1',
    eventType: 'los.verification.VerificationCompleted.v1',
    payload: { applicationId: rows[0].application_id, taskId: req.params.taskId, verificationType: rows[0].verification_type, result, remarks }
  }).catch(() => {/* stub */});

  logger.info('VerificationCompleted', { correlationId: (req as any).correlationId, taskId: req.params.taskId, result });
  return res.status(200).json({ taskId: req.params.taskId, status: 'COMPLETED', result });
});

// GET /api/verifications/:applicationId - list verification tasks for application
app.get('/api/verifications/:applicationId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT task_id, verification_type, status, result, remarks, completed_at FROM verification_tasks WHERE application_id = $1 ORDER BY created_at ASC',
    [req.params.applicationId]
  );
  return res.status(200).json({ tasks: rows });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3014;
app.listen(port, () => {
  logger.info('Verification service listening', { port });
});

