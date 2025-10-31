import { describe, it, expect, beforeEach } from 'vitest';
import { MockBureauAdapter } from '../mock';

describe('MockBureauAdapter', () => {
  let adapter: MockBureauAdapter;

  beforeEach(() => {
    adapter = new MockBureauAdapter();
  });

  describe('pullCreditReport', () => {
    it('should return a pending request with requestId', async () => {
      const result = await adapter.pullCreditReport({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        pan: 'ABCDE1234F',
        provider: 'CIBIL',
      });

      expect(result).toHaveProperty('requestId');
      expect(result).toHaveProperty('externalRef');
      expect(result.status).toBe('REQUESTED');
      expect(result.provider).toBe('CIBIL');
      expect(result.estimatedCompletionTime).toBe(5);
    });

    it('should generate report after delay', async () => {
      const result = await adapter.pullCreditReport({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        provider: 'CIBIL',
      });

      // Wait for async report generation
      await new Promise(resolve => setTimeout(resolve, 6000));

      const report = await adapter.getCreditReport(result.requestId);
      expect(report).not.toBeNull();
      expect(report?.score).toBeGreaterThanOrEqual(650);
      expect(report?.score).toBeLessThanOrEqual(950);
      expect(report?.applicationId).toBe('app-123');
      expect(report?.provider).toBe('CIBIL');
    });
  });

  describe('getCreditReport', () => {
    it('should return null for non-existent request', async () => {
      const report = await adapter.getCreditReport('non-existent-id');
      expect(report).toBeNull();
    });

    it('should return report with realistic credit history', async () => {
      const result = await adapter.pullCreditReport({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        provider: 'CIBIL',
      });

      await new Promise(resolve => setTimeout(resolve, 6000));

      const report = await adapter.getCreditReport(result.requestId);
      expect(report).not.toBeNull();
      expect(report?.reportData.creditHistory).toHaveProperty('totalAccounts');
      expect(report?.reportData.creditHistory).toHaveProperty('activeAccounts');
      expect(report?.reportData.accountDetails).toBeInstanceOf(Array);
    });
  });
});


