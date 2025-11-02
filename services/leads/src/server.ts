import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger, metricsMiddleware, metricsHandler } from '@los/shared-libs';
import cors from 'cors';

// Ensure DATABASE_URL is set before creating pool
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://los:los@localhost:5432/los';
  console.warn('⚠️  DATABASE_URL not set, using default: postgres://los:los@localhost:5432/los');
}

export const pool = createPgPool();
const logger = createLogger('leads-service');

export const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  maxAge: 86400
};
app.use(cors(corsOptions));

app.use(json());
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/metrics', metricsHandler);

// Initialize schema
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_channel TEXT NOT NULL CHECK (source_channel IN ('Website', 'MobileApp', 'Branch', 'DSA', 'CallCenter', 'Campaign', 'Referral', 'Other')),
        source_reference TEXT,
        first_name TEXT,
        last_name TEXT,
        mobile TEXT NOT NULL,
        email TEXT,
        pan TEXT,
        requested_product_code TEXT,
        requested_amount NUMERIC(15,2),
        lead_status TEXT DEFAULT 'New' CHECK (lead_status IN ('New', 'Contacted', 'Qualified', 'Converted', 'Rejected', 'Lost')),
        assigned_agent_id UUID,
        agency_id UUID,
        conversion_application_id UUID,
        conversion_date TIMESTAMPTZ,
        notes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
      CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(source_channel);
      CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
      CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent_id);
      CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agencies (
        agency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_code TEXT UNIQUE NOT NULL,
        agency_name TEXT NOT NULL,
        contact_person TEXT,
        contact_mobile TEXT,
        contact_email TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        is_active BOOLEAN DEFAULT true,
        validation_status TEXT DEFAULT 'Pending' CHECK (validation_status IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
        validated_by UUID,
        validated_at TIMESTAMPTZ,
        commission_rate NUMERIC(5,2) DEFAULT 0.00,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS idx_agencies_code ON agencies(agency_code);
      CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(validation_status);
      CREATE INDEX IF NOT EXISTS idx_agencies_active ON agencies(is_active);
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_code TEXT UNIQUE NOT NULL,
        agency_id UUID REFERENCES agencies(agency_id),
        first_name TEXT NOT NULL,
        last_name TEXT,
        mobile TEXT NOT NULL,
        email TEXT,
        pan TEXT,
        aadhaar TEXT,
        is_active BOOLEAN DEFAULT true,
        validation_status TEXT DEFAULT 'Pending' CHECK (validation_status IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
        validated_by UUID,
        validated_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      
      CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(agent_code);
      CREATE INDEX IF NOT EXISTS idx_agents_agency ON agents(agency_id);
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(validation_status);
      CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);
    `);
    
    logger.info('SchemaInitialized', {});
  } catch (err) {
    logger.error('SchemaInitError', { error: (err as Error).message });
  }
}

ensureSchema();

// Lead schemas
const CreateLeadSchema = z.object({
  sourceChannel: z.enum(['Website', 'MobileApp', 'Branch', 'DSA', 'CallCenter', 'Campaign', 'Referral', 'Other']),
  sourceReference: z.string().optional(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().max(200).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  requestedProductCode: z.string().optional(),
  requestedAmount: z.number().positive().optional(),
  assignedAgentId: z.string().uuid().optional(),
  agencyId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional()
});

const UpdateLeadSchema = z.object({
  leadStatus: z.enum(['New', 'Contacted', 'Qualified', 'Converted', 'Rejected', 'Lost']).optional(),
  assignedAgentId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional()
});

// Agency schemas
const CreateAgencySchema = z.object({
  agencyCode: z.string().min(3).max(50),
  agencyName: z.string().min(2).max(200),
  contactPerson: z.string().max(200).optional(),
  contactMobile: z.string().regex(/^[6-9]\d{9}$/).optional(),
  contactEmail: z.string().email().optional(),
  addressLine1: z.string().max(500).optional(),
  addressLine2: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional()
});

const ValidateAgencySchema = z.object({
  validationStatus: z.enum(['Approved', 'Rejected', 'Suspended']),
  notes: z.string().max(500).optional()
});

// Agent schemas
const CreateAgentSchema = z.object({
  agentCode: z.string().min(3).max(50),
  agencyId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(200),
  lastName: z.string().max(200).optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().optional(),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).optional(),
  aadhaar: z.string().length(12).optional(),
  metadata: z.record(z.any()).optional()
});

const ValidateAgentSchema = z.object({
  validationStatus: z.enum(['Approved', 'Rejected', 'Suspended']),
  notes: z.string().max(500).optional()
});

// POST /api/leads - create lead (multi-channel capture)
app.post('/api/leads', async (req, res) => {
  const parsed = CreateLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const leadId = uuidv4();
    
    // Validate agent if assigned
    if (parsed.data.assignedAgentId) {
      const { rows: agentRows } = await client.query(
        'SELECT agent_id, validation_status, is_active FROM agents WHERE agent_id = $1',
        [parsed.data.assignedAgentId]
      );
      if (agentRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Assigned agent not found' });
      }
      if (agentRows[0].validation_status !== 'Approved' || !agentRows[0].is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Assigned agent is not approved or inactive' });
      }
    }
    
    // Validate agency if provided
    if (parsed.data.agencyId) {
      const { rows: agencyRows } = await client.query(
        'SELECT agency_id, validation_status, is_active FROM agencies WHERE agency_id = $1',
        [parsed.data.agencyId]
      );
      if (agencyRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Agency not found' });
      }
      if (agencyRows[0].validation_status !== 'Approved' || !agencyRows[0].is_active) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Agency is not approved or inactive' });
      }
    }
    
    await client.query(
      `INSERT INTO leads (
        lead_id, source_channel, source_reference, first_name, last_name, mobile, email, pan,
        requested_product_code, requested_amount, assigned_agent_id, agency_id, notes, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        leadId,
        parsed.data.sourceChannel,
        parsed.data.sourceReference || null,
        parsed.data.firstName,
        parsed.data.lastName || null,
        parsed.data.mobile,
        parsed.data.email || null,
        parsed.data.pan || null,
        parsed.data.requestedProductCode || null,
        parsed.data.requestedAmount || null,
        parsed.data.assignedAgentId || null,
        parsed.data.agencyId || null,
        parsed.data.notes || null,
        JSON.stringify(parsed.data.metadata || {})
      ]
    );

    await client.query('COMMIT');
    
    logger.info('LeadCreated', { leadId, sourceChannel: parsed.data.sourceChannel, correlationId: (req as any).correlationId });
    return res.status(201).json({ leadId, status: 'New' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('CreateLeadError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create lead' });
  } finally {
    client.release();
  }
});

// GET /api/leads - list leads with filters
app.get('/api/leads', async (req, res) => {
  try {
    const { status, channel, agentId, agencyId, page = '1', limit = '20' } = req.query;
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;
    
    if (status) {
      conditions.push(`lead_status = $${paramCount++}`);
      params.push(status);
    }
    if (channel) {
      conditions.push(`source_channel = $${paramCount++}`);
      params.push(channel);
    }
    if (agentId) {
      conditions.push(`assigned_agent_id = $${paramCount++}`);
      params.push(agentId);
    }
    if (agencyId) {
      conditions.push(`agency_id = $${paramCount++}`);
      params.push(agencyId);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);
    
    const query = `
      SELECT lead_id, source_channel, first_name, last_name, mobile, email, 
             lead_status, assigned_agent_id, agency_id, conversion_application_id,
             created_at, updated_at
      FROM leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
    params.push(parseInt(limit as string, 10), offset);
    
    const { rows } = await pool.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
    const countParams = params.slice(0, params.length - 2); // Remove limit and offset
    const { rows: countRows } = await pool.query(countQuery, countParams);
    
    return res.status(200).json({
      leads: rows,
      pagination: {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        total: parseInt(countRows[0].total, 10)
      }
    });
  } catch (err) {
    logger.error('ListLeadsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list leads' });
  }
});

// POST /api/leads/:leadId/convert - convert lead to application
app.post('/api/leads/:leadId/convert', async (req, res) => {
  const { applicationId } = req.body;
  if (!applicationId) {
    return res.status(400).json({ error: 'applicationId is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check lead exists and is in convertible state
    const { rows } = await client.query(
      'SELECT lead_id, lead_status FROM leads WHERE lead_id = $1',
      [req.params.leadId]
    );
    
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    if (rows[0].lead_status === 'Converted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Lead is already converted' });
    }
    
    // Update lead status and conversion details
    await client.query(
      'UPDATE leads SET lead_status = $1, conversion_application_id = $2, conversion_date = now(), updated_at = now() WHERE lead_id = $3',
      ['Converted', applicationId, req.params.leadId]
    );
    
    await client.query('COMMIT');
    
    logger.info('LeadConverted', { leadId: req.params.leadId, applicationId, correlationId: (req as any).correlationId });
    return res.status(200).json({ leadId: req.params.leadId, applicationId, converted: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('ConvertLeadError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to convert lead' });
  } finally {
    client.release();
  }
});

// POST /api/agencies - create agency
app.post('/api/agencies', async (req, res) => {
  const parsed = CreateAgencySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const agencyId = uuidv4();
    
    await pool.query(
      `INSERT INTO agencies (
        agency_id, agency_code, agency_name, contact_person, contact_mobile, contact_email,
        address_line1, address_line2, city, state, pincode, commission_rate, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        agencyId,
        parsed.data.agencyCode,
        parsed.data.agencyName,
        parsed.data.contactPerson || null,
        parsed.data.contactMobile || null,
        parsed.data.contactEmail || null,
        parsed.data.addressLine1 || null,
        parsed.data.addressLine2 || null,
        parsed.data.city || null,
        parsed.data.state || null,
        parsed.data.pincode || null,
        parsed.data.commissionRate || 0,
        JSON.stringify(parsed.data.metadata || {})
      ]
    );
    
    logger.info('AgencyCreated', { agencyId, agencyCode: parsed.data.agencyCode, correlationId: (req as any).correlationId });
    return res.status(201).json({ agencyId, agencyCode: parsed.data.agencyCode, validationStatus: 'Pending' });
  } catch (err: any) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Agency code already exists' });
    }
    logger.error('CreateAgencyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create agency' });
  }
});

// PATCH /api/agencies/:agencyId/validate - validate agency (maker-checker)
app.patch('/api/agencies/:agencyId/validate', async (req, res) => {
  const parsed = ValidateAgencySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
  
  try {
    const { rows } = await pool.query(
      'SELECT agency_id FROM agencies WHERE agency_id = $1',
      [req.params.agencyId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Agency not found' });
    }
    
    await pool.query(
      'UPDATE agencies SET validation_status = $1, validated_by = $2, validated_at = now(), updated_at = now() WHERE agency_id = $3',
      [parsed.data.validationStatus, actorId, req.params.agencyId]
    );
    
    logger.info('AgencyValidated', { agencyId: req.params.agencyId, status: parsed.data.validationStatus, actorId });
    return res.status(200).json({ agencyId: req.params.agencyId, validationStatus: parsed.data.validationStatus });
  } catch (err) {
    logger.error('ValidateAgencyError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to validate agency' });
  }
});

// POST /api/agents - create agent
app.post('/api/agents', async (req, res) => {
  const parsed = CreateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    // Validate agency if provided
    if (parsed.data.agencyId) {
      const { rows } = await pool.query(
        'SELECT agency_id, validation_status FROM agencies WHERE agency_id = $1',
        [parsed.data.agencyId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Agency not found' });
      }
      if (rows[0].validation_status !== 'Approved') {
        return res.status(400).json({ error: 'Agency must be approved before assigning agents' });
      }
    }
    
    const agentId = uuidv4();
    
    await pool.query(
      `INSERT INTO agents (
        agent_id, agent_code, agency_id, first_name, last_name, mobile, email, pan, aadhaar, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        agentId,
        parsed.data.agentCode,
        parsed.data.agencyId || null,
        parsed.data.firstName,
        parsed.data.lastName || null,
        parsed.data.mobile,
        parsed.data.email || null,
        parsed.data.pan || null,
        parsed.data.aadhaar || null,
        JSON.stringify(parsed.data.metadata || {})
      ]
    );
    
    logger.info('AgentCreated', { agentId, agentCode: parsed.data.agentCode, correlationId: (req as any).correlationId });
    return res.status(201).json({ agentId, agentCode: parsed.data.agentCode, validationStatus: 'Pending' });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Agent code already exists' });
    }
    logger.error('CreateAgentError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PATCH /api/agents/:agentId/validate - validate agent (maker-checker)
app.patch('/api/agents/:agentId/validate', async (req, res) => {
  const parsed = ValidateAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
  
  try {
    const { rows } = await pool.query(
      'SELECT agent_id FROM agents WHERE agent_id = $1',
      [req.params.agentId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    await pool.query(
      'UPDATE agents SET validation_status = $1, validated_by = $2, validated_at = now(), updated_at = now() WHERE agent_id = $3',
      [parsed.data.validationStatus, actorId, req.params.agentId]
    );
    
    logger.info('AgentValidated', { agentId: req.params.agentId, status: parsed.data.validationStatus, actorId });
    return res.status(200).json({ agentId: req.params.agentId, validationStatus: parsed.data.validationStatus });
  } catch (err) {
    logger.error('ValidateAgentError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to validate agent' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3017;
app.listen(port, () => {
  logger.info('Leads service listening', { port });
});

