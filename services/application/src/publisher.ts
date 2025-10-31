import { createPgPool, runOutboxPublisher, logPublish, createKafkaPublish, createKafkaClientIfConfigured } from '@los/shared-libs';

async function main() {
  const pool = createPgPool();
  const kafkaClient = createKafkaClientIfConfigured();
  const publishFn = kafkaClient 
    ? createKafkaPublish(kafkaClient)
    : logPublish;
  
  if (kafkaClient) {
    // eslint-disable-next-line no-console
    console.log('Using Kafka publisher');
  } else {
    // eslint-disable-next-line no-console
    console.log('Using log publisher (set KAFKA_BROKERS to use Kafka)');
  }
  
  await runOutboxPublisher(pool, publishFn, { batchSize: 50, intervalMs: 1000 });
}

// eslint-disable-next-line no-console
main().catch((e) => console.error(e));


