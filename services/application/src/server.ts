import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler } from '@los/shared-libs';

import { setupApplicationSSE, broadcastApplicationUpdate } from './sse-handler';

// Export pool and app for testing
// Ensure DATABASE_URL is set before creating pool
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://los:los@localhost:5432/los';
  console.warn('⚠️  DATABASE_URL not set, using default: postgres://los:los@localhost:5432/los');
}
export const pool = createPgPool();
const logger = createLogger('application-service');

export const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

app.use(json());
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

// Helper function to record application history
async function recordHistory(
  applicationId: string,
  eventType: string,
  eventSource: string,
  eventData: any,
  actorId?: string
) {
  try {
    const historyId = uuidv4();
    const userId = actorId || 'system';
    await pool.query(
      `INSERT INTO application_history 
       (history_id, application_id, event_type, event_source, event_data, actor_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [historyId, applicationId, eventType, eventSource, JSON.stringify(eventData), userId]
    );
  } catch (err) {
    logger.error('RecordHistoryError', { error: (err as Error).message, applicationId, eventType });
    // Don't fail the main operation if history recording fails
  }
}

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

const CreateApplicationSchema = z.object({
  applicantId: z.string().uuid(),
  channel: z.enum(['Branch', 'DSA', 'Online', 'Mobile']),
  productCode: z.string().min(1),
  requestedAmount: z.number().positive(),
  requestedTenureMonths: z.number().int().positive()
});

const UpdateApplicationSchema = z.object({
  channel: z.enum(['Branch', 'DSA', 'Online', 'Mobile']).optional(),
  productCode: z.string().min(1).optional(),
  requestedAmount: z.number().positive().optional(),
  requestedTenureMonths: z.number().int().positive().optional()
});

// Helper function to fetch and validate product limits
async function validateProductLimits(productCode: string, requestedAmount: number, requestedTenureMonths: number): Promise<{ valid: boolean; error?: string }> {
  try {
    // Fetch product details from masters service
    const mastersUrl = process.env.MASTERS_SERVICE_URL || 'http://localhost:3004';
    const response = await fetch(`${mastersUrl}/api/masters/products/${productCode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return { valid: false, error: `Product ${productCode} not found` };
      }
      return { valid: false, error: 'Failed to validate product limits' };
    }
    
    const product = await response.json();
    
    // Validate amount limits
    if (requestedAmount < Number(product.min_amount)) {
      return { valid: false, error: `Requested amount ${requestedAmount} is below minimum ${product.min_amount} for product ${productCode}` };
    }
    if (requestedAmount > Number(product.max_amount)) {
      return { valid: false, error: `Requested amount ${requestedAmount} exceeds maximum ${product.max_amount} for product ${productCode}` };
    }
    
    // Validate tenure limits
    if (requestedTenureMonths < product.min_tenure_months) {
      return { valid: false, error: `Requested tenure ${requestedTenureMonths} months is below minimum ${product.min_tenure_months} months for product ${productCode}` };
    }
    if (requestedTenureMonths > product.max_tenure_months) {
      return { valid: false, error: `Requested tenure ${requestedTenureMonths} months exceeds maximum ${product.max_tenure_months} months for product ${productCode}` };
    }
    
    return { valid: true };
  } catch (err) {
    logger.warn('ProductValidationError', { error: (err as Error).message, productCode });
    // If masters service is unavailable, skip validation (fail-open for resilience)
    // In production, you might want to fail-closed instead
    return { valid: true };
  }
}

// POST /api/applications - create
app.post('/api/applications', async (req, res) => {
  const parsed = CreateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  // Validate product limits
  const validation = await validateProductLimits(parsed.data.productCode, parsed.data.requestedAmount, parsed.data.requestedTenureMonths);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
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
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    await recordHistory(id, 'ApplicationCreated', 'application', { ...parsed.data, status: 'Draft' }, actorId);
    
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

// GET /api/applications - list with filters and pagination
app.get('/api/applications', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.query.status) {
      // Support comma-separated statuses for advanced search
      const statuses = (req.query.status as string).split(',').map(s => s.trim());
      if (statuses.length === 1) {
        conditions.push(`status = $${paramCount++}`);
        values.push(statuses[0]);
      } else {
        conditions.push(`status = ANY($${paramCount++})`);
        values.push(statuses);
      }
    }
    if (req.query.channel) {
      conditions.push(`channel = $${paramCount++}`);
      values.push(req.query.channel);
    }
    if (req.query.productCode) {
      conditions.push(`product_code = $${paramCount++}`);
      values.push(req.query.productCode);
    }
    if (req.query.applicantId) {
      conditions.push(`applicant_id = $${paramCount++}`);
      values.push(req.query.applicantId);
    }
    if (req.query.minAmount) {
      conditions.push(`requested_amount >= $${paramCount++}`);
      values.push(parseFloat(req.query.minAmount as string));
    }
    if (req.query.maxAmount) {
      conditions.push(`requested_amount <= $${paramCount++}`);
      values.push(parseFloat(req.query.maxAmount as string));
    }
    // Date range filters
    if (req.query.startDate) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(req.query.startDate);
    }
    if (req.query.endDate) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(req.query.endDate);
    }
    // Search by assigned user
    if (req.query.assignedTo) {
      conditions.push(`assigned_to = $${paramCount++}`);
      values.push(req.query.assignedTo);
    }
    // Search by partial application ID
    if (req.query.applicationIdPattern) {
      conditions.push(`application_id::text LIKE $${paramCount++}`);
      values.push(`%${req.query.applicationIdPattern}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM applications ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated results
    values.push(limit, offset);
    const dataQuery = `
      SELECT 
        application_id, applicant_id, channel, product_code, 
        requested_amount, requested_tenure_months, status, 
        created_at, updated_at 
      FROM applications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    const { rows } = await pool.query(dataQuery, values);

    logger.debug('ListApplications', { 
      correlationId: (req as any).correlationId, 
      page, 
      limit, 
      total,
      filters: req.query 
    });

    return res.status(200).json({
      applications: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    logger.error('ListApplicationsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list applications' });
  }
});

// Helper function to escape CSV values
function escapeCsv(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// GET /api/applications/export - export applications to CSV/Excel
app.get('/api/applications/export', async (req, res) => {
  try {
    const format = (req.query.format as string || 'csv').toLowerCase();
    const maxRecords = Math.min(50000, parseInt(req.query.maxRecords as string || '10000', 10));

    // Build WHERE clause (same logic as GET /api/applications)
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.query.status) {
      // Support comma-separated statuses
      const statuses = (req.query.status as string).split(',').map(s => s.trim());
      if (statuses.length === 1) {
        conditions.push(`status = $${paramCount++}`);
        values.push(statuses[0]);
      } else {
        conditions.push(`status = ANY($${paramCount++})`);
        values.push(statuses);
      }
    }
    if (req.query.channel) {
      conditions.push(`channel = $${paramCount++}`);
      values.push(req.query.channel);
    }
    if (req.query.productCode) {
      conditions.push(`product_code = $${paramCount++}`);
      values.push(req.query.productCode);
    }
    if (req.query.applicantId) {
      conditions.push(`applicant_id = $${paramCount++}`);
      values.push(req.query.applicantId);
    }
    if (req.query.minAmount) {
      conditions.push(`requested_amount >= $${paramCount++}`);
      values.push(parseFloat(req.query.minAmount as string));
    }
    if (req.query.maxAmount) {
      conditions.push(`requested_amount <= $${paramCount++}`);
      values.push(parseFloat(req.query.maxAmount as string));
    }
    // Date range filters
    if (req.query.startDate) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(req.query.startDate);
    }
    if (req.query.endDate) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(req.query.endDate);
    }
    // Status transition filters
    if (req.query.statusAfter) {
      conditions.push(`updated_at >= $${paramCount++}`);
      values.push(req.query.statusAfter);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get all matching records (up to maxRecords)
    const dataQuery = `
      SELECT 
        application_id, applicant_id, channel, product_code, 
        requested_amount, requested_tenure_months, status,
        assigned_to, assigned_at, withdrawn_at, withdrawn_reason,
        created_at, updated_at 
      FROM applications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++}
    `;
    
    values.push(maxRecords);
    const { rows } = await pool.query(dataQuery, values);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Application ID', 'Applicant ID', 'Channel', 'Product Code',
        'Requested Amount', 'Tenure (Months)', 'Status',
        'Assigned To', 'Assigned At', 'Withdrawn At', 'Withdrawn Reason',
        'Created At', 'Updated At'
      ];
      
      const csvRows = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row: any) => [
          row.application_id,
          row.applicant_id,
          row.channel,
          row.product_code,
          row.requested_amount,
          row.requested_tenure_months,
          row.status,
          row.assigned_to || '',
          row.assigned_at || '',
          row.withdrawn_at || '',
          row.withdrawn_reason || '',
          row.created_at,
          row.updated_at
        ].map(escapeCsv).join(','))
      ];
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="applications-export-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.status(200).send('\uFEFF' + csvRows.join('\n')); // BOM for Excel UTF-8 support
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="applications-export-${new Date().toISOString().split('T')[0]}.json"`);
      return res.status(200).json({
        exportedAt: new Date().toISOString(),
        totalRecords: rows.length,
        filters: req.query,
        applications: rows
      });
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use "csv" or "json"' });
    }
  } catch (err) {
    logger.error('ExportApplicationsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to export applications' });
  }
});

// GET /api/applications/:id/events - SSE stream for real-time updates
app.get('/api/applications/:id/events', (req, res) => {
  setupApplicationSSE(req, res, pool);
});

// GET /api/applications/:id - fetch
app.get('/api/applications/:id', async (req, res) => {
  try {
    // Validate UUID format before querying database
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.id)) {
      return res.status(400).json({ error: 'Invalid UUID format' });
    }
    
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

// PATCH /api/applications/:id - update application (only when status is Draft)
app.patch('/api/applications/:id', async (req, res) => {
  const parsed = UpdateApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check current status - only allow updates for Draft applications
    const { rows } = await client.query(
      'SELECT status, product_code, requested_amount, requested_tenure_months FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    if (rows[0].status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Application is ${rows[0].status}, cannot update. Only Draft applications can be updated.` });
    }

    // Validate product limits if amount or tenure is being updated
    const amountToValidate = parsed.data.requestedAmount !== undefined ? parsed.data.requestedAmount : Number(rows[0].requested_amount);
    const tenureToValidate = parsed.data.requestedTenureMonths !== undefined ? parsed.data.requestedTenureMonths : rows[0].requested_tenure_months;
    const productCodeToValidate = parsed.data.productCode !== undefined ? parsed.data.productCode : rows[0].product_code;
    
    const validation = await validateProductLimits(productCodeToValidate, amountToValidate, tenureToValidate);
    if (!validation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: validation.error });
    }

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (parsed.data.channel !== undefined) {
      updates.push(`channel = $${paramCount++}`);
      values.push(parsed.data.channel);
    }
    if (parsed.data.productCode !== undefined) {
      updates.push(`product_code = $${paramCount++}`);
      values.push(parsed.data.productCode);
    }
    if (parsed.data.requestedAmount !== undefined) {
      updates.push(`requested_amount = $${paramCount++}`);
      values.push(parsed.data.requestedAmount);
    }
    if (parsed.data.requestedTenureMonths !== undefined) {
      updates.push(`requested_tenure_months = $${paramCount++}`);
      values.push(parsed.data.requestedTenureMonths);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = now()`);
    values.push(req.params.id);

    await client.query(
      `UPDATE applications SET ${updates.join(', ')} WHERE application_id = $${paramCount++}`,
      values
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.application.ApplicationUpdated.v1', 'los.application.ApplicationUpdated.v1', JSON.stringify({ applicationId: req.params.id, updates: parsed.data }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    await recordHistory(req.params.id, 'ApplicationUpdated', 'application', { updates: parsed.data }, actorId);
    
    logger.info('UpdateApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id, updates: parsed.data });
    return res.status(200).json({ applicationId: req.params.id, updated: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('UpdateApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to update application' });
  } finally {
    client.release();
  }
});

// GET /api/applications/:id/timeline - get complete application history/timeline
app.get('/api/applications/:id/timeline', async (req, res) => {
  try {
    // Check application exists
    const appCheck = await pool.query('SELECT application_id FROM applications WHERE application_id = $1', [req.params.id]);
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get history from application_history table
    const historyResult = await pool.query(
      `SELECT 
         history_id, event_type, event_source, event_data, actor_id, occurred_at
       FROM application_history 
       WHERE application_id = $1 
       ORDER BY occurred_at ASC`,
      [req.params.id]
    );

    // Optionally get audit log entries (if audit service uses same database)
    let auditEvents: any[] = [];
    try {
      const auditResult = await pool.query(
        `SELECT 
           id, occurred_at, service, event_type, actor_id, details
         FROM audit_log 
         WHERE aggregate_id = $1 
         ORDER BY occurred_at ASC`,
        [req.params.id]
      );
      auditEvents = auditResult.rows.map(row => ({
        history_id: row.id,
        event_type: row.event_type,
        event_source: row.service || 'audit',
        event_data: row.details,
        actor_id: row.actor_id,
        occurred_at: row.occurred_at
      }));
    } catch (err) {
      // Audit table might not exist in same schema, ignore
      logger.debug('AuditQuerySkipped', { error: (err as Error).message });
    }

    // Get outbox events for status changes (optional enrichment)
    let outboxEvents: any[] = [];
    try {
      const outboxResult = await pool.query(
        `SELECT 
           id, event_type, payload, occurred_at
         FROM outbox 
         WHERE aggregate_id = $1 AND published_at IS NOT NULL
         ORDER BY occurred_at ASC`,
        [req.params.id]
      );
      outboxEvents = outboxResult.rows.map(row => ({
        history_id: row.id,
        event_type: row.event_type,
        event_source: 'event',
        event_data: row.payload,
        actor_id: null,
        occurred_at: row.occurred_at
      }));
    } catch (err) {
      logger.debug('OutboxQuerySkipped', { error: (err as Error).message });
    }

    // Combine all events and sort chronologically
    const allEvents = [
      ...historyResult.rows,
      ...auditEvents,
      ...outboxEvents
    ].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

    // Group by date for better presentation
    const timelineByDate: Record<string, any[]> = {};
    allEvents.forEach(event => {
      const date = new Date(event.occurred_at).toISOString().split('T')[0];
      if (!timelineByDate[date]) {
        timelineByDate[date] = [];
      }
      timelineByDate[date].push(event);
    });

    logger.debug('GetTimeline', { 
      correlationId: (req as any).correlationId, 
      applicationId: req.params.id,
      totalEvents: allEvents.length
    });

    return res.status(200).json({
      applicationId: req.params.id,
      timeline: allEvents,
      timelineByDate,
      summary: {
        totalEvents: allEvents.length,
        eventsBySource: allEvents.reduce((acc: Record<string, number>, event: any) => {
          acc[event.event_source] = (acc[event.event_source] || 0) + 1;
          return acc;
        }, {}),
        firstEvent: allEvents[0]?.occurred_at || null,
        lastEvent: allEvents[allEvents.length - 1]?.occurred_at || null
      }
    });
  } catch (err) {
    logger.error('GetTimelineError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch timeline' });
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
    
    // Broadcast SSE update
    broadcastApplicationUpdate(req.params.id, 'status', { applicationId: req.params.id, status: 'Submitted' });
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    await recordHistory(req.params.id, 'ApplicationSubmitted', 'application', { status: 'Submitted' }, actorId);
    
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

const WithdrawApplicationSchema = z.object({
  reason: z.string().min(10).max(500).optional()
});

// POST /api/applications/:id/withdraw - withdraw/cancel application
app.post('/api/applications/:id/withdraw', async (req, res) => {
  const parsed = WithdrawApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check current status - only allow withdrawal from certain statuses
    const { rows } = await client.query(
      'SELECT status FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const currentStatus = rows[0].status;
    // Allow withdrawal from Draft, Submitted, and UnderReview statuses
    // Disallow from Withdrawn, Approved, Rejected, Disbursed
    const withdrawableStatuses = ['Draft', 'Submitted', 'UnderReview'];
    if (!withdrawableStatuses.includes(currentStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Application is ${currentStatus}, cannot withdraw. Only Draft, Submitted, or UnderReview applications can be withdrawn.` 
      });
    }

    // Update status and withdrawal fields
    await client.query(
      'UPDATE applications SET status = $1, withdrawn_at = now(), withdrawn_reason = $2, updated_at = now() WHERE application_id = $3',
      ['Withdrawn', parsed.data.reason || null, req.params.id]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.application.ApplicationWithdrawn.v1', 'los.application.ApplicationWithdrawn.v1', JSON.stringify({ applicationId: req.params.id, reason: parsed.data.reason }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    await recordHistory(req.params.id, 'ApplicationWithdrawn', 'application', { 
      status: 'Withdrawn', 
      reason: parsed.data.reason,
      previousStatus: currentStatus
    }, actorId);
    
    logger.info('WithdrawApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id, reason: parsed.data.reason });
    return res.status(200).json({ 
      applicationId: req.params.id, 
      status: 'Withdrawn', 
      withdrawn: true,
      withdrawnAt: new Date().toISOString()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('WithdrawApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to withdraw application' });
  } finally {
    client.release();
  }
});

const AssignApplicationSchema = z.object({
  assignedTo: z.string().uuid()
});

// PATCH /api/applications/:id/assign - assign application to maker/checker
app.patch('/api/applications/:id/assign', async (req, res) => {
  const parsed = AssignApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check application exists
    const { rows } = await client.query(
      'SELECT status, assigned_to FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Don't allow assignment if already withdrawn or disbursed
    const finalStatuses = ['Withdrawn', 'Disbursed', 'Closed'];
    if (finalStatuses.includes(rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Application is ${rows[0].status}, cannot assign.` });
    }

    // Update assignment
    await client.query(
      'UPDATE applications SET assigned_to = $1, assigned_at = now(), updated_at = now() WHERE application_id = $2',
      [parsed.data.assignedTo, req.params.id]
    );

    // Write outbox event
    const eventId = uuidv4();
    const previousAssignee = rows[0].assigned_to || null;
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.application.ApplicationAssigned.v1', 'los.application.ApplicationAssigned.v1', JSON.stringify({ applicationId: req.params.id, assignedTo: parsed.data.assignedTo, previousAssignee }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    await recordHistory(req.params.id, 'ApplicationAssigned', 'application', { 
      assignedTo: parsed.data.assignedTo,
      previousAssignee,
      assignedBy: actorId
    }, actorId);
    
    logger.info('AssignApplication', { correlationId: (req as any).correlationId, applicationId: req.params.id, assignedTo: parsed.data.assignedTo });
    return res.status(200).json({ 
      applicationId: req.params.id, 
      assignedTo: parsed.data.assignedTo,
      assignedAt: new Date().toISOString()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('AssignApplicationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to assign application' });
  } finally {
    client.release();
  }
});

const NoteSchema = z.object({
  noteText: z.string().min(1).max(2000)
});

// POST /api/applications/:id/notes - add note to application
app.post('/api/applications/:id/notes', async (req, res) => {
  const parsed = NoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check application exists
    const { rows } = await client.query(
      'SELECT application_id FROM applications WHERE application_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Application not found' });
    }

    // Insert note
    const noteId = uuidv4();
    const createdBy = (req as any).user?.id || (req as any).user?.sub || 'system';
    await client.query(
      'INSERT INTO application_notes (note_id, application_id, note_text, created_by) VALUES ($1, $2, $3, $4)',
      [noteId, req.params.id, parsed.data.noteText, createdBy]
    );

    await client.query('COMMIT');
    
    // Record history (non-blocking)
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    await recordHistory(req.params.id, 'NoteAdded', 'application', { 
      noteId,
      noteText: parsed.data.noteText,
      createdBy: actorId
    }, actorId);
    
    logger.info('AddNote', { correlationId: (req as any).correlationId, applicationId: req.params.id, noteId });
    return res.status(201).json({ 
      noteId, 
      applicationId: req.params.id,
      noteText: parsed.data.noteText,
      createdBy,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('AddNoteError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to add note' });
  } finally {
    client.release();
  }
});

// GET /api/applications/:id/notes - get all notes for application
app.get('/api/applications/:id/notes', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT note_id, application_id, note_text, created_by, created_at, updated_at FROM application_notes WHERE application_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    
    logger.debug('GetNotes', { correlationId: (req as any).correlationId, applicationId: req.params.id, count: rows.length });
    return res.status(200).json({ notes: rows });
  } catch (err) {
    logger.error('GetNotesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

const BulkCreateSchema = z.object({
  applications: z.array(CreateApplicationSchema).min(1).max(100) // Limit bulk operations
});

// POST /api/applications/bulk - bulk create applications
app.post('/api/applications/bulk', async (req, res) => {
  const parsed = BulkCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  const results: Array<{ applicationId: string; status: string; error?: string }> = [];
  
  try {
    await client.query('BEGIN');
    
    for (const appData of parsed.data.applications) {
      try {
        // Validate product limits for each application
        const validation = await validateProductLimits(appData.productCode, appData.requestedAmount, appData.requestedTenureMonths);
        if (!validation.valid) {
          results.push({ applicationId: '', status: 'Failed', error: validation.error });
          continue;
        }

        const id = uuidv4();
        await client.query(
          'INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [id, appData.applicantId, appData.channel, appData.productCode, appData.requestedAmount, appData.requestedTenureMonths, 'Draft']
        );

        const eventId = uuidv4();
        await client.query(
          'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
          [eventId, id, 'los.application.ApplicationCreated.v1', 'los.application.ApplicationCreated.v1', JSON.stringify({ applicationId: id, ...appData }), JSON.stringify({ correlationId: (req as any).correlationId })]
        );

        results.push({ applicationId: id, status: 'Draft' });
      } catch (err) {
        results.push({ applicationId: '', status: 'Failed', error: (err as Error).message });
      }
    }

    await client.query('COMMIT');
    logger.info('BulkCreateApplications', { correlationId: (req as any).correlationId, count: parsed.data.applications.length, success: results.filter(r => r.status !== 'Failed').length });
    return res.status(201).json({ 
      results,
      total: parsed.data.applications.length,
      success: results.filter(r => r.status !== 'Failed').length,
      failed: results.filter(r => r.status === 'Failed').length
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('BulkCreateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create applications' });
  } finally {
    client.release();
  }
});

// Only start server if this file is run directly (not imported for tests)
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  app.listen(port, () => {
    logger.info('ApplicationServiceStarted', { port });
  });
}


