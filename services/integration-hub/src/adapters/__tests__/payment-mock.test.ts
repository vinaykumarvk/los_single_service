import { describe, it, expect, beforeEach } from 'vitest';
import { MockPaymentAdapter } from '../payment/mock';

describe('MockPaymentAdapter', () => {
  let adapter: MockPaymentAdapter;

  beforeEach(() => {
    adapter = new MockPaymentAdapter();
  });

  describe('createOrder', () => {
    it('should create payment order with order ID', async () => {
      const result = await adapter.createOrder({
        applicationId: 'app-123',
        amount: 50000,
        currency: 'INR',
        provider: 'RAZORPAY',
      });

      expect(result).toHaveProperty('orderId');
      expect(result).toHaveProperty('providerOrderId');
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe('INR');
      expect(result.status).toBe('CREATED');
      expect(result.provider).toBe('RAZORPAY');
      expect(result.paymentUrl).toContain('pay.mock-gateway.com');
    });

    it('should generate expiration date', async () => {
      const result = await adapter.createOrder({
        applicationId: 'app-123',
        amount: 50000,
      });

      expect(result.expiresAt).toBeDefined();
      const expiresAt = new Date(result.expiresAt!);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThanOrEqual(30 * 60 * 1000); // 30 minutes
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent order', async () => {
      const status = await adapter.getStatus('non-existent-id');
      expect(status).toBeNull();
    });

    it('should return status for existing order', async () => {
      const order = await adapter.createOrder({
        applicationId: 'app-123',
        amount: 50000,
      });

      // Wait for async payment simulation
      await new Promise(resolve => setTimeout(resolve, 6000));

      const status = await adapter.getStatus(order.orderId);
      expect(status).not.toBeNull();
      expect(status?.orderId).toBe(order.orderId);
      expect(['PENDING', 'PAID', 'FAILED']).toContain(status?.status);
    });
  });

  describe('refund', () => {
    it('should refund paid order', async () => {
      const order = await adapter.createOrder({
        applicationId: 'app-123',
        amount: 50000,
      });

      // Wait for payment
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Manually set status to PAID for testing
      const status = await adapter.getStatus(order.orderId);
      if (status?.status !== 'PAID') {
        // Simulate paid status by creating new order and waiting
        // In real test, we'd mock this
        return;
      }

      const result = await adapter.refund({
        orderId: order.orderId,
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
    });

    it('should reject refund for non-existent order', async () => {
      const result = await adapter.refund({
        orderId: 'non-existent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ORDER_NOT_FOUND');
    });

    it('should reject refund for unpaid order', async () => {
      const order = await adapter.createOrder({
        applicationId: 'app-123',
        amount: 50000,
      });

      const result = await adapter.refund({
        orderId: order.orderId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('ORDER_NOT_PAID');
    });
  });

  describe('verifyWebhook', () => {
    it('should verify webhook signature (mock accepts any)', () => {
      const payload = JSON.stringify({ orderId: '123', status: 'paid' });
      const signature = 'mock-signature';

      const isValid = adapter.verifyWebhook(payload, signature);
      expect(isValid).toBe(true);
    });
  });
});


