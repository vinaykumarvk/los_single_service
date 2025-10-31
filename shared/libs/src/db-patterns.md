# Database Persistence Patterns

## Transactional Outbox Pattern

All domain events are written to the `outbox` table **within the same database transaction** as the domain state change. This ensures exactly-once semantics when the outbox publisher reads and publishes to Kafka.

### Example Pattern:

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // 1. Update domain state
  await client.query('INSERT INTO applications (...) VALUES (...)', [...]);
  
  // 2. Write outbox event in same transaction
  await client.query(
    'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
    [eventId, aggregateId, topic, eventType, JSON.stringify(payload), JSON.stringify(headers)]
  );
  
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

## Validation Pattern

Use Zod schemas for input validation before database operations:

```typescript
const Schema = z.object({ ... });
const parsed = Schema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
}
```

## Error Handling Pattern

Always use try/catch with proper rollback and connection release:

```typescript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... operations ...
  await client.query('COMMIT');
  return res.status(200).json(result);
} catch (err) {
  await client.query('ROLLBACK');
  logger.error('OperationError', { error: (err as Error).message });
  return res.status(500).json({ error: 'Operation failed' });
} finally {
  client.release();
}
```

