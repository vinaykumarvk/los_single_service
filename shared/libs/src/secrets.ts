/**
 * Secrets Management for GCP
 * Provides abstraction for retrieving secrets from GCP Secret Manager
 */

import { createLogger } from './logger';

const logger = createLogger('secrets-manager');

interface SecretCache {
  [key: string]: { value: string; timestamp: number };
}

// In-memory cache for secrets (TTL: 5 minutes)
const secretCache: SecretCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get secret from GCP Secret Manager
 * Falls back to environment variable if GCP is not configured
 */
export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = secretCache[secretName];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  // Try GCP Secret Manager if configured
  const projectId = process.env.GCP_PROJECT_ID;
  const useGCP = projectId && process.env.USE_GCP_SECRETS === 'true';

  if (useGCP) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
      const client = new SecretManagerServiceClient();
      
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      const secretValue = version.payload.data.toString('utf8');
      
      // Cache the value
      secretCache[secretName] = { value: secretValue, timestamp: Date.now() };
      
      logger.debug('SecretRetrievedFromGCP', { secretName, projectId });
      return secretValue;
    } catch (err) {
      logger.warn('GCPSecretRetrieveError', { 
        error: (err as Error).message, 
        secretName,
        fallback: 'Using environment variable' 
      });
      // Fall through to environment variable fallback
    }
  }

  // Fallback to environment variable
  const envKey = secretName.replace(/-/g, '_').toUpperCase();
  const envValue = process.env[envKey] || process.env[secretName];
  
  if (!envValue) {
    logger.warn('SecretNotFound', { secretName, envKey });
    throw new Error(`Secret ${secretName} not found in GCP or environment variables`);
  }

  // Cache the value
  secretCache[secretName] = { value: envValue, timestamp: Date.now() };
  
  logger.debug('SecretRetrievedFromEnv', { secretName, envKey });
  return envValue;
}

/**
 * Get multiple secrets at once
 */
export async function getSecrets(secretNames: string[]): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};
  
  await Promise.all(
    secretNames.map(async (name) => {
      try {
        secrets[name] = await getSecret(name);
      } catch (err) {
        logger.error('GetSecretError', { secretName: name, error: (err as Error).message });
        // Continue with other secrets, this one will be missing
      }
    })
  );
  
  return secrets;
}

/**
 * Clear secret cache (useful for testing or forced refresh)
 */
export function clearSecretCache(secretName?: string): void {
  if (secretName) {
    delete secretCache[secretName];
  } else {
    Object.keys(secretCache).forEach(key => delete secretCache[key]);
  }
}

