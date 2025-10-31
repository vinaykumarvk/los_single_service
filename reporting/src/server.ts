import express from 'express';
import { json } from 'express';
import { correlationIdMiddleware, createLogger } from '@los/shared-libs';

const app = express();
const logger = createLogger('reporting-service');
app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

// GET /api/reporting/pipeline - pipeline by status (placeholder values)
app.get('/api/reporting/pipeline', (_req, res) => {
  const data = {
    Draft: 12,
    Submitted: 8,
    Verification: 5,
    Underwriting: 7,
    Sanctioned: 4,
    OfferAccepted: 3,
    DisbursementRequested: 2,
    Disbursed: 1,
    Rejected: 2
  };
  return res.status(200).json({ data });
});

// GET /api/reporting/tat - average TAT by stage (placeholder ms)
app.get('/api/reporting/tat', (_req, res) => {
  const data = {
    SubmitToVerificationMs: 3600_000,
    VerificationToUnderwritingMs: 5400_000,
    UnderwritingToSanctionMs: 7200_000,
    SanctionToDisbursementMs: 10_800_000
  };
  return res.status(200).json({ data });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3015;
app.listen(port, () => {
  logger.info('Reporting service listening', { port });
});


