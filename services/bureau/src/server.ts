import express from 'express';
import { json } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createPgPool, writeOutboxEvent, correlationIdMiddleware, createLogger, verifySignature } from '@los/shared-libs';

const app = express();
const logger = createLogger('bureau-service');
app.use(json());
app.use(correlationIdMiddleware);

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

// POST /api/bureau/pull - initiate bureau pull
app.post('/api/bureau/pull', async (req, res) => {
  const { applicationId, applicantId, provider = 'CIBIL' } = req.body || {};
  if (!applicationId || !applicantId) return res.status(400).json({ error: 'applicationId and applicantId required' });

  const requestId = uuidv4();
  const externalRef = uuidv4();

  // Persist request
  await pool.query(
    'INSERT INTO bureau_requests (request_id, application_id, applicant_id, provider, external_ref) VALUES ($1, $2, $3, $4, $5)',
    [requestId, applicationId, applicantId, provider, externalRef]
  ).catch((e) => logger.error('BureauRequestInsertError', { error: (e as Error).message }));

  logger.info('BureauPullRequested', { correlationId: (req as any).correlationId, requestId, applicationId, provider });

  // In production, call actual bureau API here (async)
  // For mock, simulate webhook after delay
  setTimeout(() => {
    const mockScore = Math.floor(Math.random() * 300) + 650; // 650-950 range
    const mockReport = {
      score,
      creditHistory: { totalAccounts: 5, activeAccounts: 3, delinquentAccounts: 0 },
      recentEnquiries: 2
    };
    pool.query(
      'INSERT INTO bureau_reports (report_id, request_id, application_id, score, report_data, provider) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (request_id) DO UPDATE SET score = $4, report_data = $5, received_at = now()',
      [uuidv4(), requestId, applicationId, mockScore, JSON.stringify(mockReport), provider]
    ).then(() => {
      return writeOutboxEvent(pool, {
        id: uuidv4(),
        aggregateId: applicationId,
        topic: 'los.bureau.BureauReportReceived.v1',
        eventType: 'los.bureau.BureauReportReceived.v1',
        payload: { applicationId, requestId, score: mockScore, provider }
      });
    }).catch((e) => logger.error('BureauReportError', { error: (e as Error).message }));
  }, 2000);

  return res.status(202).json({ requestId, externalRef, status: 'REQUESTED' });
});

// POST /webhooks/bureau - receive bureau callback
app.post('/webhooks/bureau', async (req, res) => {
  const secret = process.env.INTEGRATION_SECRET || 'changeme';
  const sig = req.header('X-Signature');
  const raw = JSON.stringify(req.body || {});
  if (!verifySignature(raw, sig, secret)) return res.status(401).send('bad signature');

  const { requestId, applicationId, score, reportData, provider } = req.body || {};
  if (!requestId || !applicationId) return res.status(400).json({ error: 'requestId and applicationId required' });

  // Persist report
  await pool.query(
    'INSERT INTO bureau_reports (report_id, request_id, application_id, score, report_data, provider) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (request_id) DO UPDATE SET score = $4, report_data = $5, received_at = now()',
    [uuidv4(), requestId, applicationId, score || null, JSON.stringify(reportData || {}), provider || 'CIBIL']
  ).catch((e) => logger.error('BureauReportInsertError', { error: (e as Error).message }));

  await pool.query('UPDATE bureau_requests SET status = $1, updated_at = now() WHERE request_id = $2', ['COMPLETED', requestId]);

  // Emit event
  await writeOutboxEvent(pool, {
    id: uuidv4(),
    aggregateId: applicationId,
    topic: 'los.bureau.BureauReportReceived.v1',
    eventType: 'los.bureau.BureauReportReceived.v1',
    payload: { applicationId, requestId, score, provider: provider || 'CIBIL' }
  }).catch((e) => logger.error('BureauEventError', { error: (e as Error).message }));

  logger.info('BureauReportReceived', { requestId, applicationId, score });
  return res.status(200).json({ ack: true });
});

// GET /api/bureau/:applicationId/report - get bureau report
app.get('/api/bureau/:applicationId/report', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT r.report_id, r.score, r.report_data, r.provider, r.received_at FROM bureau_reports r JOIN bureau_requests req ON r.request_id = req.request_id WHERE req.application_id = $1 ORDER BY r.received_at DESC LIMIT 1',
    [req.params.applicationId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
  return res.status(200).json(rows[0]);
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3013;
app.listen(port, () => {
  logger.info('Bureau service listening', { port });
});

