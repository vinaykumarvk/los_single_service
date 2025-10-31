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

// GET /api/audit/export - export audit logs (CSV or JSON)
app.get('/api/audit/export', async (req, res) => {
  try {
    const format = (req.query.format as string || 'json').toLowerCase();
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const service = req.query.service as string | undefined;
    const aggregateId = req.query.aggregateId as string | undefined;
    
    // Build WHERE clause
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (startDate) {
      conditions.push(`occurred_at >= $${paramCount++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`occurred_at <= $${paramCount++}`);
      values.push(endDate);
    }
    if (service) {
      conditions.push(`service = $${paramCount++}`);
      values.push(service);
    }
    if (aggregateId) {
      conditions.push(`aggregate_id = $${paramCount++}`);
      values.push(aggregateId);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const { rows } = await pool.query(
      `SELECT id, occurred_at, service, event_type, aggregate_id, actor_id, details, hash 
       FROM audit_log 
       ${whereClause}
       ORDER BY occurred_at ASC
       LIMIT 10000`,
      values
    );
    
    if (format === 'csv') {
      // Generate CSV
      const headers = ['id', 'occurred_at', 'service', 'event_type', 'aggregate_id', 'actor_id', 'details', 'hash'];
      const csvRows = [
        headers.join(','),
        ...rows.map((row: any) => {
          const values = [
            row.id,
            row.occurred_at,
            row.service,
            row.event_type,
            row.aggregate_id || '',
            row.actor_id || '',
            JSON.stringify(row.details).replace(/"/g, '""'), // Escape quotes
            row.hash || ''
          ];
          return values.map(v => `"${v}"`).join(',');
        })
      ];
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-export-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send(csvRows.join('\n'));
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-export-${new Date().toISOString().split('T')[0]}.json"`);
      return res.status(200).json({
        exportedAt: new Date().toISOString(),
        totalRecords: rows.length,
        filters: { startDate, endDate, service, aggregateId },
        events: rows
      });
    }
  } catch (err) {
    logger.error('AuditExportError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// POST /api/audit/archive - archive old audit logs (marks them for archival)
app.post('/api/audit/archive', async (req, res) => {
  try {
    const { beforeDate, dryRun } = req.body || {};
    if (!beforeDate) {
      return res.status(400).json({ error: 'beforeDate required (ISO 8601 format)' });
    }
    
    // In a full implementation, this would move logs to archive storage
    // For now, we'll just query and return what would be archived
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count, MIN(occurred_at) as oldest, MAX(occurred_at) as newest
       FROM audit_log
       WHERE occurred_at < $1`,
      [beforeDate]
    );
    
    const count = parseInt(rows[0].count, 10);
    
    if (dryRun) {
      return res.status(200).json({
        dryRun: true,
        recordsToArchive: count,
        oldestDate: rows[0].oldest,
        newestDate: rows[0].newest,
        beforeDate
      });
    }
    
    // Actual archive implementation would:
    // 1. Export to S3/Cloud Storage
    // 2. Optionally delete from main table (if retention policy allows)
    // 3. Update archive metadata
    
    logger.info('AuditArchiveRequested', { 
      correlationId: (req as any).correlationId,
      recordsToArchive: count,
      beforeDate
    });
    
    return res.status(200).json({
      archived: false, // Placeholder - actual implementation needed
      message: 'Archive functionality requires implementation of archive storage',
      recordsToArchive: count,
      beforeDate
    });
  } catch (err) {
    logger.error('AuditArchiveError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to archive audit logs' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3012;
app.listen(port, () => {
  logger.info('Audit service listening', { port });
});

