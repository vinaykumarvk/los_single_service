import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool } from '@los/shared-libs';
import { createKafka, startConsumer } from './kafka';

const app = express();
app.use(json());
const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

// Dev-only: inject events to drive saga
app.post('/dev/events', async (req, res) => {
  const { type, payload } = req.body || {};
  if (!type) return res.status(400).json({ error: 'type required' });

  // Very basic state machine to illustrate flow
  // In production, subscribe to Kafka and handle events with durable state
  if (type === 'los.application.ApplicationSubmitted.v1') {
    const sagaId = uuidv4();
    await pool.query(
      'INSERT INTO saga_instances (saga_id, application_id, state) VALUES ($1, $2, $3) ON CONFLICT (saga_id) DO NOTHING',
      [sagaId, payload?.applicationId, 'KYC_REQUESTED']
    );
    await pool.query('INSERT INTO saga_logs (id, saga_id, step, detail) VALUES ($1, $2, $3, $4)', [
      uuidv4(),
      sagaId,
      'ApplicationSubmitted',
      JSON.stringify(payload || {})
    ]);
    // Next commands would be: start KYC, bureau pull, etc.
    return res.status(202).json({ sagaId, next: ['StartKYC', 'BureauPull'] });
  }

  if (type === 'los.kyc.KycCompleted.v1') {
    // Update state to VERIFICATION_COMPLETE (simplified)
    await pool.query('UPDATE saga_instances SET state = $1, updated_at = now() WHERE application_id = $2', [
      'VERIFICATION_COMPLETE',
      payload?.applicationId,
    ]);
    await pool.query('INSERT INTO saga_logs (id, saga_id, step, detail) SELECT $1, saga_id, $2, $3 FROM saga_instances WHERE application_id = $4', [
      uuidv4(),
      'KycCompleted',
      JSON.stringify(payload || {}),
      payload?.applicationId,
    ]);
    return res.status(202).json({ next: ['Underwrite'] });
  }

  if (type === 'los.underwriting.DecisionMade.v1') {
    await pool.query('UPDATE saga_instances SET state = $1, updated_at = now() WHERE application_id = $2', [
      payload?.finalDecision === 'APPROVED' ? 'SANCTION' : 'REJECTED',
      payload?.applicationId,
    ]);
    await pool.query('INSERT INTO saga_logs (id, saga_id, step, detail) SELECT $1, saga_id, $2, $3 FROM saga_instances WHERE application_id = $4', [
      uuidv4(),
      'DecisionMade',
      JSON.stringify(payload || {}),
      payload?.applicationId,
    ]);
    return res.status(202).json({ next: payload?.finalDecision === 'APPROVED' ? ['IssueSanction'] : [] });
  }

  return res.status(202).json({ ignored: type });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3010;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator service listening on ${port}`);
});

// Start Kafka consumer if configured
const kafka = createKafka();
if (kafka) {
  // eslint-disable-next-line no-console
  console.log('Kafka detected, starting consumer...');
  startConsumer(kafka).catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Kafka consumer error', e);
  });
}


