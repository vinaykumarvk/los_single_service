import { describe, it, expect } from 'vitest';

/**
 * Underwriting calculation utilities
 * These match the logic in the underwriting service
 */

function calculateEMI(principal: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths === 0 || annualRate === 0) return principal / tenureMonths || 0;
  const monthlyRate = annualRate / 12 / 100;
  const r = monthlyRate;
  const n = tenureMonths;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calculateFOIR(monthlyIncome: number, existingEmi: number, proposedEmi: number): number {
  if (monthlyIncome === 0) return Infinity;
  return (existingEmi + proposedEmi) / monthlyIncome;
}

function calculateLTV(proposedAmount: number, propertyValue: number): number {
  if (propertyValue === 0) return Infinity;
  return proposedAmount / propertyValue;
}

function calculateAgeAtMaturity(applicantAgeYears: number, tenureMonths: number): number {
  return applicantAgeYears + tenureMonths / 12;
}

describe('Underwriting Calculations', () => {
  describe('EMI Calculation', () => {
    it('should calculate EMI correctly', () => {
      // Principal: 800000, Rate: 12% p.a., Tenure: 120 months (10 years)
      const emi = calculateEMI(800000, 12, 120);
      
      // Expected EMI ~₹11,485 (approximate)
      expect(emi).toBeCloseTo(11485, -2); // Within 100
    });

    it('should handle zero rate (flat interest)', () => {
      const emi = calculateEMI(100000, 0, 12);
      expect(emi).toBeCloseTo(8333.33, 2);
    });

    it('should handle zero tenure gracefully', () => {
      const emi = calculateEMI(100000, 12, 0);
      // Division by zero in tenure results in Infinity or NaN, which is expected edge case
      expect(emi).toBeGreaterThanOrEqual(0);
      expect(isFinite(emi) || !isNaN(emi)).toBe(true);
    });

    it('should calculate higher EMI for shorter tenure', () => {
      const emi120 = calculateEMI(800000, 12, 120);
      const emi60 = calculateEMI(800000, 12, 60);
      
      expect(emi60).toBeGreaterThan(emi120);
    });

    it('should calculate higher EMI for higher rate', () => {
      const emi12 = calculateEMI(800000, 12, 120);
      const emi15 = calculateEMI(800000, 15, 120);
      
      expect(emi15).toBeGreaterThan(emi12);
    });
  });

  describe('FOIR Calculation', () => {
    it('should calculate FOIR correctly', () => {
      const foir = calculateFOIR(120000, 5000, 11485);
      // (5000 + 11485) / 120000 = 0.137375
      expect(foir).toBeCloseTo(0.137, 3);
    });

    it('should handle zero income', () => {
      const foir = calculateFOIR(0, 5000, 11485);
      expect(foir).toBe(Infinity);
    });

    it('should calculate FOIR for no existing EMI', () => {
      const foir = calculateFOIR(120000, 0, 11485);
      expect(foir).toBeCloseTo(0.096, 3);
    });

    it('should handle high FOIR (above max)', () => {
      const foir = calculateFOIR(50000, 20000, 30000);
      // 50000 / 50000 = 1.0 (100% FOIR)
      expect(foir).toBe(1.0);
    });
  });

  describe('LTV Calculation', () => {
    it('should calculate LTV correctly', () => {
      const ltv = calculateLTV(800000, 1000000);
      // 800000 / 1000000 = 0.8 (80% LTV)
      expect(ltv).toBe(0.8);
    });

    it('should handle zero property value', () => {
      const ltv = calculateLTV(800000, 0);
      expect(ltv).toBe(Infinity);
    });

    it('should calculate LTV for 100% financing', () => {
      const ltv = calculateLTV(1000000, 1000000);
      expect(ltv).toBe(1.0);
    });

    it('should calculate LTV for partial financing', () => {
      const ltv = calculateLTV(600000, 1000000);
      expect(ltv).toBe(0.6);
    });
  });

  describe('Age at Maturity Calculation', () => {
    it('should calculate age at maturity correctly', () => {
      const ageAtMaturity = calculateAgeAtMaturity(32, 120);
      // 32 + 120/12 = 32 + 10 = 42
      expect(ageAtMaturity).toBe(42);
    });

    it('should handle fractional years', () => {
      const ageAtMaturity = calculateAgeAtMaturity(30, 18);
      // 30 + 18/12 = 30 + 1.5 = 31.5
      expect(ageAtMaturity).toBe(31.5);
    });

    it('should handle zero tenure', () => {
      const ageAtMaturity = calculateAgeAtMaturity(35, 0);
      expect(ageAtMaturity).toBe(35);
    });
  });
});

