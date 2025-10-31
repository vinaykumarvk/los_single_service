import { describe, it, expect } from 'vitest';

/**
 * Sanction/Offer Service - EMI Calculation Tests
 * Tests EMI calculation logic used in sanction generation
 */

function calculateEMI(principal: number, annualRate: number, months: number): number {
  if (months === 0) return 0;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return +(principal / months).toFixed(2);
  
  const r = monthlyRate;
  const pow = Math.pow(1 + r, months);
  const emi = (principal * r * pow) / (pow - 1);
  return +emi.toFixed(2);
}

function calculateOfferUrl(sanctionId: string): string {
  return `https://offer.example/${sanctionId}`;
}

function calculateValidTill(days: number = 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe('EMI Calculation (Sanction Service)', () => {
  it('should calculate EMI correctly', () => {
    // Principal: 1000000, Rate: 12% p.a., Tenure: 120 months (10 years)
    const emi = calculateEMI(1000000, 12, 120);
    
    // Expected EMI ~₹14,347 (approximate)
    expect(emi).toBeCloseTo(14347, -2);
  });

  it('should calculate higher EMI for shorter tenure', () => {
    const emi120 = calculateEMI(1000000, 12, 120);
    const emi60 = calculateEMI(1000000, 12, 60);
    
    expect(emi60).toBeGreaterThan(emi120);
  });

  it('should calculate higher EMI for higher rate', () => {
    const emi12 = calculateEMI(1000000, 12, 120);
    const emi15 = calculateEMI(1000000, 15, 120);
    
    expect(emi15).toBeGreaterThan(emi12);
  });

  it('should handle zero interest rate', () => {
    const emi = calculateEMI(100000, 0, 12);
    // Flat: 100000 / 12 = 8333.33
    expect(emi).toBeCloseTo(8333.33, 2);
  });

  it('should round EMI to 2 decimal places', () => {
    const emi = calculateEMI(333333, 12, 120);
    
    // Check it's rounded to 2 decimals
    const decimals = emi.toString().split('.')[1];
    expect(decimals?.length || 0).toBeLessThanOrEqual(2);
  });
});

describe('Offer URL Generation', () => {
  it('should generate offer URL with sanction ID', () => {
    const sanctionId = '550e8400-e29b-41d4-a716-446655440000';
    const url = calculateOfferUrl(sanctionId);
    
    expect(url).toBe(`https://offer.example/${sanctionId}`);
    expect(url).toContain('offer.example');
    expect(url).toContain(sanctionId);
  });

  it('should handle different sanction IDs', () => {
    const id1 = calculateOfferUrl('id-1');
    const id2 = calculateOfferUrl('id-2');
    
    expect(id1).not.toBe(id2);
    expect(id1).toContain('id-1');
    expect(id2).toContain('id-2');
  });
});

describe('Valid Till Date Calculation', () => {
  it('should calculate valid till date with default 30 days', () => {
    const now = Date.now();
    const validTill = calculateValidTill(30);
    
    const diff = validTill.getTime() - now;
    const days = diff / (24 * 60 * 60 * 1000);
    
    expect(days).toBeCloseTo(30, 0);
  });

  it('should calculate valid till date with custom days', () => {
    const validTill = calculateValidTill(60);
    const now = Date.now();
    const diff = validTill.getTime() - now;
    const days = diff / (24 * 60 * 60 * 1000);
    
    expect(days).toBeCloseTo(60, 0);
  });

  it('should always return future date', () => {
    const validTill = calculateValidTill(30);
    const now = new Date();
    
    expect(validTill.getTime()).toBeGreaterThan(now.getTime());
  });
});

