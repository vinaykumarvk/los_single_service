import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';

const app = express();
app.use(json());
app.use(correlationIdMiddleware);
const pool = createPgPool();
const logger = createLogger('sanction-offer-service');

app.get('/health', (_req, res) => res.status(200).send('OK'));

function calcEmi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return +(principal / months).toFixed(2);
  const pow = Math.pow(1 + r, months);
  const emi = principal * r * pow / (pow - 1);
  return +emi.toFixed(2);
}

const SanctionSchema = z.object({
  sanctionedAmount: z.number().min(1),
  tenureMonths: z.number().int().min(1),
  rateAnnual: z.number().min(0)
});

// POST /api/applications/:id/sanction - issue sanction
app.post('/api/applications/:id/sanction', async (req, res) => {
  const parsed = SanctionSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const sanctionId = uuidv4();
  const { sanctionedAmount, tenureMonths, rateAnnual } = parsed.data;
  const emi = calcEmi(sanctionedAmount, rateAnnual, tenureMonths);
  const offerUrl = `https://offer.example/${sanctionId}`;
  const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Persist sanction
    await client.query(
      'INSERT INTO sanctions (sanction_id, application_id, sanctioned_amount, tenure_months, rate_annual, emi, status, offer_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [sanctionId, req.params.id, sanctionedAmount, tenureMonths, rateAnnual, emi, 'ISSUED', offerUrl]
    );

    // Write SanctionIssued event
    const eventId1 = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId1, req.params.id, 'los.sanction.SanctionIssued.v1', 'los.sanction.SanctionIssued.v1', JSON.stringify({ applicationId: req.params.id, sanctionId, sanctionedAmount, tenureMonths, rateAnnual, emi }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    // Write OfferGenerated event
    const eventId2 = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId2, req.params.id, 'los.sanction.OfferGenerated.v1', 'los.sanction.OfferGenerated.v1', JSON.stringify({ applicationId: req.params.id, sanctionId, offerUrl }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('SanctionIssued', { correlationId: (req as any).correlationId, applicationId: req.params.id, sanctionId });
    return res.status(201).json({ sanctionId, emi, offerUrl, validTill });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('SanctionIssueError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to issue sanction' });
  } finally {
    client.release();
  }
});

// POST /api/applications/:id/offer/accept - accept offer
app.post('/api/applications/:id/offer/accept', async (req, res) => {
  const sanctionId = req.body?.sanctionId as string | undefined;
  if (!sanctionId) return res.status(400).json({ error: 'sanctionId required' });

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check sanction exists and is ISSUED
    const { rows } = await client.query('SELECT status FROM sanctions WHERE sanction_id = $1 AND application_id = $2', [sanctionId, req.params.id]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sanction not found' });
    }
    if (rows[0].status !== 'ISSUED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Sanction is ${rows[0].status}, cannot accept` });
    }

    // Update status
    await client.query('UPDATE sanctions SET status = $1 WHERE sanction_id = $2', ['ACCEPTED', sanctionId]);

    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.sanction.OfferAccepted.v1', 'los.sanction.OfferAccepted.v1', JSON.stringify({ applicationId: req.params.id, sanctionId, acceptedBy: 'customer' }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );

    await client.query('COMMIT');
    logger.info('OfferAccepted', { correlationId: (req as any).correlationId, applicationId: req.params.id, sanctionId });
    return res.status(200).json({ applicationId: req.params.id, sanctionId, accepted: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('OfferAcceptError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to accept offer' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3007;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Sanction-Offer service listening on ${port}`);
});


