/**
 * eKYC Adapter Factory
 */

import { EKYCAdapter } from './types';
import { MockEKYCAdapter } from './mock';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('ekyc-adapter-factory');

// TODO: Add NSDLAdapter, AadhaarXMLAdapter, CKYCAdapter implementations

export function createEKYCAdapter(provider: 'NSDL' | 'AADHAAR_XML' | 'CKYC' = 'NSDL'): EKYCAdapter {
  const useMock = process.env.USE_MOCK_INTEGRATIONS !== 'false';
  
  if (useMock) {
    logger.info('UsingMockEKYCAdapter', { provider });
    return new MockEKYCAdapter();
  }
  
  // Switch to real adapters based on provider
  // TODO: Implement real adapters
  logger.warn('RealEKYCAdaptersNotImplemented', { provider });
  return new MockEKYCAdapter(); // Fallback to mock
}


