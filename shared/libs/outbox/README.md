Outbox pattern (transactional outbox)

- Use the `outbox` table per service for exactly-once event publication via a relay.
- Insert domain event JSON in the same DB transaction as state change.
- A background publisher reads `outbox` rows and publishes to Kafka, marking as sent.

