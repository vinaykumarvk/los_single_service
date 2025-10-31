/**
 * Mock Payment Gateway Adapter
 * Returns realistic dummy responses matching real payment gateway API contract
 */

import { v4 as uuidv4 } from 'uuid';
import { PaymentAdapter, PaymentOrderRequest, PaymentOrderResponse, PaymentStatus, PaymentRefundRequest } from './types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('payment-mock-adapter');

export class MockPaymentAdapter implements PaymentAdapter {
  // Store simulated orders (in production, this would be in database)
  private mockOrders: Map<string, PaymentStatus> = new Map();
  
  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    logger.info('MockPaymentCreateOrder', { applicationId: request.applicationId, amount: request.amount, provider: request.provider });
    
    const orderId = uuidv4();
    const providerOrderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const provider = request.provider || 'RAZORPAY';
    
    // Initialize order status
    const status: PaymentStatus = {
      orderId,
      providerOrderId,
      status: 'PENDING',
      amount: request.amount,
      currency: request.currency || 'INR'
    };
    this.mockOrders.set(orderId, status);
    
    // Generate payment URL (mock)
    const paymentUrl = `https://pay.mock-gateway.com/pay/${providerOrderId}`;
    
    // Simulate auto-payment after delay (for testing)
    setTimeout(() => {
      this.simulatePayment(orderId, providerOrderId);
    }, 5000 + Math.random() * 5000); // 5-10 second delay
    
    return {
      orderId,
      providerOrderId,
      amount: request.amount,
      currency: request.currency || 'INR',
      status: 'CREATED',
      provider,
      paymentUrl,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    };
  }
  
  async getStatus(orderId: string): Promise<PaymentStatus | null> {
    logger.debug('MockPaymentGetStatus', { orderId });
    return this.mockOrders.get(orderId) || null;
  }
  
  async refund(request: PaymentRefundRequest): Promise<{ success: boolean; refundId?: string; error?: string }> {
    logger.info('MockPaymentRefund', { orderId: request.orderId, amount: request.amount });
    
    const order = this.mockOrders.get(request.orderId);
    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND' };
    }
    
    if (order.status !== 'PAID') {
      return { success: false, error: 'ORDER_NOT_PAID' };
    }
    
    // Simulate successful refund
    const refundId = `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    order.status = 'REFUNDED';
    
    logger.info('MockPaymentRefunded', { orderId: request.orderId, refundId });
    return { success: true, refundId };
  }
  
  verifyWebhook(payload: string, signature: string): boolean {
    // Mock: Accept any signature for testing
    // In production, verify using provider's webhook secret
    logger.debug('MockPaymentVerifyWebhook', { hasSignature: !!signature });
    return true;
  }
  
  private simulatePayment(orderId: string, providerOrderId: string): void {
    const order = this.mockOrders.get(orderId);
    if (!order) return;
    
    // Simulate 85% success rate
    if (Math.random() > 0.15) {
      order.status = 'PAID';
      order.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      order.paymentMethod = 'UPI';
      order.paidAt = new Date().toISOString();
      
      logger.info('MockPaymentCompleted', { orderId, transactionId: order.transactionId });
    } else {
      order.status = 'FAILED';
      order.failureReason = 'Payment declined by bank';
      
      logger.info('MockPaymentFailed', { orderId, reason: order.failureReason });
    }
  }
}


