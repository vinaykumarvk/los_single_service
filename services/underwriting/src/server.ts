import express from 'express';
import { json } from 'express';
import { z } from 'zod';

const app = express();
app.use(json());

app.get('/health', (_req, res) => res.status(200).send('OK'));

const EvaluateSchema = z.object({
  monthlyIncome: z.number().min(0),
  existingEmi: z.number().min(0).default(0),
  proposedAmount: z.number().min(1),
  tenureMonths: z.number().int().min(1),
  annualRate: z.number().min(0),
  propertyValue: z.number().min(0).optional(),
  applicantAgeYears: z.number().min(18),
  product: z.object({
    maxFOIR: z.number().min(0).max(1),
    maxLTV: z.number().min(0).max(1).optional(),
    maxAgeAtMaturity: z.number().int().min(1)
  })
});

function calcEmi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return +(principal / months).toFixed(2);
  const pow = Math.pow(1 + r, months);
  const emi = principal * r * pow / (pow - 1);
  return +emi.toFixed(2);
}

app.post('/api/applications/:id/underwrite', (req, res) => {
  const parsed = EvaluateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  const {
    monthlyIncome,
    existingEmi,
    proposedAmount,
    tenureMonths,
    annualRate,
    propertyValue,
    applicantAgeYears,
    product
  } = parsed.data;

  const proposedEmi = calcEmi(proposedAmount, annualRate, tenureMonths);
  const foir = (existingEmi + proposedEmi) / monthlyIncome; // ≤ product.maxFOIR
  const ltv = propertyValue && propertyValue > 0 ? proposedAmount / propertyValue : undefined; // ≤ product.maxLTV
  const ageAtMaturity = applicantAgeYears + tenureMonths / 12; // ≤ product.maxAgeAtMaturity

  const reasons: string[] = [];
  if (foir > product.maxFOIR) reasons.push(`FOIR ${foir.toFixed(2)} exceeds ${product.maxFOIR}`);
  if (ltv !== undefined && product.maxLTV !== undefined && ltv > product.maxLTV) reasons.push(`LTV ${(ltv * 100).toFixed(2)}% exceeds ${(product.maxLTV * 100).toFixed(2)}%`);
  if (ageAtMaturity > product.maxAgeAtMaturity) reasons.push(`Age at maturity ${ageAtMaturity.toFixed(1)} exceeds ${product.maxAgeAtMaturity}`);

  let decision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE' = 'AUTO_APPROVE';
  if (reasons.length >= 2) decision = 'DECLINE';
  else if (reasons.length === 1) decision = 'REFER';

  return res.status(200).json({
    decision,
    reasons,
    metrics: {
      foir: +foir.toFixed(4),
      ltv: ltv !== undefined ? +ltv.toFixed(4) : null,
      ageAtMaturity: +ageAtMaturity.toFixed(2),
      proposedEmi
    }
  });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3006;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Underwriting service listening on ${port}`);
});


