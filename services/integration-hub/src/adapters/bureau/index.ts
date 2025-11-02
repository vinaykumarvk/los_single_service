/**
 * Bureau Adapter Factory
 * Creates appropriate adapter based on environment configuration
 */

import { BureauAdapter } from './types';
import { MockBureauAdapter } from './mock';
import { CIBILAdapter } from './cibil';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('bureau-adapter-factory');

export function createBureauAdapter(provider: 'CIBIL' | 'EXPERIAN' | 'EQUIFAX' = 'CIBIL'): BureauAdapter {
  const useMock = process.env.USE_MOCK_INTEGRATIONS !== 'false';
  
  if (useMock) {
    logger.info('UsingMockBureauAdapter', { provider });
    return new MockBureauAdapter();
  }
  
  // Switch to real adapters based on provider
  switch (provider) {
    case 'CIBIL':
      try {
        logger.info('UsingCIBILAdapter', { provider });
        return new CIBILAdapter();
      } catch (err) {
        logger.warn('CIBILAdapterInitFailed', { error: (err as Error).message, provider });
        return new MockBureauAdapter(); // Fallback to mock
      }
    case 'EXPERIAN':
      // TODO: Implement ExperianAdapter
      logger.warn('ExperianAdapterNotImplemented', { provider });
      return new MockBureauAdapter(); // Fallback to mock
    case 'EQUIFAX':
      // TODO: Implement EquifaxAdapter
      logger.warn('EquifaxAdapterNotImplemented', { provider });
      return new MockBureauAdapter(); // Fallback to mock
    default:
      logger.warn('UnknownProviderFallingBackToMock', { provider });
      return new MockBureauAdapter();
  }
}


