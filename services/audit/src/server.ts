import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';
import crypto from 'crypto';

const app = express();
const logger = createLogger('audit-service');
app.use(json());
app.use(correlationIdMiddleware);

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

// POST /api/audit - record audit event
app.post('/api/audit', async (req, res) => {
  const { service, eventType, aggregateId, actorId, details } = req.body || {};
  if (!service || !eventType) return res.status(400).json({ error: 'service and eventType required' });
  
  const id = uuidv4();
  const hash = crypto.createHash('sha256').update(JSON.stringify({ id, service, eventType, details })).digest('hex');
  
  await pool.query(
    'INSERT INTO audit_log (id, service, event_type, aggregate_id, actor_id, details, hash) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, service, eventType, aggregateId || null, actorId || null, JSON.stringify(details || {}), hash]
  ).catch((e) => logger.error('AuditInsertError', { error: (e as Error).message }));
  
  logger.info('AuditRecorded', { correlationId: (req as any).correlationId, id, service, eventType });
  return res.status(201).json({ id });
});

// GET /api/audit/:aggregateId - query audit trail
app.get('/api/audit/:aggregateId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, occurred_at, service, event_type, actor_id, details FROM audit_log WHERE aggregate_id = $1 ORDER BY occurred_at ASC',
    [req.params.aggregateId]
  );
  return res.status(200).json({ events: rows });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3012;
app.listen(port, () => {
  logger.info('Audit service listening', { port });
});

