import { describe, it, expect } from 'vitest';

/**
 * Underwriting Decision Engine Tests
 * Tests the decision logic: AUTO_APPROVE, REFER, DECLINE
 */

interface RuleResult {
  rule: string;
  passed: boolean;
  value: number;
  threshold: number;
}

interface UnderwritingMetrics {
  foir?: number;
  ltv?: number;
  ageAtMaturity?: number;
}

interface ProductRules {
  maxFOIR: number;
  maxLTV: number;
  maxAgeAtMaturity: number;
}

function evaluateRules(
  metrics: UnderwritingMetrics,
  rules: ProductRules
): { decision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE'; reasons: string[]; ruleResults: RuleResult[] } {
  const ruleResults: RuleResult[] = [];
  const reasons: string[] = [];

  // FOIR rule
  if (metrics.foir !== undefined) {
    const passed = metrics.foir <= rules.maxFOIR;
    ruleResults.push({ rule: 'FOIR', passed, value: metrics.foir, threshold: rules.maxFOIR });
    if (!passed) {
      reasons.push(`FOIR ${(metrics.foir * 100).toFixed(2)}% exceeds maximum ${(rules.maxFOIR * 100).toFixed(2)}%`);
    }
  }

  // LTV rule
  if (metrics.ltv !== undefined) {
    const passed = metrics.ltv <= rules.maxLTV;
    ruleResults.push({ rule: 'LTV', passed, value: metrics.ltv, threshold: rules.maxLTV });
    if (!passed) {
      reasons.push(`LTV ${(metrics.ltv * 100).toFixed(2)}% exceeds maximum ${(rules.maxLTV * 100).toFixed(2)}%`);
    }
  }

  // Age at maturity rule
  if (metrics.ageAtMaturity !== undefined) {
    const passed = metrics.ageAtMaturity <= rules.maxAgeAtMaturity;
    ruleResults.push({ rule: 'AgeAtMaturity', passed, value: metrics.ageAtMaturity, threshold: rules.maxAgeAtMaturity });
    if (!passed) {
      reasons.push(`Age at maturity ${metrics.ageAtMaturity} years exceeds maximum ${rules.maxAgeAtMaturity} years`);
    }
  }

  // Decision logic: All pass = AUTO_APPROVE, 1 fail = REFER, 2+ fail = DECLINE
  const failedCount = ruleResults.filter(r => !r.passed).length;
  
  let decision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE';
  if (failedCount === 0) {
    decision = 'AUTO_APPROVE';
  } else if (failedCount === 1) {
    decision = 'REFER';
  } else {
    decision = 'DECLINE';
  }

  return { decision, reasons, ruleResults };
}

describe('Underwriting Decision Engine', () => {
  const defaultRules: ProductRules = {
    maxFOIR: 0.5,
    maxLTV: 0.8,
    maxAgeAtMaturity: 70,
  };

  describe('AUTO_APPROVE scenarios', () => {
    it('should approve when all rules pass', () => {
      const metrics = {
        foir: 0.4,
        ltv: 0.75,
        ageAtMaturity: 65,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('AUTO_APPROVE');
      expect(result.reasons).toHaveLength(0);
      expect(result.ruleResults.every(r => r.passed)).toBe(true);
    });

    it('should approve when metrics are exactly at thresholds', () => {
      const metrics = {
        foir: 0.5,
        ltv: 0.8,
        ageAtMaturity: 70,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('AUTO_APPROVE');
    });
  });

  describe('REFER scenarios', () => {
    it('should refer when one rule fails', () => {
      const metrics = {
        foir: 0.6, // Fails
        ltv: 0.75,
        ageAtMaturity: 65,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('REFER');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain('FOIR');
    });

    it('should refer when LTV rule fails', () => {
      const metrics = {
        foir: 0.4,
        ltv: 0.9, // Fails
        ageAtMaturity: 65,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('REFER');
      expect(result.reasons[0]).toContain('LTV');
    });

    it('should refer when age at maturity rule fails', () => {
      const metrics = {
        foir: 0.4,
        ltv: 0.75,
        ageAtMaturity: 75, // Fails
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('REFER');
      expect(result.reasons[0]).toContain('Age at maturity');
    });
  });

  describe('DECLINE scenarios', () => {
    it('should decline when two rules fail', () => {
      const metrics = {
        foir: 0.6, // Fails
        ltv: 0.9, // Fails
        ageAtMaturity: 65,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('DECLINE');
      expect(result.reasons).toHaveLength(2);
    });

    it('should decline when all rules fail', () => {
      const metrics = {
        foir: 0.8, // Fails
        ltv: 0.95, // Fails
        ageAtMaturity: 75, // Fails
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('DECLINE');
      expect(result.reasons).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing metrics gracefully', () => {
      const metrics = {
        foir: 0.4,
        // ltv missing
        ageAtMaturity: 65,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('AUTO_APPROVE');
      expect(result.ruleResults).toHaveLength(2); // Only FOIR and Age evaluated
    });

    it('should handle zero values', () => {
      const metrics = {
        foir: 0,
        ltv: 0,
        ageAtMaturity: 30,
      };

      const result = evaluateRules(metrics, defaultRules);
      
      expect(result.decision).toBe('AUTO_APPROVE');
    });
  });
});


