/**
 * Payment Gateway Adapter Factory
 */

import { PaymentAdapter } from './types';
import { MockPaymentAdapter } from './mock';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('payment-adapter-factory');

// TODO: Add RazorpayAdapter, PayUAdapter, StripeAdapter implementations

export function createPaymentAdapter(provider: 'RAZORPAY' | 'PAYU' | 'STRIPE' = 'RAZORPAY'): PaymentAdapter {
  const useMock = process.env.USE_MOCK_INTEGRATIONS !== 'false';
  
  if (useMock) {
    logger.info('UsingMockPaymentAdapter', { provider });
    return new MockPaymentAdapter();
  }
  
  // Switch to real adapters based on provider
  // TODO: Implement real adapters
  logger.warn('RealPaymentAdaptersNotImplemented', { provider });
  return new MockPaymentAdapter(); // Fallback to mock
}


