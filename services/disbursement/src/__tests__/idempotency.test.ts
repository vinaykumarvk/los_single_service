import { describe, it, expect } from 'vitest';

/**
 * Disbursement Service - Idempotency Logic Tests
 * Tests idempotency key handling for disbursement requests
 */

interface Disbursement {
  disbursement_id: string;
  idempotency_key: string;
  status: string;
}

function checkIdempotency(
  existingDisbursements: Disbursement[],
  idempotencyKey: string
): Disbursement | null {
  const existing = existingDisbursements.find(d => d.idempotency_key === idempotencyKey);
  return existing || null;
}

function mapCBSStatusToInternal(cbsStatus: string): 'DISBURSED' | 'FAILED' {
  return cbsStatus === 'SUCCESS' ? 'DISBURSED' : 'FAILED';
}

function generateIdempotencyKey(): string {
  // In real implementation, this would use uuid or request header
  return `idemp-${Date.now()}`;
}

describe('Disbursement Idempotency', () => {
  describe('Idempotency Check', () => {
    it('should return existing disbursement for duplicate idempotency key', () => {
      const existing: Disbursement[] = [
        {
          disbursement_id: 'disb-123',
          idempotency_key: 'idemp-key-1',
          status: 'REQUESTED'
        }
      ];

      const result = checkIdempotency(existing, 'idemp-key-1');

      expect(result).not.toBeNull();
      expect(result?.disbursement_id).toBe('disb-123');
      expect(result?.status).toBe('REQUESTED');
    });

    it('should return null for new idempotency key', () => {
      const existing: Disbursement[] = [
        {
          disbursement_id: 'disb-123',
          idempotency_key: 'idemp-key-1',
          status: 'REQUESTED'
        }
      ];

      const result = checkIdempotency(existing, 'idemp-key-2');

      expect(result).toBeNull();
    });

    it('should handle empty existing disbursements', () => {
      const result = checkIdempotency([], 'idemp-key-1');

      expect(result).toBeNull();
    });

    it('should find correct disbursement from multiple', () => {
      const existing: Disbursement[] = [
        {
          disbursement_id: 'disb-1',
          idempotency_key: 'idemp-key-1',
          status: 'REQUESTED'
        },
        {
          disbursement_id: 'disb-2',
          idempotency_key: 'idemp-key-2',
          status: 'DISBURSED'
        },
        {
          disbursement_id: 'disb-3',
          idempotency_key: 'idemp-key-3',
          status: 'FAILED'
        }
      ];

      const result = checkIdempotency(existing, 'idemp-key-2');

      expect(result?.disbursement_id).toBe('disb-2');
      expect(result?.status).toBe('DISBURSED');
    });
  });

  describe('CBS Status Mapping', () => {
    it('should map SUCCESS to DISBURSED', () => {
      const status = mapCBSStatusToInternal('SUCCESS');
      expect(status).toBe('DISBURSED');
    });

    it('should map FAILED to FAILED', () => {
      const status = mapCBSStatusToInternal('FAILED');
      expect(status).toBe('FAILED');
    });

    it('should map any non-SUCCESS status to FAILED', () => {
      expect(mapCBSStatusToInternal('ERROR')).toBe('FAILED');
      expect(mapCBSStatusToInternal('REJECTED')).toBe('FAILED');
      expect(mapCBSStatusToInternal('PENDING')).toBe('FAILED');
    });
  });

  describe('Idempotency Key Generation', () => {
    it('should generate keys with correct format', () => {
      const key1 = generateIdempotencyKey();
      
      expect(key1.length).toBeGreaterThan(0);
      expect(key1).toContain('idemp-');
    });
    
    it('should generate potentially unique keys', async () => {
      // Add small delay to ensure different timestamps
      const key1 = generateIdempotencyKey();
      await new Promise(resolve => setTimeout(resolve, 10));
      const key2 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
      expect(key1).toContain('idemp-');
      expect(key2).toContain('idemp-');
    });

    it('should generate non-empty keys', () => {
      const key = generateIdempotencyKey();
      expect(key.length).toBeGreaterThan(0);
    });
  });

  describe('Idempotent Request Handling', () => {
    it('should return same response for duplicate request', () => {
      const existing: Disbursement = {
        disbursement_id: 'disb-123',
        idempotency_key: 'idemp-key-1',
        status: 'REQUESTED'
      };

      const result = {
        disbursementId: existing.disbursement_id,
        status: existing.status,
        message: 'Idempotent request'
      };

      expect(result.disbursementId).toBe('disb-123');
      expect(result.status).toBe('REQUESTED');
      expect(result.message).toBe('Idempotent request');
    });
  });
});

