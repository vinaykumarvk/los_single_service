import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockEKYCAdapter } from '../ekyc/mock';

describe('MockEKYCAdapter', () => {
  let adapter: MockEKYCAdapter;

  beforeEach(() => {
    adapter = new MockEKYCAdapter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('startVerification', () => {
    it('should return a session ID and pending status', async () => {
      const result = await adapter.startVerification({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        pan: 'ABCDE1234F',
        mobile: '9876543210',
        consent: true,
        purpose: 'KYC',
        provider: 'NSDL',
      });

      expect(result).toHaveProperty('sessionId');
      expect(result.status).toBe('PENDING');
      expect(result.provider).toBe('NSDL');
      expect(result.estimatedCompletionTime).toBe(5);
    });

    it('should require OTP for Aadhaar XML provider', async () => {
      const result = await adapter.startVerification({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        aadhaar: '123456789012',
        mobile: '9876543210',
        consent: true,
        purpose: 'KYC',
        provider: 'AADHAAR_XML',
      });

      expect(result.requiresOTP).toBe(true);
      expect(result.maskedMobile).toBeDefined();
      if (result.maskedMobile) {
        expect(result.maskedMobile).toContain('****');
      }
    });

    it('should mask mobile number', async () => {
      const result = await adapter.startVerification({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        mobile: '9876543210',
        consent: true,
        purpose: 'KYC',
      });

      expect(result.maskedMobile).toBe('******3210');
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent session', async () => {
      const status = await adapter.getStatus('non-existent-id');
      expect(status).toBeNull();
    });

    it('should return status for existing session', async () => {
      const startResult = await adapter.startVerification({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        consent: true,
        purpose: 'KYC',
      });

      const status = await adapter.getStatus(startResult.sessionId);
      expect(status).not.toBeNull();
      expect(status?.sessionId).toBe(startResult.sessionId);
      expect(status?.status).toBe('PENDING');
    });
  });

  describe('submitOTP', () => {
    it('should accept valid 6-digit OTP', async () => {
      const startResult = await adapter.startVerification({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        consent: true,
        purpose: 'KYC',
      });

      const result = await adapter.submitOTP(startResult.sessionId, '123456');
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('VERIFIED');
      
      const status = await adapter.getStatus(startResult.sessionId);
      expect(status?.status).toBe('COMPLETED');
      expect(status?.kycStatus).toBe('VERIFIED');
    });

    it('should reject invalid OTP format', async () => {
      const startResult = await adapter.startVerification({
        applicationId: 'app-123',
        applicantId: 'appl-456',
        consent: true,
        purpose: 'KYC',
      });

      const result = await adapter.submitOTP(startResult.sessionId, '123');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('INVALID_OTP');
    });

    it('should reject OTP for non-existent session', async () => {
      const result = await adapter.submitOTP('non-existent', '123456');
      
      expect(result.success).toBe(false);
      expect(result.status).toBe('SESSION_NOT_FOUND');
    });
  });
});

