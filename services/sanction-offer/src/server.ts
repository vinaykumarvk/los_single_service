import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, correlationIdMiddleware, createLogger } from '@los/shared-libs';
import { generateSanctionLetterPDF } from './pdf-generator';

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

// POST /api/applications/:id/sanction - issue sanction (can generate multiple variants)
app.post('/api/applications/:id/sanction', async (req, res) => {
  const parsed = SanctionSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  
  const generateVariants = req.body?.generateVariants === true;

  const sanctionId = uuidv4();
  const { sanctionedAmount, tenureMonths, rateAnnual } = parsed.data;
  const emi = calcEmi(sanctionedAmount, rateAnnual, tenureMonths);
  const offerUrl = `https://offer.example/${sanctionId}`;
  const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Persist primary sanction with valid_till
    await client.query(
      'INSERT INTO sanctions (sanction_id, application_id, sanctioned_amount, tenure_months, rate_annual, emi, status, offer_url, valid_till) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [sanctionId, req.params.id, sanctionedAmount, tenureMonths, rateAnnual, emi, 'ISSUED', offerUrl, validTill]
    );
    
    const sanctions = [{ sanctionId, sanctionedAmount, tenureMonths, rateAnnual, emi, offerUrl, validTill }];
    
    // Generate variants if requested (e.g., different tenure/rate combinations)
    if (generateVariants) {
      // Variant 1: Longer tenure, higher rate
      const variant1Id = uuidv4();
      const variant1Tenure = tenureMonths + 12;
      const variant1Rate = rateAnnual + 0.5;
      const variant1Emi = calcEmi(sanctionedAmount, variant1Rate, variant1Tenure);
      const variant1Url = `https://offer.example/${variant1Id}`;
      
      await client.query(
        'INSERT INTO sanctions (sanction_id, application_id, sanctioned_amount, tenure_months, rate_annual, emi, status, offer_url, valid_till) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [variant1Id, req.params.id, sanctionedAmount, variant1Tenure, variant1Rate, variant1Emi, 'ISSUED', variant1Url, validTill]
      );
      
      sanctions.push({ 
        sanctionId: variant1Id, 
        sanctionedAmount, 
        tenureMonths: variant1Tenure, 
        rateAnnual: variant1Rate, 
        emi: variant1Emi, 
        offerUrl: variant1Url, 
        validTill 
      });
      
      // Variant 2: Shorter tenure, same rate
      const variant2Id = uuidv4();
      const variant2Tenure = Math.max(12, tenureMonths - 12);
      const variant2Emi = calcEmi(sanctionedAmount, rateAnnual, variant2Tenure);
      const variant2Url = `https://offer.example/${variant2Id}`;
      
      await client.query(
        'INSERT INTO sanctions (sanction_id, application_id, sanctioned_amount, tenure_months, rate_annual, emi, status, offer_url, valid_till) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [variant2Id, req.params.id, sanctionedAmount, variant2Tenure, rateAnnual, variant2Emi, 'ISSUED', variant2Url, validTill]
      );
      
      sanctions.push({ 
        sanctionId: variant2Id, 
        sanctionedAmount, 
        tenureMonths: variant2Tenure, 
        rateAnnual, 
        emi: variant2Emi, 
        offerUrl: variant2Url, 
        validTill 
      });
    }

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

// POST /api/applications/:id/offer/regenerate - regenerate expired offer
app.post('/api/applications/:id/offer/regenerate', async (req, res) => {
  const RegenerateSchema = z.object({
    sanctionedAmount: z.number().min(1).optional(),
    tenureMonths: z.number().int().min(1).optional(),
    rateAnnual: z.number().min(0).optional()
  });
  
  const parsed = RegenerateSchema.safeParse(req.body || {});
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the latest expired or old sanction
    const { rows: sanctions } = await client.query(
      `SELECT sanction_id, sanctioned_amount, tenure_months, rate_annual, status
       FROM sanctions
       WHERE application_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    
    if (sanctions.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No existing sanction found' });
    }
    
    const oldSanction = sanctions[0];
    
    // Use provided values or fall back to old values
    const sanctionedAmount = parsed.data.sanctionedAmount || Number(oldSanction.sanctioned_amount);
    const tenureMonths = parsed.data.tenureMonths || oldSanction.tenure_months;
    const rateAnnual = parsed.data.rateAnnual || Number(oldSanction.rate_annual);
    
    const emi = calcEmi(sanctionedAmount, rateAnnual, tenureMonths);
    const offerUrl = `https://offer.example/${uuidv4()}`;
    const validTill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    
    const newSanctionId = uuidv4();
    await client.query(
      'INSERT INTO sanctions (sanction_id, application_id, sanctioned_amount, tenure_months, rate_annual, emi, status, offer_url, valid_till) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [newSanctionId, req.params.id, sanctionedAmount, tenureMonths, rateAnnual, emi, 'ISSUED', offerUrl, validTill]
    );
    
    // Write outbox event
    const eventId = uuidv4();
    await client.query(
      'INSERT INTO outbox (id, aggregate_id, topic, event_type, payload, headers) VALUES ($1, $2, $3, $4, $5, $6)',
      [eventId, req.params.id, 'los.sanction.OfferRegenerated.v1', 'los.sanction.OfferRegenerated.v1', JSON.stringify({ applicationId: req.params.id, newSanctionId, oldSanctionId: oldSanction.sanction_id, sanctionedAmount, tenureMonths, rateAnnual, emi }), JSON.stringify({ correlationId: (req as any).correlationId })]
    );
    
    await client.query('COMMIT');
    logger.info('OfferRegenerated', { correlationId: (req as any).correlationId, applicationId: req.params.id, newSanctionId });
    return res.status(201).json({ sanctionId: newSanctionId, emi, offerUrl, validTill, regenerated: true });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('OfferRegenerateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to regenerate offer' });
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
    
    // Check sanction exists and is ISSUED, and not expired
    const { rows } = await client.query(
      'SELECT status, valid_till FROM sanctions WHERE sanction_id = $1 AND application_id = $2',
      [sanctionId, req.params.id]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sanction not found' });
    }
    if (rows[0].status !== 'ISSUED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Sanction is ${rows[0].status}, cannot accept` });
    }
    
    // Check if offer has expired
    if (rows[0].valid_till && new Date(rows[0].valid_till) < new Date()) {
      await client.query('ROLLBACK');
      // Auto-expire the offer
      await client.query(
        'UPDATE sanctions SET status = $1 WHERE sanction_id = $2',
        ['EXPIRED', sanctionId]
      );
      await client.query('COMMIT');
      return res.status(400).json({ error: 'Offer has expired and cannot be accepted' });
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

// GET /api/applications/:id/sanction/:sanctionId/letter - generate sanction letter PDF
app.get('/api/applications/:id/sanction/:sanctionId/letter', async (req, res) => {
  try {
    const { rows: sanctions } = await pool.query(
      'SELECT sanction_id, application_id, sanctioned_amount, tenure_months, rate_annual, emi, offer_url, valid_till FROM sanctions WHERE sanction_id = $1 AND application_id = $2',
      [req.params.sanctionId, req.params.id]
    );
    
    if (sanctions.length === 0) {
      return res.status(404).json({ error: 'Sanction not found' });
    }
    
    const sanction = sanctions[0];
    
    // Fetch application details
    const appUrl = process.env.APPLICATION_SERVICE_URL || 'http://localhost:3001';
    const appResponse = await fetch(`${appUrl}/api/applications/${req.params.id}`);
    if (!appResponse.ok) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const application = await appResponse.json();
    
    // Fetch applicant details
    const kycUrl = process.env.CUSTOMER_KYC_SERVICE_URL || 'http://localhost:3002';
    const applicantResponse = await fetch(`${kycUrl}/api/applicants/${application.applicant_id}`);
    if (!applicantResponse.ok) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    const applicant = await applicantResponse.json();
    
    // Fetch product details
    const mastersUrl = process.env.MASTERS_SERVICE_URL || 'http://localhost:3004';
    const productResponse = await fetch(`${mastersUrl}/api/masters/products/${application.product_code}`);
    const product = productResponse.ok ? await productResponse.json() : null;
    
    // Build applicant name
    const nameParts = [
      applicant.first_name,
      applicant.middle_name,
      applicant.last_name
    ].filter(Boolean);
    const applicantName = nameParts.join(' ') || 'Customer';
    
    // Generate PDF
    const pdfBuffer = await generateSanctionLetterPDF({
      sanctionId: sanction.sanction_id,
      applicationId: application.application_id,
      applicantName,
      sanctionedAmount: Number(sanction.sanctioned_amount),
      tenureMonths: sanction.tenure_months,
      rateAnnual: Number(sanction.rate_annual),
      emi: Number(sanction.emi),
      offerUrl: sanction.offer_url,
      validTill: sanction.valid_till,
      productName: product?.name || application.product_code,
      companyName: process.env.COMPANY_NAME || 'Loan Origination System',
      companyAddress: process.env.COMPANY_ADDRESS || '123 Financial Street, Mumbai, Maharashtra 400001'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sanction-letter-${sanction.sanction_id}.pdf"`);
    res.status(200).send(pdfBuffer);
    
    logger.info('SanctionLetterGenerated', { 
      correlationId: (req as any).correlationId, 
      applicationId: req.params.id, 
      sanctionId: req.params.sanctionId 
    });
  } catch (err) {
    logger.error('SanctionLetterError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to generate sanction letter' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3007;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Sanction-Offer service listening on ${port}`);
});


