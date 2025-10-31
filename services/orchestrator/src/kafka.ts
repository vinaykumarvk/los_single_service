import { Kafka, logLevel } from 'kafkajs';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('orchestrator-kafka');

export function createKafka() {
  const brokers = (process.env.KAFKA_BROKERS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (brokers.length === 0) return null;
  return new Kafka({ brokers, clientId: process.env.KAFKA_CLIENT_ID || 'los-orchestrator', logLevel: logLevel.ERROR });
}

export async function startConsumer(kafka: Kafka, groupId = 'los-orchestrator-group', topics?: string[]) {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  const subscribeTopics = topics && topics.length ? topics : [
    'los.application.ApplicationSubmitted.v1',
    'los.kyc.KycCompleted.v1',
    'los.underwriting.DecisionMade.v1',
  ];
  for (const t of subscribeTopics) await consumer.subscribe({ topic: t, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const payloadStr = message.value?.toString('utf8') || '{}';
        const payload = JSON.parse(payloadStr);
        logger.info('EventReceived', { topic, key: message.key?.toString(), payload });
        // No-op here; HTTP handler in server.ts updates saga state. You may route to same handlers.
      } catch (e) {
        logger.error('EventProcessingError', { error: (e as Error).message });
      }
    }
  });
}

export async function createProducer(kafka: Kafka) {
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}


