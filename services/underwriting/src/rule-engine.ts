/**
 * Dynamic Rule Configuration Engine
 * Evaluates rules dynamically based on database configuration
 */

import { Pool } from 'pg';

export interface RuleContext {
  monthlyIncome: number;
  existingEmi: number;
  proposedAmount: number;
  tenureMonths: number;
  annualRate: number;
  propertyValue?: number;
  applicantAgeYears: number;
  creditScore?: number;
  productCode: string;
  channel: string;
  applicationId: string;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  evaluatedValue?: number;
  thresholdValue?: number;
  message?: string;
  details?: any;
}

export interface RuleConfig {
  rule_id: string;
  rule_name: string;
  rule_type: 'THRESHOLD' | 'RANGE' | 'BOOLEAN' | 'CUSTOM';
  rule_expression: string;
  applies_to_product_code?: string;
  applies_to_channel?: string;
  priority: number;
  metadata?: any;
}

/**
 * Evaluate rules dynamically from database
 */
export async function evaluateRules(
  pool: Pool,
  context: RuleContext
): Promise<RuleResult[]> {
  // Fetch applicable rules
  const rules = await fetchApplicableRules(pool, context.productCode, context.channel);
  
  const results: RuleResult[] = [];
  
  for (const rule of rules) {
    const result = await evaluateRule(rule, context);
    results.push(result);
    
    // Record evaluation history
    await recordEvaluation(pool, context.applicationId, rule, result);
  }
  
  // Sort by priority (higher priority first)
  results.sort((a, b) => {
    const ruleA = rules.find(r => r.rule_id === a.ruleId);
    const ruleB = rules.find(r => r.rule_id === b.ruleId);
    return (ruleB?.priority || 0) - (ruleA?.priority || 0);
  });
  
  return results;
}

/**
 * Fetch applicable rules from database
 */
async function fetchApplicableRules(
  pool: Pool,
  productCode: string,
  channel: string
): Promise<RuleConfig[]> {
  const now = new Date();
  const { rows } = await pool.query(
    `SELECT rule_id, rule_name, rule_type, rule_expression, 
            applies_to_product_code, applies_to_channel, priority, metadata
     FROM rule_configurations
     WHERE is_active = true
     AND (applies_to_product_code IS NULL OR applies_to_product_code = $1)
     AND (applies_to_channel IS NULL OR applies_to_channel = $2)
     AND effective_from <= $3
     AND (effective_until IS NULL OR effective_until >= $3)
     ORDER BY priority DESC, rule_name ASC`,
    [productCode, channel, now]
  );
  
  return rows;
}

/**
 * Evaluate a single rule
 */
async function evaluateRule(
  rule: RuleConfig,
  context: RuleContext
): Promise<RuleResult> {
  try {
    switch (rule.rule_type) {
      case 'THRESHOLD':
        return evaluateThresholdRule(rule, context);
      case 'RANGE':
        return evaluateRangeRule(rule, context);
      case 'BOOLEAN':
        return evaluateBooleanRule(rule, context);
      case 'CUSTOM':
        return evaluateCustomRule(rule, context);
      default:
        return {
          ruleId: rule.rule_id,
          ruleName: rule.rule_name,
          passed: false,
          message: `Unknown rule type: ${rule.rule_type}`
        };
    }
  } catch (error) {
    return {
      ruleId: rule.rule_id,
      ruleName: rule.rule_name,
      passed: false,
      message: `Rule evaluation error: ${(error as Error).message}`
    };
  }
}

/**
 * Evaluate threshold rule (e.g., FOIR <= 0.5)
 */
function evaluateThresholdRule(
  rule: RuleConfig,
  context: RuleContext
): RuleResult {
  const expression = JSON.parse(rule.rule_expression);
  const { metric, operator, threshold } = expression;
  
  let value: number;
  switch (metric) {
    case 'FOIR':
      const proposedEmi = calculateEmi(context.proposedAmount, context.annualRate, context.tenureMonths);
      value = (context.existingEmi + proposedEmi) / context.monthlyIncome;
      break;
    case 'LTV':
      if (!context.propertyValue || context.propertyValue === 0) {
        return {
          ruleId: rule.rule_id,
          ruleName: rule.rule_name,
          passed: true, // LTV doesn't apply if no property value
          message: 'LTV not applicable (no property value)'
        };
      }
      value = context.proposedAmount / context.propertyValue;
      break;
    case 'AGE_AT_MATURITY':
      value = context.applicantAgeYears + context.tenureMonths / 12;
      break;
    case 'CREDIT_SCORE':
      value = context.creditScore || 0;
      if (!context.creditScore) {
        return {
          ruleId: rule.rule_id,
          ruleName: rule.rule_name,
          passed: false,
          message: 'Credit score not provided'
        };
      }
      break;
    default:
      return {
        ruleId: rule.rule_id,
        ruleName: rule.rule_name,
        passed: false,
        message: `Unknown metric: ${metric}`
      };
  }
  
  let passed: boolean;
  switch (operator) {
    case '<=':
      passed = value <= threshold;
      break;
    case '>=':
      passed = value >= threshold;
      break;
    case '<':
      passed = value < threshold;
      break;
    case '>':
      passed = value > threshold;
      break;
    case '==':
      passed = value === threshold;
      break;
    default:
      passed = false;
  }
  
  return {
    ruleId: rule.rule_id,
    ruleName: rule.rule_name,
    passed,
    evaluatedValue: value,
    thresholdValue: threshold,
    message: passed 
      ? `${metric} ${value.toFixed(4)} ${operator} ${threshold}`
      : `${metric} ${value.toFixed(4)} violates ${operator} ${threshold}`
  };
}

/**
 * Evaluate range rule (e.g., amount between min and max)
 */
function evaluateRangeRule(
  rule: RuleConfig,
  context: RuleContext
): RuleResult {
  const expression = JSON.parse(rule.rule_expression);
  const { metric, min, max } = expression;
  
  let value: number;
  switch (metric) {
    case 'AMOUNT':
      value = context.proposedAmount;
      break;
    case 'TENURE':
      value = context.tenureMonths;
      break;
    case 'INCOME':
      value = context.monthlyIncome;
      break;
    default:
      return {
        ruleId: rule.rule_id,
        ruleName: rule.rule_name,
        passed: false,
        message: `Unknown metric: ${metric}`
      };
  }
  
  const passed = value >= min && value <= max;
  
  return {
    ruleId: rule.rule_id,
    ruleName: rule.rule_name,
    passed,
    evaluatedValue: value,
    thresholdValue: max,
    message: passed
      ? `${metric} ${value} is within range [${min}, ${max}]`
      : `${metric} ${value} is outside range [${min}, ${max}]`
  };
}

/**
 * Evaluate boolean rule (e.g., has co-applicant)
 */
function evaluateBooleanRule(
  rule: RuleConfig,
  context: RuleContext
): RuleResult {
  const expression = JSON.parse(rule.rule_expression);
  // This is a placeholder - boolean rules would check context flags
  const passed = true; // Default
  
  return {
    ruleId: rule.rule_id,
    ruleName: rule.rule_name,
    passed,
    message: 'Boolean rule evaluated'
  };
}

/**
 * Evaluate custom rule (JavaScript expression)
 */
function evaluateCustomRule(
  rule: RuleConfig,
  context: RuleContext
): RuleResult {
  // For security, custom rules should be sandboxed or use a DSL
  // This is a simplified version
  try {
    const expression = rule.rule_expression;
    // Simple expression evaluation (in production, use a safe evaluator)
    const result = eval(`(${expression})`); // WARNING: eval is unsafe, use a safe evaluator in production
    return {
      ruleId: rule.rule_id,
      ruleName: rule.rule_name,
      passed: Boolean(result),
      message: `Custom rule: ${result}`
    };
  } catch (error) {
    return {
      ruleId: rule.rule_id,
      ruleName: rule.rule_name,
      passed: false,
      message: `Custom rule error: ${(error as Error).message}`
    };
  }
}

/**
 * Record evaluation history
 */
async function recordEvaluation(
  pool: Pool,
  applicationId: string,
  rule: RuleConfig,
  result: RuleResult
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO rule_evaluation_history 
       (evaluation_id, application_id, rule_id, rule_name, rule_result, 
        evaluated_value, threshold_value, evaluation_details)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
      [
        applicationId,
        rule.rule_id,
        result.ruleName,
        result.passed,
        result.evaluatedValue || null,
        result.thresholdValue || null,
        JSON.stringify({ result, context: 'masked' }) // Don't log full context for security
      ]
    );
  } catch (error) {
    // Don't fail evaluation if history recording fails
    console.error('Failed to record evaluation history:', error);
  }
}

/**
 * Calculate EMI
 */
function calculateEmi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return +(principal / months).toFixed(2);
  const pow = Math.pow(1 + r, months);
  const emi = principal * r * pow / (pow - 1);
  return +emi.toFixed(2);
}

