import express, { Request, Response } from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool } from '@los/shared-libs';

const app = express();
app.use(json());

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

// GET /api/masters/products - list all products
app.get('/api/masters/products', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at FROM products ORDER BY product_code'
    );
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/masters/products/:productCode - get product by code
app.get('/api/masters/products/:productCode', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at FROM products WHERE product_code = $1',
      [req.params.productCode]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/masters/calendar/holidays - add business holiday
app.post('/api/masters/calendar/holidays', async (req: Request, res: Response) => {
  try {
    const { holidayDate, holidayName, holidayType, applicableStates } = req.body || {};
    if (!holidayDate || !holidayName || !holidayType) {
      return res.status(400).json({ error: 'holidayDate, holidayName, and holidayType required' });
    }
    
    const holidayId = uuidv4();
    await pool.query(
      'INSERT INTO business_calendar (holiday_id, holiday_date, holiday_name, holiday_type, applicable_states) VALUES ($1, $2, $3, $4, $5)',
      [holidayId, holidayDate, holidayName, holidayType, applicableStates ? JSON.stringify(applicableStates) : null]
    );
    
    return res.status(201).json({ holidayId, holidayDate, holidayName });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// GET /api/masters/calendar/is-business-day - check if date is a business day
app.get('/api/masters/calendar/is-business-day', async (req, res) => {
  try {
    const date = req.query.date as string;
    const state = req.query.state as string | undefined;
    
    if (!date) {
      return res.status(400).json({ error: 'date parameter required (YYYY-MM-DD)' });
    }
    
    // Check if date is a weekend (Saturday = 6, Sunday = 0)
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check if date is a holiday
    let holidayQuery = `
      SELECT holiday_id, holiday_name, holiday_type
      FROM business_calendar
      WHERE holiday_date = $1 AND is_active = true
    `;
    const queryParams: any[] = [date];
    
    if (state) {
      holidayQuery += ` AND (applicable_states IS NULL OR $2 = ANY(applicable_states))`;
      queryParams.push(state);
    } else {
      holidayQuery += ` AND (applicable_states IS NULL OR holiday_type = 'NATIONAL' OR holiday_type = 'BANK')`;
    }
    
    const { rows: holidays } = await pool.query(holidayQuery, queryParams);
    const isHoliday = holidays.length > 0;
    
    const isBusinessDay = !isWeekend && !isHoliday;
    
    return res.status(200).json({
      date,
      isBusinessDay,
      isWeekend,
      isHoliday,
      holidays: holidays.map(h => ({ name: h.holiday_name, type: h.holiday_type }))
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check business day' });
  }
});

// GET /api/masters/calendar/holidays - list holidays
app.get('/api/masters/calendar/holidays', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const state = req.query.state as string | undefined;
    
    let query = `
      SELECT holiday_id, holiday_date, holiday_name, holiday_type, applicable_states
      FROM business_calendar
      WHERE is_active = true
      AND EXTRACT(YEAR FROM holiday_date) = $1
    `;
    const queryParams: any[] = [year];
    
    if (state) {
      query += ` AND (applicable_states IS NULL OR $2 = ANY(applicable_states))`;
      queryParams.push(state);
    }
    
    query += ` ORDER BY holiday_date ASC`;
    
    const { rows } = await pool.query(query, queryParams);
    return res.status(200).json({ holidays: rows, year });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// POST /api/masters/blacklist - add entry to blacklist
app.post('/api/masters/blacklist', async (req, res) => {
  try {
    const { entityType, entityValue, reason, source, expiresAt } = req.body || {};
    if (!entityType || !entityValue || !reason) {
      return res.status(400).json({ error: 'entityType, entityValue, and reason required' });
    }
    
    const { addToBlacklist } = await import('@los/shared-libs');
    const entryId = await addToBlacklist(entityType, entityValue, reason, source, expiresAt ? new Date(expiresAt) : undefined);
    
    return res.status(201).json({ entryId, entityType, entityValue });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add blacklist entry' });
  }
});

// POST /api/masters/whitelist - add entry to whitelist
app.post('/api/masters/whitelist', async (req, res) => {
  try {
    const { entityType, entityValue, reason, source, expiresAt } = req.body || {};
    if (!entityType || !entityValue) {
      return res.status(400).json({ error: 'entityType and entityValue required' });
    }
    
    const { addToWhitelist } = await import('@los/shared-libs');
    const entryId = await addToWhitelist(entityType, entityValue, reason, source, expiresAt ? new Date(expiresAt) : undefined);
    
    return res.status(201).json({ entryId, entityType, entityValue });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add whitelist entry' });
  }
});

// GET /api/masters/blacklist/check - check if entity is blacklisted
app.get('/api/masters/blacklist/check', async (req, res) => {
  try {
    const { entityType, entityValue } = req.query;
    if (!entityType || !entityValue) {
      return res.status(400).json({ error: 'entityType and entityValue query parameters required' });
    }
    
    const { checkBlacklistWhitelist } = await import('@los/shared-libs');
    const result = await checkBlacklistWhitelist(entityType as any, entityValue as string);
    
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check blacklist' });
  }
});

// ==================== RATES MATRICES ====================

// POST /api/masters/rates - create rate matrix
app.post('/api/masters/rates', async (req: Request, res: Response) => {
  try {
    const { productCode, rateType, interestRate, effectiveFrom, effectiveUntil, minAmount, maxAmount, minTenureMonths, maxTenureMonths, applicableChannels, applicableStates } = req.body || {};
    
    if (!productCode || !rateType || !interestRate || !effectiveFrom) {
      return res.status(400).json({ error: 'productCode, rateType, interestRate, and effectiveFrom are required' });
    }
    
    const rateMatrixId = uuidv4();
    await pool.query(
      `INSERT INTO rate_matrices (
        rate_matrix_id, product_code, rate_type, interest_rate, effective_from, effective_until,
        min_amount, max_amount, min_tenure_months, max_tenure_months, applicable_channels, applicable_states
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        rateMatrixId, productCode, rateType, interestRate, effectiveFrom, effectiveUntil || null,
        minAmount || null, maxAmount || null, minTenureMonths || null, maxTenureMonths || null,
        applicableChannels ? JSON.stringify(applicableChannels) : null,
        applicableStates ? JSON.stringify(applicableStates) : null
      ]
    );
    
    return res.status(201).json({ rateMatrixId, productCode, rateType, interestRate });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Rate matrix with same product, type, and effective date already exists' });
    }
    return res.status(500).json({ error: 'Failed to create rate matrix' });
  }
});

// GET /api/masters/rates - list rates with filters
app.get('/api/masters/rates', async (req: Request, res: Response) => {
  try {
    const { productCode, rateType, effectiveDate } = req.query;
    
    let query = 'SELECT * FROM rate_matrices WHERE is_active = true';
    const params: any[] = [];
    let paramCount = 1;
    
    if (productCode) {
      query += ` AND product_code = $${paramCount++}`;
      params.push(productCode);
    }
    if (rateType) {
      query += ` AND rate_type = $${paramCount++}`;
      params.push(rateType);
    }
    if (effectiveDate) {
      query += ` AND effective_from <= $${paramCount++} AND (effective_until IS NULL OR effective_until >= $${paramCount})`;
      params.push(effectiveDate, effectiveDate);
      paramCount++;
    }
    
    query += ' ORDER BY effective_from DESC';
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// ==================== CHARGES ====================

// POST /api/masters/charges - create charge
app.post('/api/masters/charges', async (req: Request, res: Response) => {
  try {
    const { chargeCode, chargeName, chargeType, calculationMethod, fixedAmount, percentageRate, minCharge, maxCharge, applicableToProducts, applicableChannels, applicableStates, effectiveFrom, effectiveUntil } = req.body || {};
    
    if (!chargeCode || !chargeName || !chargeType || !calculationMethod || !effectiveFrom) {
      return res.status(400).json({ error: 'chargeCode, chargeName, chargeType, calculationMethod, and effectiveFrom are required' });
    }
    
    const chargeId = uuidv4();
    await pool.query(
      `INSERT INTO charges (
        charge_id, charge_code, charge_name, charge_type, calculation_method,
        fixed_amount, percentage_rate, min_charge, max_charge,
        applicable_to_products, applicable_channels, applicable_states,
        effective_from, effective_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        chargeId, chargeCode, chargeName, chargeType, calculationMethod,
        fixedAmount || null, percentageRate || null, minCharge || null, maxCharge || null,
        applicableToProducts ? JSON.stringify(applicableToProducts) : null,
        applicableChannels ? JSON.stringify(applicableChannels) : null,
        applicableStates ? JSON.stringify(applicableStates) : null,
        effectiveFrom, effectiveUntil || null
      ]
    );
    
    return res.status(201).json({ chargeId, chargeCode, chargeName });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Charge code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create charge' });
  }
});

// GET /api/masters/charges - list charges
app.get('/api/masters/charges', async (req: Request, res: Response) => {
  try {
    const { chargeType, productCode, channel } = req.query;
    
    let query = 'SELECT * FROM charges WHERE is_active = true';
    const params: any[] = [];
    let paramCount = 1;
    
    if (chargeType) {
      query += ` AND charge_type = $${paramCount++}`;
      params.push(chargeType);
    }
    if (productCode) {
      query += ` AND ($${paramCount++} = ANY(applicable_to_products) OR applicable_to_products IS NULL)`;
      params.push(productCode);
    }
    if (channel) {
      query += ` AND ($${paramCount++} = ANY(applicable_channels) OR applicable_channels IS NULL)`;
      params.push(channel);
    }
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch charges' });
  }
});

// ==================== DOCUMENT MASTER ====================

// POST /api/masters/documents - create document master
app.post('/api/masters/documents', async (req: Request, res: Response) => {
  try {
    const { documentCode, documentName, documentCategory, isMandatory, validityPeriodDays, applicableProducts, applicableChannels, metadata } = req.body || {};
    
    if (!documentCode || !documentName || !documentCategory) {
      return res.status(400).json({ error: 'documentCode, documentName, and documentCategory are required' });
    }
    
    const documentId = uuidv4();
    await pool.query(
      `INSERT INTO document_master (
        document_id, document_code, document_name, document_category, is_mandatory,
        validity_period_days, applicable_products, applicable_channels, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        documentId, documentCode, documentName, documentCategory, isMandatory || false,
        validityPeriodDays || null,
        applicableProducts ? JSON.stringify(applicableProducts) : null,
        applicableChannels ? JSON.stringify(applicableChannels) : null,
        metadata ? JSON.stringify(metadata) : '{}'
      ]
    );
    
    return res.status(201).json({ documentId, documentCode, documentName });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Document code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create document master' });
  }
});

// GET /api/masters/documents - list documents
app.get('/api/masters/documents', async (req: Request, res: Response) => {
  try {
    const { category, productCode, channel } = req.query;
    
    let query = 'SELECT * FROM document_master WHERE is_active = true';
    const params: any[] = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND document_category = $${paramCount++}`;
      params.push(category);
    }
    if (productCode) {
      query += ` AND ($${paramCount++} = ANY(applicable_products) OR applicable_products IS NULL)`;
      params.push(productCode);
    }
    if (channel) {
      query += ` AND ($${paramCount++} = ANY(applicable_channels) OR applicable_channels IS NULL)`;
      params.push(channel);
    }
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ==================== BRANCHES ====================

// POST /api/masters/branches - create branch
app.post('/api/masters/branches', async (req: Request, res: Response) => {
  try {
    const { branchCode, branchName, branchType, addressLine1, addressLine2, city, state, pincode, contactMobile, contactEmail, managerName, metadata } = req.body || {};
    
    if (!branchCode || !branchName || !branchType || !city || !state) {
      return res.status(400).json({ error: 'branchCode, branchName, branchType, city, and state are required' });
    }
    
    const branchId = uuidv4();
    await pool.query(
      `INSERT INTO branches (
        branch_id, branch_code, branch_name, branch_type, address_line1, address_line2,
        city, state, pincode, contact_mobile, contact_email, manager_name, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        branchId, branchCode, branchName, branchType, addressLine1 || null, addressLine2 || null,
        city, state, pincode || null, contactMobile || null, contactEmail || null,
        managerName || null, metadata ? JSON.stringify(metadata) : '{}'
      ]
    );
    
    return res.status(201).json({ branchId, branchCode, branchName });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Branch code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create branch' });
  }
});

// GET /api/masters/branches - list branches
app.get('/api/masters/branches', async (req: Request, res: Response) => {
  try {
    const { branchType, city, state } = req.query;
    
    let query = 'SELECT * FROM branches WHERE is_active = true';
    const params: any[] = [];
    let paramCount = 1;
    
    if (branchType) {
      query += ` AND branch_type = $${paramCount++}`;
      params.push(branchType);
    }
    if (city) {
      query += ` AND city = $${paramCount++}`;
      params.push(city);
    }
    if (state) {
      query += ` AND state = $${paramCount++}`;
      params.push(state);
    }
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// ==================== ROLES MASTER ====================

// POST /api/masters/roles - create role
app.post('/api/masters/roles', async (req: Request, res: Response) => {
  try {
    const { roleCode, roleName, roleCategory, permissions } = req.body || {};
    
    if (!roleCode || !roleName || !roleCategory) {
      return res.status(400).json({ error: 'roleCode, roleName, and roleCategory are required' });
    }
    
    const roleId = uuidv4();
    await pool.query(
      'INSERT INTO roles_master (role_id, role_code, role_name, role_category, permissions) VALUES ($1, $2, $3, $4, $5)',
      [roleId, roleCode, roleName, roleCategory, permissions ? JSON.stringify(permissions) : '[]']
    );
    
    return res.status(201).json({ roleId, roleCode, roleName });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Role code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create role' });
  }
});

// GET /api/masters/roles - list roles
app.get('/api/masters/roles', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM roles_master WHERE is_active = true';
    const params: any[] = [];
    
    if (category) {
      query += ' AND role_category = $1';
      params.push(category);
    }
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// ==================== RULE STORE (with maker-checker) ====================

// POST /api/masters/rules - create rule (Draft status)
app.post('/api/masters/rules', async (req: Request, res: Response) => {
  try {
    const { ruleCode, ruleName, ruleCategory, ruleExpression, effectiveFrom, effectiveUntil, metadata } = req.body || {};
    
    if (!ruleCode || !ruleName || !ruleCategory || !ruleExpression) {
      return res.status(400).json({ error: 'ruleCode, ruleName, ruleCategory, and ruleExpression are required' });
    }
    
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    const ruleId = uuidv4();
    
    await pool.query('BEGIN');
    
    await pool.query(
      `INSERT INTO rule_store (
        rule_id, rule_code, rule_name, rule_category, rule_expression,
        effective_from, effective_until, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        ruleId, ruleCode, ruleName, ruleCategory, ruleExpression,
        effectiveFrom || null, effectiveUntil || null, actorId,
        metadata ? JSON.stringify(metadata) : '{}'
      ]
    );
    
    // Record history
    await pool.query(
      'INSERT INTO rule_store_history (rule_id, rule_version, rule_expression, approval_status, action, action_by) VALUES ($1, 1, $2, $3, $4, $5)',
      [ruleId, ruleExpression, 'Draft', 'Created', actorId]
    );
    
    await pool.query('COMMIT');
    
    return res.status(201).json({ ruleId, ruleCode, ruleName, approvalStatus: 'Draft' });
  } catch (err: any) {
    await pool.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Rule code already exists' });
    }
    return res.status(500).json({ error: 'Failed to create rule' });
  }
});

// PATCH /api/masters/rules/:ruleId/submit - submit rule for approval
app.patch('/api/masters/rules/:ruleId/submit', async (req: Request, res: Response) => {
  try {
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    
    const { rows } = await pool.query(
      'SELECT approval_status FROM rule_store WHERE rule_id = $1',
      [req.params.ruleId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    if (rows[0].approval_status !== 'Draft') {
      return res.status(400).json({ error: `Rule must be in Draft status to submit. Current status: ${rows[0].approval_status}` });
    }
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE rule_store SET approval_status = $1, updated_at = now() WHERE rule_id = $2',
      ['PendingApproval', req.params.ruleId]
    );
    
    await pool.query(
      'INSERT INTO rule_store_history (rule_id, rule_version, rule_expression, approval_status, action, action_by) SELECT rule_id, rule_version, rule_expression, $1, $2, $3 FROM rule_store WHERE rule_id = $4',
      ['PendingApproval', 'Submitted', actorId, req.params.ruleId]
    );
    
    await pool.query('COMMIT');
    
    return res.status(200).json({ ruleId: req.params.ruleId, approvalStatus: 'PendingApproval' });
  } catch (err) {
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to submit rule' });
  }
});

// PATCH /api/masters/rules/:ruleId/approve - approve rule (checker)
app.patch('/api/masters/rules/:ruleId/approve', async (req: Request, res: Response) => {
  try {
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    
    const { rows } = await pool.query(
      'SELECT approval_status, rule_expression, rule_version FROM rule_store WHERE rule_id = $1',
      [req.params.ruleId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    if (rows[0].approval_status !== 'PendingApproval') {
      return res.status(400).json({ error: `Rule must be in PendingApproval status. Current status: ${rows[0].approval_status}` });
    }
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE rule_store SET approval_status = $1, approved_by = $2, approved_at = now(), is_active = true, updated_at = now() WHERE rule_id = $3',
      ['Approved', actorId, req.params.ruleId]
    );
    
    await pool.query(
      'INSERT INTO rule_store_history (rule_id, rule_version, rule_expression, approval_status, action, action_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.params.ruleId, rows[0].rule_version, rows[0].rule_expression, 'Approved', 'Approved', actorId]
    );
    
    await pool.query('COMMIT');
    
    return res.status(200).json({ ruleId: req.params.ruleId, approvalStatus: 'Approved', isActive: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to approve rule' });
  }
});

// PATCH /api/masters/rules/:ruleId/reject - reject rule (checker)
app.patch('/api/masters/rules/:ruleId/reject', async (req: Request, res: Response) => {
  try {
    const { rejectionReason } = req.body || {};
    const actorId = (req as any).user?.id || (req as any).user?.sub || 'system';
    
    const { rows } = await pool.query(
      'SELECT approval_status, rule_expression, rule_version FROM rule_store WHERE rule_id = $1',
      [req.params.ruleId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    if (!['PendingApproval', 'Approved'].includes(rows[0].approval_status)) {
      return res.status(400).json({ error: `Rule cannot be rejected in ${rows[0].approval_status} status` });
    }
    
    await pool.query('BEGIN');
    
    await pool.query(
      'UPDATE rule_store SET approval_status = $1, rejected_by = $2, rejected_at = now(), rejection_reason = $3, is_active = false, updated_at = now() WHERE rule_id = $4',
      ['Rejected', actorId, rejectionReason || null, req.params.ruleId]
    );
    
    await pool.query(
      'INSERT INTO rule_store_history (rule_id, rule_version, rule_expression, approval_status, action, action_by, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.params.ruleId, rows[0].rule_version, rows[0].rule_expression, 'Rejected', 'Rejected', actorId, rejectionReason || null]
    );
    
    await pool.query('COMMIT');
    
    return res.status(200).json({ ruleId: req.params.ruleId, approvalStatus: 'Rejected' });
  } catch (err) {
    await pool.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to reject rule' });
  }
});

// GET /api/masters/rules - list rules
app.get('/api/masters/rules', async (req: Request, res: Response) => {
  try {
    const { category, approvalStatus, isActive } = req.query;
    
    let query = 'SELECT * FROM rule_store WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;
    
    if (category) {
      query += ` AND rule_category = $${paramCount++}`;
      params.push(category);
    }
    if (approvalStatus) {
      query += ` AND approval_status = $${paramCount++}`;
      params.push(approvalStatus);
    }
    if (isActive !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(isActive === 'true');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await pool.query(query, params);
    return res.status(200).json(rows);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Masters service listening on ${port}`);
});