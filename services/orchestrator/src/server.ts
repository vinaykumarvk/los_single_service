import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';
import { createKafka, startConsumer } from './kafka';

const app = express();
app.use(json());
app.use(correlationIdMiddleware);
const pool = createPgPool();
const logger = createLogger('orchestrator-service');

app.get('/health', (_req, res) => res.status(200).send('OK'));

// Dev-only: inject events to drive saga
app.post('/dev/events', async (req, res) => {
  const { type, payload } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });

  // Very basic state machine to illustrate flow
  // In production, subscribe to Kafka and handle events with durable state
  if (type === 'los.application.ApplicationSubmitted.v1') {
    const sagaId = uuidv4();
    await pool.query(
      'INSERT INTO saga_instances (saga_id, application_id, state) VALUES ($1, $2, $3) ON CONFLICT (saga_id) DO NOTHING',
      [sagaId, payload?.applicationId, 'KYC_REQUESTED']
    );
    await pool.query('INSERT INTO saga_logs (id, saga_id, step, detail) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      sagaId,
      'ApplicationSubmitted',
      JSON.stringify(payload || {})
    ]);
    // Next commands would be: start KYC, bureau pull, etc.
    return res.status(202).json({ sagaId, next: ['StartKYC', 'BureauPull'] });
  }

  if (type === 'los.kyc.KycCompleted.v1') {
    // Update state to VERIFICATION_COMPLETE (simplified)
    await pool.query('UPDATE saga_instances SET state = $1, updated_at = now() WHERE application_id = $2', [
      'VERIFICATION_COMPLETE',
      payload?.applicationId,
    ]);
    await pool.query('INSERT INTO saga_logs (id, saga_id, step, detail) SELECT $1, saga_id, $2, $3 FROM saga_instances WHERE application_id = $4', [
      uuidv4(),
      'KycCompleted',
      JSON.stringify(payload || {}),
      payload?.applicationId,
    ]);
    return res.status(202).json({ next: ['Underwrite'] });
  }

  if (type === 'los.underwriting.DecisionMade.v1') {
    await pool.query('UPDATE saga_instances SET state = $1, updated_at = now() WHERE application_id = $2', [
      payload?.finalDecision === 'APPROVED' ? 'SANCTION' : 'REJECTED',
      payload?.applicationId,
    ]);
    await pool.query('INSERT INTO saga_logs (id, saga_id, step, detail) SELECT $1, saga_id, $2, $3 FROM saga_instances WHERE application_id = $4', [
      uuidv4(),
      'DecisionMade',
      JSON.stringify(payload || {}),
      payload?.applicationId,
    ]);
    return res.status(202).json({ next: payload?.finalDecision === 'APPROVED' ? ['IssueSanction'] : [] });
  }

  return res.status(202).json({ ignored: type });
});

// GET /api/sagas/:applicationId - get saga instance for application
app.get('/api/sagas/:applicationId', async (req, res) => {
  try {
    const { rows: instances } = await pool.query(
      'SELECT * FROM saga_instances WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.applicationId]
    );
    
    if (instances.length === 0) {
      return res.status(404).json({ error: 'Saga instance not found' });
    }
    
    const saga = instances[0];
    
    // Get all steps/logs for this saga
    const { rows: logs } = await pool.query(
      'SELECT * FROM saga_logs WHERE saga_id = $1 ORDER BY created_at ASC',
      [saga.saga_id]
    );
    
    return res.status(200).json({
      sagaId: saga.saga_id,
      applicationId: saga.application_id,
      state: saga.state,
      currentStep: saga.current_step,
      stepStatus: saga.step_status,
      sagaType: saga.saga_type,
      metadata: saga.metadata,
      createdAt: saga.created_at,
      updatedAt: saga.updated_at,
      completedAt: saga.completed_at,
      failedAt: saga.failed_at,
      errorMessage: saga.error_message,
      steps: logs.map(log => ({
        step: log.step,
        status: log.step_status,
        detail: log.detail,
        durationMs: log.duration_ms,
        errorMessage: log.error_message,
        occurredAt: log.created_at
      }))
    });
  } catch (err) {
    logger.error('GetSagaError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch saga' });
  }
});

// GET /api/sagas/:applicationId/timeline - get visual timeline of saga steps
app.get('/api/sagas/:applicationId/timeline', async (req, res) => {
  try {
    const { rows: instances } = await pool.query(
      'SELECT saga_id FROM saga_instances WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.params.applicationId]
    );
    
    if (instances.length === 0) {
      return res.status(404).json({ error: 'Saga instance not found' });
    }
    
    const sagaId = instances[0].saga_id;
    
    // Get all steps with timing information
    const { rows: logs } = await pool.query(
      `SELECT 
         step, step_status, detail, duration_ms, error_message, created_at,
         LAG(created_at) OVER (ORDER BY created_at) as previous_step_at
       FROM saga_logs 
       WHERE saga_id = $1 
       ORDER BY created_at ASC`,
      [sagaId]
    );
    
    // Calculate step durations and build timeline
    const timeline = logs.map((log, index) => {
      const stepStart = log.previous_step_at || log.created_at;
      const stepEnd = log.created_at;
      const duration = log.duration_ms || 
        (stepStart && stepEnd ? 
          Math.max(0, new Date(stepEnd).getTime() - new Date(stepStart).getTime()) : 
          null);
      
      return {
        step: log.step,
        status: log.step_status || 'COMPLETED',
        startedAt: stepStart,
        completedAt: log.created_at,
        durationMs: duration,
        errorMessage: log.error_message,
        detail: log.detail
      };
    });
    
    return res.status(200).json({
      sagaId,
      applicationId: req.params.applicationId,
      timeline,
      totalSteps: timeline.length,
      totalDurationMs: timeline.reduce((sum, step) => sum + (step.durationMs || 0), 0),
      currentStep: timeline[timeline.length - 1]?.step,
      status: timeline.every(s => s.status === 'COMPLETED') ? 'COMPLETED' : 
              timeline.some(s => s.status === 'FAILED') ? 'FAILED' : 'IN_PROGRESS'
    });
  } catch (err) {
    logger.error('GetSagaTimelineError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch saga timeline' });
  }
});

// GET /api/sagas - list all saga instances with filters
app.get('/api/sagas', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.query.state) {
      conditions.push(`state = $${paramCount++}`);
      values.push(req.query.state);
    }
    if (req.query.stepStatus) {
      conditions.push(`step_status = $${paramCount++}`);
      values.push(req.query.stepStatus);
    }
    if (req.query.applicationId) {
      conditions.push(`application_id = $${paramCount++}`);
      values.push(req.query.applicationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const countQuery = `SELECT COUNT(*) as total FROM saga_instances ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT saga_id, application_id, state, current_step, step_status, saga_type, 
              created_at, updated_at, completed_at, failed_at
       FROM saga_instances 
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    );
    
    return res.status(200).json({
      sagas: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    logger.error('ListSagasError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list sagas' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator service listening on ${port}`);
});

// Start Kafka consumer if configured
const kafka = createKafka();
if (kafka) {
  // eslint-disable-next-line no-console
  console.log('Kafka detected, starting consumer...');
  startConsumer(kafka).catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Kafka consumer error', e);
  });
}


