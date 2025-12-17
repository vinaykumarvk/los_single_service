import { Pool, PoolConfig } from 'pg';
import { createSupabaseClient, executeQuery, beginTransaction, executeRPC } from './supabase-client';
import type { SupabaseClient, SupabaseQueryResult, SupabaseTransaction } from './supabase-client';

// DEPRECATED: Use createSupabaseClient() instead
// Kept for backward compatibility during migration
export function createPgPool(configOrUrl?: string | PoolConfig): Pool {
  console.warn('⚠️  createPgPool() is deprecated. Use createSupabaseClient() instead.');
  let poolConfig: PoolConfig;
  
  if (typeof configOrUrl === 'string' || !configOrUrl) {
    const connectionString = (configOrUrl as string) || process.env.DATABASE_URL;
    poolConfig = { connectionString };
  } else {
    poolConfig = { ...configOrUrl };
  }
  
  // Handle SSL for Supabase and other cloud databases
  const connectionString = poolConfig.connectionString || process.env.DATABASE_URL || '';
  if (connectionString.includes('supabase.co') || connectionString.includes('sslmode=require')) {
    // Respect PGSSLMODE environment variable or default to no-verify for Supabase
    const sslMode = process.env.PGSSLMODE || 'no-verify';
    const existingSsl = typeof poolConfig.ssl === 'object' && poolConfig.ssl !== null ? poolConfig.ssl : {};
    poolConfig.ssl = {
      ...existingSsl,
      rejectUnauthorized: sslMode === 'no-verify' || sslMode === 'disable'
    } as any;
    // Also ensure connection string has sslmode if it's a Supabase URL
    if (connectionString.includes('supabase.co') && !connectionString.includes('sslmode=')) {
      const separator = connectionString.includes('?') ? '&' : '?';
      poolConfig.connectionString = `${connectionString}${separator}sslmode=require`;
    }
  }
  
  return new Pool(poolConfig);
}

// Export Supabase client functions
export { 
  createSupabaseClient, 
  executeQuery, 
  beginTransaction, 
  executeRPC,
  query,
  querySupabase,
  connect,
  connectSupabase
} from './supabase-client';
export type { SupabaseClient, SupabaseQueryResult, SupabaseTransaction };

export type OutboxEvent = {
  id: string;
  aggregateId: string;
  topic: string;
  eventType: string;
  payload: unknown;
  headers?: Record<string, string>;
};

// DEPRECATED: Use Supabase client version instead
export async function writeOutboxEvent(pool: Pool, event: OutboxEvent): Promise<void> {
  console.warn('⚠️  writeOutboxEvent(pool) is deprecated. Use writeOutboxEventSupabase() instead.');
  const query = `INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers)
                 VALUES ($1, $2, $3, $4, $5, $6)`;
  await pool.query(query, [
    event.id,
    event.aggregateId,
    event.topic,
    event.eventType,
    JSON.stringify(event.payload),
    JSON.stringify(event.headers || {})
  ]);
}

// New Supabase version
export async function writeOutboxEventSupabase(supabaseClient: SupabaseClient, event: OutboxEvent): Promise<void> {
  const { error } = await supabaseClient.from('outbox').insert({
    id: event.id,
    aggregate_id: event.aggregateId,
    topic: event.topic,
    event_type: event.eventType,
    payload: event.payload,
    headers: event.headers || {}
  });
  if (error) throw error;
}

export { runOutboxPublisher, logPublish, createKafkaPublish, createKafkaClientIfConfigured } from './outboxPublisher';
export { correlationIdMiddleware, createLogger } from './logger';
export { startSpan } from './tracing';
export { maskPAN, maskAadhaar, redactPII } from './masking';
export { 
  encryptField, decryptField, 
  encryptPAN, decryptPAN, 
  encryptAadhaar, decryptAadhaar, 
  encryptEmail, decryptEmail,
  encryptMobile, decryptMobile,
  encryptAddress, decryptAddress,
  isEncrypted 
} from './encryption';
export { createS3Client, putObjectBuffer, getPresignedUrl } from './s3';
export { metricsMiddleware, metricsHandler } from './metrics';
export { verifySignature, signPayload } from './webhook';
export { getSecret, getSecrets, clearSecretCache } from './secrets';
export { checkBlacklistWhitelist, addToBlacklist, addToWhitelist } from './blacklist';
export { 
  CircuitBreaker, 
  CircuitBreakerOpenError, 
  getCircuitBreaker,
  CircuitState 
} from './circuit-breaker';
export { 
  retry, 
  withRetry, 
  RetryableError 
} from './retry';


