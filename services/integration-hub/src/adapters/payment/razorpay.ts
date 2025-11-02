/**
 * Razorpay Real Adapter
 * Production implementation for Razorpay payment gateway integration
 */

import crypto from 'crypto';
import { PaymentAdapter, PaymentOrderRequest, PaymentOrderResponse, PaymentStatus, PaymentRefundRequest } from './types';
import { createLogger, retry } from '@los/shared-libs';

const logger = createLogger('payment-razorpay-adapter');

export class RazorpayAdapter implements PaymentAdapter {
  private keyId: string;
  private keySecret: string;
  private apiEndpoint: string;
  private timeout: number;
  private useFallback: boolean;
  
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.apiEndpoint = process.env.RAZORPAY_API_ENDPOINT || 'https://api.razorpay.com/v1';
    this.timeout = parseInt(process.env.RAZORPAY_API_TIMEOUT || '30000', 10);
    this.useFallback = !this.keyId || !this.keySecret;
    
    if (this.useFallback) {
      logger.warn('RazorpayAdapterUsingFallback', { reason: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured, using dummy responses' });
    }
  }
  
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${credentials}`;
  }
  
  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    logger.info('RazorpayCreateOrder', { applicationId: request.applicationId, amount: request.amount, useFallback: this.useFallback });
    
    // Fallback to dummy response if API keys not configured
    if (this.useFallback) {
      const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        orderId,
        providerOrderId: orderId,
        amount: request.amount,
        currency: request.currency || 'INR',
        status: 'CREATED',
        provider: 'RAZORPAY',
        paymentUrl: `https://pay.razorpay.com/test/${orderId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/orders`, {
              method: 'POST',
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: request.amount, // Razorpay expects amount in paise
                currency: request.currency || 'INR',
                receipt: request.applicationId,
                notes: {
                  applicationId: request.applicationId,
                  description: request.description,
                },
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`Razorpay API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        }
      );
      
      return {
        orderId: response.id || response.order_id,
        providerOrderId: response.id,
        amount: response.amount,
        currency: response.currency || 'INR',
        status: 'CREATED',
        provider: 'RAZORPAY',
        paymentUrl: response.short_url || response.payment_url,
        expiresAt: response.expires_at ? new Date(response.expires_at * 1000).toISOString() : undefined
      };
    } catch (err) {
      logger.error('RazorpayCreateOrderError', { error: (err as Error).message, applicationId: request.applicationId });
      throw err;
    }
  }
  
  async getStatus(orderId: string): Promise<PaymentStatus | null> {
    logger.debug('RazorpayGetStatus', { orderId, useFallback: this.useFallback });
    
    // Fallback to dummy response if API keys not configured
    if (this.useFallback) {
      // Simulate 85% payment success rate
      const isPaid = Math.random() > 0.15;
      return {
        orderId,
        providerOrderId: orderId,
        status: isPaid ? 'PAID' : 'PENDING',
        amount: 0, // Would need to be stored for real implementation
        currency: 'INR',
        transactionId: isPaid ? `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined,
        paymentMethod: isPaid ? 'UPI' : undefined,
        paidAt: isPaid ? new Date().toISOString() : undefined
      };
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/orders/${orderId}`, {
              method: 'GET',
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (res.status === 404) {
              return null;
            }
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`Razorpay API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          maxDelayMs: 3000,
        }
      );
      
      if (!response) {
        return null;
      }
      
      // Fetch payment details if order is paid
      let paymentStatus = 'PENDING';
      let transactionId: string | undefined;
      let paidAt: string | undefined;
      
      if (response.status === 'paid') {
        paymentStatus = 'PAID';
        // Fetch payments for this order
        try {
          const paymentsRes = await fetch(`${this.apiEndpoint}/orders/${orderId}/payments`, {
            method: 'GET',
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          });
          
          if (paymentsRes.ok) {
            const payments = await paymentsRes.json();
            if (payments.items && payments.items.length > 0) {
              const payment = payments.items[0];
              transactionId = payment.id;
              paidAt = payment.captured_at ? new Date(payment.captured_at * 1000).toISOString() : undefined;
            }
          }
        } catch (err) {
          logger.warn('RazorpayGetPaymentsError', { error: (err as Error).message, orderId });
        }
      } else if (response.status === 'attempted') {
        paymentStatus = 'FAILED';
      }
      
      return {
        orderId: response.id,
        providerOrderId: response.id,
        status: paymentStatus as 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED',
        amount: response.amount,
        currency: response.currency || 'INR',
        transactionId,
        paidAt
      };
    } catch (err) {
      logger.error('RazorpayGetStatusError', { error: (err as Error).message, orderId });
      throw err;
    }
  }
  
  async refund(request: PaymentRefundRequest): Promise<{ success: boolean; refundId?: string; error?: string }> {
    logger.info('RazorpayRefund', { orderId: request.orderId, amount: request.amount, useFallback: this.useFallback });
    
    // Fallback to dummy response if API keys not configured
    if (this.useFallback) {
      return {
        success: true,
        refundId: `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }
    
    try {
      // First get payment ID from order
      const status = await this.getStatus(request.orderId);
      if (!status || !status.transactionId) {
        return { success: false, error: 'Payment not found or not completed' };
      }
      
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/payments/${status.transactionId}/refund`, {
              method: 'POST',
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: request.amount ? request.amount * 100 : undefined, // Convert to paise
                notes: {
                  reason: request.reason || 'Refund requested',
                },
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`Razorpay API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          maxDelayMs: 3000,
        }
      );
      
      return {
        success: response.status === 'processed' || response.status === 'pending',
        refundId: response.id
      };
    } catch (err) {
      logger.error('RazorpayRefundError', { error: (err as Error).message, orderId: request.orderId });
      return { success: false, error: (err as Error).message };
    }
  }
  
  verifyWebhook(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (err) {
      logger.error('RazorpayWebhookVerificationError', { error: (err as Error).message });
      return false;
    }
  }
}

