/**
 * Scoring Adapter Factory
 * 
 * Creates and manages scoring adapters (internal ML or third-party)
 */

import { ScoringAdapter, ScoringRequest } from './types';
import { InternalMLScoringAdapter } from './internal-ml';
import { createThirdPartyScoringAdapter, ThirdPartyScoringConfig } from './third-party';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('scoring-adapter-factory');

/**
 * Supported scoring providers
 */
export type ScoringProvider = 
  | 'INTERNAL_ML'
  | 'EXPERIAN'
  | 'EQUIFAX'
  | 'FICO'
  | 'CUSTOM';

/**
 * Create scoring adapter based on provider name
 */
export function createScoringAdapter(provider: ScoringProvider = 'INTERNAL_ML'): ScoringAdapter {
  logger.info('CreatingScoringAdapter', { provider });

  switch (provider) {
    case 'INTERNAL_ML':
      return new InternalMLScoringAdapter();

    case 'EXPERIAN':
      return createThirdPartyScoringAdapter('Experian', {
        apiUrl: process.env.EXPERIAN_SCORING_API_URL || '',
        apiKey: process.env.EXPERIAN_API_KEY,
        apiSecret: process.env.EXPERIAN_API_SECRET,
        timeout: parseInt(process.env.EXPERIAN_TIMEOUT || '30000', 10)
      });

    case 'EQUIFAX':
      return createThirdPartyScoringAdapter('Equifax', {
        apiUrl: process.env.EQUIFAX_SCORING_API_URL || '',
        apiKey: process.env.EQUIFAX_API_KEY,
        apiSecret: process.env.EQUIFAX_API_SECRET,
        timeout: parseInt(process.env.EQUIFAX_TIMEOUT || '30000', 10)
      });

    case 'FICO':
      return createThirdPartyScoringAdapter('FICO', {
        apiUrl: process.env.FICO_SCORING_API_URL || '',
        apiKey: process.env.FICO_API_KEY,
        apiSecret: process.env.FICO_API_SECRET,
        timeout: parseInt(process.env.FICO_TIMEOUT || '30000', 10)
      });

    case 'CUSTOM':
      return createThirdPartyScoringAdapter('Custom', {
        apiUrl: process.env.CUSTOM_SCORING_API_URL || '',
        apiKey: process.env.CUSTOM_SCORING_API_KEY,
        apiSecret: process.env.CUSTOM_SCORING_API_SECRET,
        timeout: parseInt(process.env.CUSTOM_SCORING_TIMEOUT || '30000', 10)
      });

    default:
      logger.warn('UnknownScoringProvider', { provider, fallingBackTo: 'INTERNAL_ML' });
      return new InternalMLScoringAdapter();
  }
}

/**
 * Get available scoring providers
 */
export function getAvailableProviders(): ScoringProvider[] {
  const providers: ScoringProvider[] = ['INTERNAL_ML']; // Always available

  // Check third-party providers
  if (process.env.EXPERIAN_SCORING_API_URL && process.env.EXPERIAN_API_KEY) {
    providers.push('EXPERIAN');
  }
  if (process.env.EQUIFAX_SCORING_API_URL && process.env.EQUIFAX_API_KEY) {
    providers.push('EQUIFAX');
  }
  if (process.env.FICO_SCORING_API_URL && process.env.FICO_API_KEY) {
    providers.push('FICO');
  }
  if (process.env.CUSTOM_SCORING_API_URL && process.env.CUSTOM_SCORING_API_KEY) {
    providers.push('CUSTOM');
  }

  return providers;
}

/**
 * Fallback scoring strategy
 * Try primary provider, fallback to internal ML if fails
 */
export async function calculateWithFallback(
  request: ScoringRequest,
  primaryProvider: ScoringProvider = 'INTERNAL_ML',
  fallbackProvider: ScoringProvider = 'INTERNAL_ML'
): Promise<{ result: any; providerUsed: ScoringProvider }> {
  try {
    const adapter = createScoringAdapter(primaryProvider);
    if (!adapter.isAvailable()) {
      throw new Error(`Primary provider ${primaryProvider} is not available`);
    }

    const result = await adapter.calculate(request);
    return { result, providerUsed: primaryProvider };

  } catch (err) {
    logger.warn('PrimaryScoringProviderFailed', {
      provider: primaryProvider,
      error: (err as Error).message,
      fallingBackTo: fallbackProvider
    });

    // Fallback to internal ML (always available)
    const fallbackAdapter = createScoringAdapter(fallbackProvider);
    const result = await fallbackAdapter.calculate(request);
    return { result, providerUsed: fallbackProvider };
  }
}
