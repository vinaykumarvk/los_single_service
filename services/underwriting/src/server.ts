import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';
import { evaluateRules, RuleContext } from './rule-engine';
import { getScoring, enhanceDecisionWithScoring } from './scoring-integration';

const pool = createPgPool();
const logger = createLogger('underwriting-service');

const app = express();
app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

const EvaluateSchema = z.object({
  monthlyIncome: z.number().min(0),
  existingEmi: z.number().min(0).default(0),
  proposedAmount: z.number().min(1),
  tenureMonths: z.number().int().min(1),
  annualRate: z.number().min(0),
  propertyValue: z.number().min(0).optional(),
  applicantAgeYears: z.number().min(18),
  creditScore: z.number().min(300).max(900).optional(), // Credit score from bureau (300-900)
  productCode: z.string().min(1).optional(), // Product code for rule lookup
  channel: z.string().optional(), // Channel for rule lookup
  product: z.object({
    maxFOIR: z.number().min(0).max(1),
    maxLTV: z.number().min(0).max(1).optional(),
    maxAgeAtMaturity: z.number().int().min(1),
    minCreditScore: z.number().min(300).max(900).optional() // Minimum credit score for approval
  }).optional() // Optional if using dynamic rules
});

function calcEmi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return +(principal / months).toFixed(2);
  const pow = Math.pow(1 + r, months);
  const emi = principal * r * pow / (pow - 1);
  return +emi.toFixed(2);
}

app.post('/api/applications/:id/underwrite', async (req, res) => {
  const parsed = EvaluateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const {
    monthlyIncome,
    existingEmi,
    proposedAmount,
    tenureMonths,
    annualRate,
    propertyValue,
    applicantAgeYears,
    creditScore,
    productCode,
    channel,
    product
  } = parsed.data;

  let reasons: string[] = [];
  let ruleResults: any[] = [];
  let metrics: any;

  // Use dynamic rules if productCode is provided, otherwise fall back to static product rules
  if (productCode && !product) {
    // Dynamic rule evaluation
    const context: RuleContext = {
      monthlyIncome,
      existingEmi,
      proposedAmount,
      tenureMonths,
      annualRate,
      propertyValue,
      applicantAgeYears,
      creditScore,
      productCode,
      channel: channel || 'Online',
      applicationId: req.params.id
    };
    
    const dynamicResults = await evaluateRules(pool, context);
    ruleResults = dynamicResults;
    
    // Extract reasons from failed rules
    reasons = dynamicResults
      .filter(r => !r.passed)
      .map(r => r.message || `${r.ruleName} failed`);
    
    // Build metrics from rule results
    const proposedEmi = calcEmi(proposedAmount, annualRate, tenureMonths);
    metrics = {
      foir: (existingEmi + proposedEmi) / monthlyIncome,
      ltv: propertyValue && propertyValue > 0 ? proposedAmount / propertyValue : null,
      ageAtMaturity: applicantAgeYears + tenureMonths / 12,
      proposedEmi,
      creditScore: creditScore || null
    };
  } else {
    // Fallback to static product rules (backward compatibility)
    const proposedEmi = calcEmi(proposedAmount, annualRate, tenureMonths);
    const foir = (existingEmi + proposedEmi) / monthlyIncome;
    const ltv = propertyValue && propertyValue > 0 ? proposedAmount / propertyValue : undefined;
    const ageAtMaturity = applicantAgeYears + tenureMonths / 12;

    if (!product) {
      return res.status(400).json({ error: 'Either productCode or product object required' });
    }

    if (foir > product.maxFOIR) reasons.push(`FOIR ${foir.toFixed(2)} exceeds ${product.maxFOIR}`);
    if (ltv !== undefined && product.maxLTV !== undefined && ltv > product.maxLTV) reasons.push(`LTV ${(ltv * 100).toFixed(2)}% exceeds ${(product.maxLTV * 100).toFixed(2)}%`);
    if (ageAtMaturity > product.maxAgeAtMaturity) reasons.push(`Age at maturity ${ageAtMaturity.toFixed(1)} exceeds ${product.maxAgeAtMaturity}`);
    
    if (creditScore !== undefined && product.minCreditScore !== undefined) {
      if (creditScore < product.minCreditScore) {
        reasons.push(`Credit score ${creditScore} is below minimum ${product.minCreditScore} required for product`);
      }
    }

    metrics = {
      foir: +foir.toFixed(4),
      ltv: ltv !== undefined ? +ltv.toFixed(4) : null,
      ageAtMaturity: +ageAtMaturity.toFixed(2),
      proposedEmi,
      creditScore: creditScore || null,
      scoringResult: scoringResult ? {
        score: scoringResult.score,
        riskLevel: scoringResult.riskLevel,
        provider: scoringResult.providerUsed
      } : null
    };
  }

  let decision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE' = 'AUTO_APPROVE';
  if (reasons.length >= 2) decision = 'DECLINE';
  else if (reasons.length === 1) decision = 'REFER';

  // Get AI/ML scoring to enhance decision
  let scoringResult = null;
  let enhancedDecision = decision;
  let enhancedReasons = reasons;
  let scoringEnhancement: any = null;

  try {
    // Call scoring service (with fallback to internal ML)
    const scoringProvider = req.query.scoringProvider as string || 'INTERNAL_ML';
    const { getScoring, enhanceDecisionWithScoring } = await import('./scoring-integration');
    
    scoringResult = await getScoring(
      req.params.id,
      {
        applicantId: parsed.data.applicantId || '',
        monthlyIncome,
        existingEmi,
        proposedAmount,
        tenureMonths,
        annualRate,
        propertyValue,
        applicantAgeYears,
        creditScore,
        employmentType: parsed.data.employmentType,
        employmentTenure: parsed.data.employmentTenure,
        bankingRelationship: parsed.data.bankingRelationship,
        previousDefaults: parsed.data.previousDefaults,
        channel,
        productCode
      },
      scoringProvider
    );

    if (scoringResult) {
      const enhanced = enhanceDecisionWithScoring(decision, scoringResult, reasons);
      enhancedDecision = enhanced.decision;
      enhancedReasons = enhanced.reasons;
      scoringEnhancement = enhanced.scoringEnhancement;
    }
  } catch (err) {
    logger.warn('ScoringIntegrationError', {
      error: (err as Error).message,
      applicationId: req.params.id,
      correlationId: (req as any).correlationId
    });
    // Continue with rule-based decision if scoring fails
  }

  // Use enhanced decision if available, otherwise use rule-based decision
  decision = enhancedDecision;
  reasons = enhancedReasons;

  const decisionId = uuidv4();
  const evaluatedBy = (req as any).user?.id || (req as any).user?.sub || 'system';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Persist decision
    await client.query(
      `INSERT INTO underwriting_decisions 
       (decision_id, application_id, decision, reasons, metrics, evaluated_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [decisionId, req.params.id, decision, reasons, JSON.stringify(metrics), evaluatedBy]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.underwriting.DecisionMade.v1', 'los.underwriting.DecisionMade.v1', JSON.stringify({ applicationId: req.params.id, decisionId, decision, reasons, metrics }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('UnderwritingDecision', { correlationId: (req as any).correlationId, applicationId: req.params.id, decision, decisionId });

    return res.status(200).json({
      decisionId,
      decision: enhancedDecision,
      reasons: enhancedReasons,
      metrics: {
        ...metrics,
        ...(scoringEnhancement && {
          scoringResult: {
            score: scoringEnhancement.score,
            riskLevel: scoringEnhancement.riskLevel,
            recommendation: scoringEnhancement.recommendation,
            provider: scoringEnhancement.provider
          }
        })
      },
      ...(scoringEnhancement && { scoringEnhancement })
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('UnderwritingError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to evaluate underwriting' });
  } finally {
    client.release();
  }
});

// GET /api/applications/:id/decision - get latest decision
app.get('/api/applications/:id/decision', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM underwriting_decisions WHERE application_id = $1 ORDER BY evaluated_at DESC LIMIT 1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No decision found' });
    return res.status(200).json(rows[0]);
  } catch (err) {
    logger.error('GetDecisionError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch decision' });
  }
});

// POST /api/applications/:id/override/request - maker creates override request
app.post('/api/applications/:id/override/request', async (req, res) => {
  const OverrideRequestSchema = z.object({
    originalDecision: z.enum(['REFER', 'DECLINE']),
    requestedDecision: z.enum(['AUTO_APPROVE', 'REFER']),
    justification: z.string().min(10).max(1000)
  });

  const parsed = OverrideRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const requestedBy = (req as any).user?.id || (req as any).user?.sub || 'maker';
  const overrideRequestId = uuidv4();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check latest decision
    const decisionResult = await client.query(
      'SELECT decision_id, decision FROM underwriting_decisions WHERE application_id = $1 ORDER BY evaluated_at DESC LIMIT 1',
      [req.params.id]
    );
    if (decisionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No underwriting decision found. Please run underwriting first.' });
    }

    const latestDecision = decisionResult.rows[0].decision;
    if (latestDecision !== parsed.data.originalDecision) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Latest decision is ${latestDecision}, not ${parsed.data.originalDecision}` });
    }

    // Check if there's already a pending override
    const existingResult = await client.query(
      'SELECT override_request_id FROM override_requests WHERE application_id = $1 AND status = $2',
      [req.params.id, 'PENDING']
    );
    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A pending override request already exists for this application' });
    }

    // Create override request
    await client.query(
      `INSERT INTO override_requests 
       (override_request_id, application_id, original_decision, requested_decision, justification, requested_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [overrideRequestId, req.params.id, parsed.data.originalDecision, parsed.data.requestedDecision, parsed.data.justification, requestedBy]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.underwriting.OverrideRequested.v1', 'los.underwriting.OverrideRequested.v1', JSON.stringify({ applicationId: req.params.id, overrideRequestId, originalDecision: parsed.data.originalDecision, requestedDecision: parsed.data.requestedDecision, requestedBy }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('OverrideRequested', { correlationId: (req as any).correlationId, applicationId: req.params.id, overrideRequestId, requestedBy });

    return res.status(201).json({ overrideRequestId, status: 'PENDING' });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('OverrideRequestError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create override request' });
  } finally {
    client.release();
  }
});

// POST /api/applications/:id/override/:overrideRequestId/approve - checker approves override
app.post('/api/applications/:id/override/:overrideRequestId/approve', async (req, res) => {
  const ReviewSchema = z.object({
    remarks: z.string().max(500).optional()
  });
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const reviewedBy = (req as any).user?.id || (req as any).user?.sub || 'checker';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get override request
    const { rows } = await client.query(
      'SELECT * FROM override_requests WHERE override_request_id = $1 AND application_id = $2',
      [req.params.overrideRequestId, req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Override request not found' });
    }
    const overrideReq = rows[0];

    if (overrideReq.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Override request is ${overrideReq.status}, cannot approve` });
    }

    // Update override request
    await client.query(
      'UPDATE override_requests SET status = $1, reviewed_by = $2, review_remarks = $3, reviewed_at = now() WHERE override_request_id = $4',
      ['APPROVED', reviewedBy, parsed.data.remarks || null, req.params.overrideRequestId]
    );

    // Create override decision with the requested decision
    const decisionId = uuidv4();
    await client.query(
      `INSERT INTO underwriting_decisions 
       (decision_id, application_id, decision, original_decision, override_request_id, evaluated_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [decisionId, req.params.id, overrideReq.requested_decision, overrideReq.original_decision, req.params.overrideRequestId, reviewedBy]
    );

    // Write outbox events
    const eventId1 = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId1, req.params.id, 'los.underwriting.OverrideApproved.v1', 'los.underwriting.OverrideApproved.v1', JSON.stringify({ applicationId: req.params.id, overrideRequestId: req.params.overrideRequestId, requestedDecision: overrideReq.requested_decision, reviewedBy }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    const eventId2 = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId2, req.params.id, 'los.underwriting.DecisionMade.v1', 'los.underwriting.DecisionMade.v1', JSON.stringify({ applicationId: req.params.id, decisionId, decision: overrideReq.requested_decision, overrideRequestId: req.params.overrideRequestId }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('OverrideApproved', { correlationId: (req as any).correlationId, applicationId: req.params.id, overrideRequestId: req.params.overrideRequestId, reviewedBy });

    return res.status(200).json({ 
      overrideRequestId: req.params.overrideRequestId, 
      status: 'APPROVED',
      decisionId,
      decision: overrideReq.requested_decision
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('OverrideApproveError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to approve override' });
  } finally {
    client.release();
  }
});

// POST /api/applications/:id/override/:overrideRequestId/reject - checker rejects override
app.post('/api/applications/:id/override/:overrideRequestId/reject', async (req, res) => {
  const ReviewSchema = z.object({
    remarks: z.string().min(10).max(500) // Rejection requires remarks
  });
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const reviewedBy = (req as any).user?.id || (req as any).user?.sub || 'checker';
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get override request
    const { rows } = await client.query(
      'SELECT * FROM override_requests WHERE override_request_id = $1 AND application_id = $2',
      [req.params.overrideRequestId, req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Override request not found' });
    }
    const overrideReq = rows[0];

    if (overrideReq.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Override request is ${overrideReq.status}, cannot reject` });
    }

    // Update override request
    await client.query(
      'UPDATE override_requests SET status = $1, reviewed_by = $2, review_remarks = $3, reviewed_at = now() WHERE override_request_id = $4',
      ['REJECTED', reviewedBy, parsed.data.remarks, req.params.overrideRequestId]
    );

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.underwriting.OverrideRejected.v1', 'los.underwriting.OverrideRejected.v1', JSON.stringify({ applicationId: req.params.id, overrideRequestId: req.params.overrideRequestId, remarks: parsed.data.remarks, reviewedBy }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('OverrideRejected', { correlationId: (req as any).correlationId, applicationId: req.params.id, overrideRequestId: req.params.overrideRequestId, reviewedBy });

    return res.status(200).json({ 
      overrideRequestId: req.params.overrideRequestId, 
      status: 'REJECTED'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('OverrideRejectError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to reject override' });
  } finally {
    client.release();
  }
});

// GET /api/applications/:id/override - list override requests for application
app.get('/api/applications/:id/override', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM override_requests WHERE application_id = $1 ORDER BY requested_at DESC',
      [req.params.id]
    );
    return res.status(200).json({ overrideRequests: rows });
  } catch (err) {
    logger.error('ListOverrideRequestsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list override requests' });
  }
});

// GET /api/override-requests/pending - list pending override requests (for checkers)
app.get('/api/override-requests/pending', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) as total FROM override_requests WHERE status = $1', ['PENDING']);
    const total = parseInt(countResult.rows[0].total, 10);

    const { rows } = await pool.query(
      'SELECT * FROM override_requests WHERE status = $1 ORDER BY requested_at ASC LIMIT $2 OFFSET $3',
      ['PENDING', limit, offset]
    );

    return res.status(200).json({
      overrideRequests: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    logger.error('ListPendingOverridesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list pending override requests' });
  }
});

// POST /api/rules - create rule configuration
app.post('/api/rules', async (req, res) => {
  const RuleSchema = z.object({
    ruleName: z.string().min(1),
    ruleType: z.enum(['THRESHOLD', 'RANGE', 'BOOLEAN', 'CUSTOM']),
    ruleExpression: z.string().min(1), // JSON string for structured rules
    appliesToProductCode: z.string().optional(),
    appliesToChannel: z.string().optional(),
    priority: z.number().int().default(0),
    effectiveFrom: z.string().datetime().optional(),
    effectiveUntil: z.string().datetime().optional(),
    metadata: z.record(z.any()).optional()
  });
  
  const parsed = RuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const ruleId = uuidv4();
  const createdBy = (req as any).user?.id || (req as any).user?.sub || 'system';
  
  try {
    await pool.query(
      `INSERT INTO rule_configurations 
       (rule_id, rule_name, rule_type, rule_expression, applies_to_product_code,
        applies_to_channel, priority, effective_from, effective_until, created_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        ruleId,
        parsed.data.ruleName,
        parsed.data.ruleType,
        parsed.data.ruleExpression,
        parsed.data.appliesToProductCode || null,
        parsed.data.appliesToChannel || null,
        parsed.data.priority,
        parsed.data.effectiveFrom ? new Date(parsed.data.effectiveFrom) : new Date(),
        parsed.data.effectiveUntil ? new Date(parsed.data.effectiveUntil) : null,
        createdBy,
        parsed.data.metadata ? JSON.stringify(parsed.data.metadata) : null
      ]
    );
    
    logger.info('RuleCreated', { correlationId: (req as any).correlationId, ruleId, ruleName: parsed.data.ruleName });
    return res.status(201).json({ ruleId, ruleName: parsed.data.ruleName });
  } catch (err) {
    logger.error('RuleCreateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create rule' });
  }
});

// GET /api/rules - list rule configurations
app.get('/api/rules', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT rule_id, rule_name, rule_type, applies_to_product_code, applies_to_channel, priority, is_active, effective_from, effective_until, created_at FROM rule_configurations ORDER BY priority DESC, rule_name ASC'
    );
    return res.status(200).json({ rules: rows });
  } catch (err) {
    logger.error('ListRulesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list rules' });
  }
});

// PATCH /api/rules/:ruleId - update rule (activate/deactivate or modify)
app.patch('/api/rules/:ruleId', async (req, res) => {
  const UpdateRuleSchema = z.object({
    isActive: z.boolean().optional(),
    ruleExpression: z.string().optional(),
    priority: z.number().int().optional(),
    effectiveUntil: z.string().datetime().optional()
  });
  
  const parsed = UpdateRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (parsed.data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(parsed.data.isActive);
    }
    if (parsed.data.ruleExpression) {
      updates.push(`rule_expression = $${paramCount++}`);
      values.push(parsed.data.ruleExpression);
    }
    if (parsed.data.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(parsed.data.priority);
    }
    if (parsed.data.effectiveUntil !== undefined) {
      updates.push(`effective_until = $${paramCount++}`);
      values.push(parsed.data.effectiveUntil ? new Date(parsed.data.effectiveUntil) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = now()`);
    values.push(req.params.ruleId);

    await pool.query(
      `UPDATE rule_configurations SET ${updates.join(', ')} WHERE rule_id = $${paramCount}`,
      values
    );

    logger.info('RuleUpdated', { correlationId: (req as any).correlationId, ruleId: req.params.ruleId });
    return res.status(200).json({ ruleId: req.params.ruleId, updated: true });
  } catch (err) {
    logger.error('RuleUpdateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to update rule' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3006;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Underwriting service listening on ${port}`);
});


