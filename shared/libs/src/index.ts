import { Pool, PoolConfig } from 'pg';

export function createPgPool(configOrUrl?: string | PoolConfig): Pool {
  if (typeof configOrUrl === 'string' || !configOrUrl) {
    return new Pool({ connectionString: (configOrUrl as string) || process.env.DATABASE_URL });
  }
  return new Pool(configOrUrl as PoolConfig);
}

export type OutboxEvent = {
  id: string;
  aggregateId: string;
  topic: string;
  eventType: string;
  payload: unknown;
  headers?: Record<string, string>;
};

export async function writeOutboxEvent(pool: Pool, event: OutboxEvent): Promise<void> {
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

export { runOutboxPublisher, logPublish, createKafkaPublish, createKafkaClientIfConfigured } from './outboxPublisher';
export { correlationIdMiddleware, createLogger } from './logger';
export { startSpan } from './tracing';
export { maskPAN, maskAadhaar, redactPII } from './masking';
export { createS3Client, putObjectBuffer, getPresignedUrl } from './s3';
export { metricsMiddleware, metricsHandler } from './metrics';


