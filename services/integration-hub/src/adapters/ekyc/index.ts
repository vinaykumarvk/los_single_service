/**
 * eKYC Adapter Factory
 */

import { EKYCAdapter } from './types';
import { MockEKYCAdapter } from './mock';
import { NSDLAdapter } from './nsdl';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('ekyc-adapter-factory');

export function createEKYCAdapter(provider: 'NSDL' | 'AADHAAR_XML' | 'CKYC' = 'NSDL'): EKYCAdapter {
  const useMock = process.env.USE_MOCK_INTEGRATIONS !== 'false';
  
  if (useMock) {
    logger.info('UsingMockEKYCAdapter', { provider });
    return new MockEKYCAdapter();
  }
  
  // Switch to real adapters based on provider
  switch (provider) {
    case 'NSDL':
      logger.info('UsingNSDLAdapter', { provider });
      return new NSDLAdapter(); // Will use fallback mode if API keys not configured
    case 'AADHAAR_XML':
      // TODO: Implement AadhaarXMLAdapter
      logger.warn('AadhaarXMLAdapterNotImplemented', { provider });
      return new MockEKYCAdapter(); // Fallback to mock
    case 'CKYC':
      // TODO: Implement CKYCAdapter
      logger.warn('CKYCAdapterNotImplemented', { provider });
      return new MockEKYCAdapter(); // Fallback to mock
    default:
      logger.warn('UnknownProviderFallingBackToMock', { provider });
      return new MockEKYCAdapter();
  }
}


