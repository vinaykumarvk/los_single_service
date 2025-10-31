/**
 * Payment Gateway Integration Types
 * Common interface for payment gateways (Razorpay, PayU, Stripe)
 */

export interface PaymentOrderRequest {
  applicationId: string;
  amount: number; // in paise (for INR)
  currency: 'INR' | 'USD';
  description?: string;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    mobile?: string;
  };
  provider?: 'RAZORPAY' | 'PAYU' | 'STRIPE';
}

export interface PaymentOrderResponse {
  orderId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED';
  provider: string;
  paymentUrl?: string; // For redirect-based payment
  expiresAt?: string; // ISO timestamp
}

export interface PaymentStatus {
  orderId: string;
  providerOrderId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: string;
  transactionId?: string;
  paymentMethod?: string;
  paidAt?: string;
  failureReason?: string;
}

export interface PaymentRefundRequest {
  orderId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface PaymentAdapter {
  /**
   * Create payment order
   */
  createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse>;
  
  /**
   * Get payment status
   */
  getStatus(orderId: string): Promise<PaymentStatus | null>;
  
  /**
   * Process refund
   */
  refund(request: PaymentRefundRequest): Promise<{ success: boolean; refundId?: string; error?: string }>;
  
  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): boolean;
}


