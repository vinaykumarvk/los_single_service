import { Pool } from 'pg';

type PublishFn = (topic: string, eventType: string, payload: unknown, headers: Record<string, string>) => Promise<void>;

export async function runOutboxPublisher(pool: Pool, publish: PublishFn, options?: { batchSize?: number; intervalMs?: number }) {
  const batchSize = options?.batchSize ?? 50;
  const intervalMs = options?.intervalMs ?? 1000;

  // naive loop; replace with worker framework in production
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT id, topic, event_type, payload, headers FROM outbox
         WHERE published_at IS NULL
         ORDER BY occurred_at ASC
         LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [batchSize]
      );

      for (const row of rows) {
        const headers = row.headers || {};
        await publish(row.topic, row.event_type, row.payload, headers);
        await client.query('UPDATE outbox SET published_at = now(), attempts = attempts + 1 WHERE id = $1', [row.id]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      // eslint-disable-next-line no-console
      console.error('Outbox publish error', err);
    } finally {
      client.release();
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

export async function logPublish(topic: string, eventType: string, payload: unknown, headers: Record<string, string>) {
  // eslint-disable-next-line no-console
  console.log('PUBLISH', { topic, eventType, headers, payload });
}

// Kafka publisher factory
export function createKafkaPublish(kafkaClient: any, defaultTopic?: string) {
  const producer = kafkaClient.producer();
  let connected = false;
  
  async function ensureConnected() {
    if (!connected) {
      await producer.connect();
      connected = true;
    }
  }

  return async (topic: string, eventType: string, payload: unknown, headers: Record<string, string>) => {
    await ensureConnected();
    const targetTopic = defaultTopic || topic;
    const message = {
      topic: targetTopic,
      messages: [{
        key: headers.aggregateId || eventType,
        value: JSON.stringify({
          eventType,
          payload,
          headers: { ...headers, occurredAt: new Date().toISOString() }
        }),
        headers
      }]
    };
    await producer.send(message);
  };
}

// Helper to create Kafka client (optional, only if KAFKA_BROKERS is set)
export function createKafkaClientIfConfigured() {
  const brokers = (process.env.KAFKA_BROKERS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (brokers.length === 0) return null;
  // Dynamic import to avoid requiring kafkajs if not used
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Kafka } = require('kafkajs');
    return new Kafka({
      brokers,
      clientId: process.env.KAFKA_CLIENT_ID || 'los-outbox-publisher'
    });
  } catch {
    return null;
  }
}


