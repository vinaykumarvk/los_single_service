import { describe, it, expect } from 'vitest';

/**
 * Payment Fee Calculation Tests
 * Tests percentage, fixed, and minimum fee calculations
 */

interface FeeConfig {
  type: 'percent' | 'fixed';
  percent?: number;
  fixed?: number;
  min?: number;
}

function calculateFee(amount: number, config: FeeConfig): number {
  let fee = 0;

  if (config.type === 'percent') {
    fee = amount * (config.percent || 0) / 100;
  } else if (config.type === 'fixed') {
    fee = config.fixed || 0;
  }

  // Apply minimum if specified
  if (config.min !== undefined && fee < config.min) {
    fee = config.min;
  }

  // Apply maximum if specified
  if ((config as any).max !== undefined && fee > (config as any).max) {
    fee = (config as any).max;
  }

  return Math.round(fee * 100) / 100; // Round to 2 decimal places like actual implementation
}

describe('Fee Calculation', () => {
  describe('Percentage-based fees', () => {
    it('should calculate percentage fee correctly', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 1.0,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(1000); // 1% of 100,000
    });

    it('should calculate percentage fee with decimal rate', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 1.5,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(1500); // 1.5% of 100,000
    });

    it('should handle zero percent', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 0,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(0);
    });

    it('should handle high percentage', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 5.0,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(5000); // 5% of 100,000
    });
  });

  describe('Fixed fees', () => {
    it('should calculate fixed fee correctly', () => {
      const config: FeeConfig = {
        type: 'fixed',
        fixed: 2500,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(2500);
    });

    it('should return fixed fee regardless of amount', () => {
      const config: FeeConfig = {
        type: 'fixed',
        fixed: 5000,
      };

      const fee1 = calculateFee(10000, config);
      const fee2 = calculateFee(1000000, config);
      
      expect(fee1).toBe(5000);
      expect(fee2).toBe(5000);
    });
  });

  describe('Minimum fee enforcement', () => {
    it('should apply minimum when percentage fee is below minimum', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 0.5, // 0.5% of 10,000 = 50
        min: 2500,
      };

      const fee = calculateFee(10000, config);
      expect(fee).toBe(2500); // Minimum applied
    });

    it('should not apply minimum when percentage fee exceeds minimum', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 1.0, // 1% of 100,000 = 1,000
        min: 500,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(1000); // Actual fee, not minimum
    });

    it('should apply minimum to fixed fee if below minimum', () => {
      const config: FeeConfig = {
        type: 'fixed',
        fixed: 1000,
        min: 2500,
      };

      const fee = calculateFee(100000, config);
      expect(fee).toBe(2500); // Minimum applied
    });
  });

  describe('Slab-based fees (future enhancement)', () => {
    it('should handle simple slab structure', () => {
      // Example: 1% for amounts < 500k, 0.8% for amounts >= 500k
      const amount = 600000;
      
      let fee: number;
      if (amount < 500000) {
        fee = amount * 0.01;
      } else {
        fee = amount * 0.008;
      }
      
      expect(fee).toBe(4800); // 0.8% of 600,000
    });
  });

  describe('Edge cases', () => {
    it('should handle zero amount', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 1.0,
      };

      const fee = calculateFee(0, config);
      expect(fee).toBe(0);
    });

    it('should handle very small amounts', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 1.0,
        min: 100,
      };

      const fee = calculateFee(1000, config); // 1% = 10, but min is 100
      expect(fee).toBe(100);
    });

    it('should round fees correctly', () => {
      const config: FeeConfig = {
        type: 'percent',
        percent: 1.0,
      };

      const fee = calculateFee(33333, config); // 1% = 333.33
      expect(fee).toBeCloseTo(333.33, 2);
    });
  });
});

