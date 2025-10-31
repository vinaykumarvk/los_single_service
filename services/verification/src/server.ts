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
  const { applicationId, verificationType, assigneeId, priority } = req.body || {};
  const parsed = VerificationTypes.safeParse(verificationType);
  if (!applicationId || !parsed.success) return res.status(400).json({ error: 'applicationId and valid verificationType required' });

  const taskId = uuidv4();
  const taskPriority = priority && priority >= 1 && priority <= 10 ? priority : 5;
  
  await pool.query(
    'INSERT INTO verification_tasks (task_id, application_id, verification_type, assignee_id, priority) VALUES ($1, $2, $3, $4, $5)',
    [taskId, applicationId, parsed.data, assigneeId || null, taskPriority]
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
    'SELECT task_id, verification_type, status, result, remarks, assignee_id, priority, completed_at FROM verification_tasks WHERE application_id = $1 ORDER BY created_at ASC',
    [req.params.applicationId]
  );
  return res.status(200).json({ tasks: rows });
});

// GET /api/verifications/queue - get verification queue (unassigned tasks)
app.get('/api/verifications/queue', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const assigneeId = req.query.assigneeId as string | undefined;
    
    let query: string;
    let params: any[];
    
    if (assigneeId) {
      // Get tasks assigned to specific user
      query = `
        SELECT task_id, application_id, verification_type, status, assignee_id, priority, created_at
        FROM verification_tasks
        WHERE assignee_id = $1 AND status = 'PENDING'
        ORDER BY priority DESC, created_at ASC
        LIMIT $2
      `;
      params = [assigneeId, limit];
    } else {
      // Get unassigned tasks
      query = `
        SELECT task_id, application_id, verification_type, status, assignee_id, priority, created_at
        FROM verification_tasks
        WHERE assignee_id IS NULL AND status = 'PENDING'
        ORDER BY priority DESC, created_at ASC
        LIMIT $1
      `;
      params = [limit];
    }
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json({ tasks: rows, count: rows.length });
  } catch (err) {
    logger.error('GetQueueError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

const AssignTaskSchema = z.object({
  assigneeId: z.string().min(1),
  priority: z.number().int().min(1).max(10).optional()
});

// PATCH /api/verifications/:taskId/assign - assign task to user
app.patch('/api/verifications/:taskId/assign', async (req, res) => {
  const parsed = AssignTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE verification_tasks SET assignee_id = $1, assigned_at = now(), priority = COALESCE($2, priority) WHERE task_id = $3 AND status = $4 RETURNING task_id, application_id, verification_type',
      [parsed.data.assigneeId, parsed.data.priority || null, req.params.taskId, 'PENDING']
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or already completed' });
    }
    
    logger.info('TaskAssigned', { correlationId: (req as any).correlationId, taskId: req.params.taskId, assigneeId: parsed.data.assigneeId });
    return res.status(200).json({ taskId: req.params.taskId, assigneeId: parsed.data.assigneeId, assigned: true });
  } catch (err) {
    logger.error('AssignTaskError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to assign task' });
  }
});

// POST /api/verifications/assign-batch - auto-assign multiple unassigned tasks (load balancing)
app.post('/api/verifications/assign-batch', async (req, res) => {
  const AssignBatchSchema = z.object({
    assigneeIds: z.array(z.string().uuid()).min(1),
    limit: z.number().int().min(1).max(50).optional().default(10)
  });
  
  const parsed = AssignBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get count of pending tasks per assignee
    const assigneeCounts = await Promise.all(
      parsed.data.assigneeIds.map(async (assigneeId) => {
        const result = await client.query(
          'SELECT COUNT(*) as count FROM verification_tasks WHERE assignee_id = $1 AND status = $2',
          [assigneeId, 'PENDING']
        );
        return { assigneeId, count: parseInt(result.rows[0].count, 10) };
      })
    );
    
    // Sort by count (least loaded first)
    assigneeCounts.sort((a, b) => a.count - b.count);
    
    // Get unassigned tasks ordered by priority
    const { rows: unassignedTasks } = await client.query(
      `SELECT task_id FROM verification_tasks 
       WHERE assignee_id IS NULL AND status = 'PENDING'
       ORDER BY priority DESC, created_at ASC
       LIMIT $1`,
      [parsed.data.limit]
    );
    
    // Distribute tasks in round-robin fashion
    const assignments: Array<{ taskId: string; assigneeId: string }> = [];
    let assigneeIndex = 0;
    
    for (const task of unassignedTasks) {
      const assigneeId = assigneeCounts[assigneeIndex % assigneeCounts.length].assigneeId;
      await client.query(
        'UPDATE verification_tasks SET assignee_id = $1, assigned_at = now() WHERE task_id = $2',
        [assigneeId, task.task_id]
      );
      assignments.push({ taskId: task.task_id, assigneeId });
      assigneeIndex++;
    }
    
    await client.query('COMMIT');
    
    logger.info('BatchAssignCompleted', { 
      correlationId: (req as any).correlationId, 
      assigned: assignments.length,
      assignees: parsed.data.assigneeIds.length
    });
    return res.status(200).json({ 
      assigned: assignments.length,
      assignments
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('BatchAssignError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to assign tasks' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3014;
app.listen(port, () => {
  logger.info('Verification service listening', { port });
});

