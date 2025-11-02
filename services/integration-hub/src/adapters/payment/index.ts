/**
 * Payment Gateway Adapter Factory
 */

import { PaymentAdapter } from './types';
import { MockPaymentAdapter } from './mock';
import { RazorpayAdapter } from './razorpay';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('payment-adapter-factory');

export function createPaymentAdapter(provider: 'RAZORPAY' | 'PAYU' | 'STRIPE' = 'RAZORPAY'): PaymentAdapter {
  const useMock = process.env.USE_MOCK_INTEGRATIONS !== 'false';
  
  if (useMock) {
    logger.info('UsingMockPaymentAdapter', { provider });
    return new MockPaymentAdapter();
  }
  
  // Switch to real adapters based on provider
  switch (provider) {
    case 'RAZORPAY':
      logger.info('UsingRazorpayAdapter', { provider });
      return new RazorpayAdapter(); // Will use fallback mode if API keys not configured
    case 'PAYU':
      // TODO: Implement PayUAdapter
      logger.warn('PayUAdapterNotImplemented', { provider });
      return new MockPaymentAdapter(); // Fallback to mock
    case 'STRIPE':
      // TODO: Implement StripeAdapter
      logger.warn('StripeAdapterNotImplemented', { provider });
      return new MockPaymentAdapter(); // Fallback to mock
    default:
      logger.warn('UnknownProviderFallingBackToMock', { provider });
      return new MockPaymentAdapter();
  }
}


