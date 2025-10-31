import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import cors from 'cors';
import { correlationIdMiddleware, createLogger, createPgPool } from '@los/shared-libs';

const app = express();
const logger = createLogger('reporting-service');

// Ensure DATABASE_URL is set before creating pool
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://los:los@localhost:5432/los';
  console.warn('⚠️  DATABASE_URL not set, using default: postgres://los:los@localhost:5432/los');
}

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

app.use(json());
app.use(correlationIdMiddleware);

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

// GET /api/reporting/pipeline - pipeline by status (real data from applications)
app.get('/api/reporting/pipeline', async (_req, res) => {
  try {
    // Try to query applications table
    const { rows } = await pool.query(
      `SELECT 
         status,
         COUNT(*) as count
       FROM applications
       WHERE status NOT IN ('Withdrawn', 'Closed')
       GROUP BY status
       ORDER BY status`
    ).catch(async (err) => {
      // If table doesn't exist, return empty data instead of error
      logger.warn('PipelineReportQueryError', { 
        error: (err as Error).message, 
        correlationId: (_req as any).correlationId,
        note: 'Returning empty pipeline data'
      });
      return { rows: [] };
    });
    
    // Convert to key-value format
    const data: Record<string, number> = {};
    rows.forEach((row: any) => {
      data[row.status] = parseInt(row.count, 10);
    });
    
    logger.debug('PipelineReport', { correlationId: (_req as any).correlationId, statusCount: rows.length });
    return res.status(200).json({ data });
  } catch (err) {
    logger.error('PipelineReportError', { error: (err as Error).message, correlationId: (_req as any).correlationId });
    // Return empty data instead of error to prevent frontend crash
    return res.status(200).json({ data: {} });
  }
});

// GET /api/reporting/tat - average TAT by stage (real calculations from application_history/outbox)
app.get('/api/reporting/tat', async (_req, res) => {
  try {
    // Calculate average time from Submitted to various stages using application_history
    const tatQueries = await Promise.all([
      // Submit to Verification: Average time from ApplicationSubmitted to KYC completed
      pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_ms
        FROM kyc_sessions
        WHERE status = 'COMPLETED' AND started_at IS NOT NULL AND completed_at IS NOT NULL
      `).catch(() => ({ rows: [{ avg_ms: null }] })),
      
      // Verification to Underwriting: Time from KYC completion to first underwriting decision
      pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (ud.evaluated_at - ks.completed_at)) * 1000) as avg_ms
        FROM underwriting_decisions ud
        JOIN kyc_sessions ks ON ud.application_id = ks.application_id
        WHERE ks.status = 'COMPLETED' AND ks.completed_at IS NOT NULL
        AND ud.evaluated_at > ks.completed_at
      `).catch(() => ({ rows: [{ avg_ms: null }] })),
      
      // Underwriting to Sanction: Time from decision to sanction issued
      pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (s.created_at - ud.evaluated_at)) * 1000) as avg_ms
        FROM sanctions s
        JOIN underwriting_decisions ud ON s.application_id = ud.application_id
        WHERE s.created_at > ud.evaluated_at
      `).catch(() => ({ rows: [{ avg_ms: null }] })),
      
      // Sanction to Disbursement: Time from sanction to disbursement
      pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (d.updated_at - s.created_at)) * 1000) as avg_ms
        FROM disbursements d
        JOIN sanctions s ON d.application_id = s.application_id
        WHERE d.status = 'DISBURSED' AND d.updated_at > s.created_at
      `).catch(() => ({ rows: [{ avg_ms: null }] }))
    ]);
    
    const data = {
      SubmitToVerificationMs: tatQueries[0].rows[0]?.avg_ms ? Math.round(parseFloat(tatQueries[0].rows[0].avg_ms)) : null,
      VerificationToUnderwritingMs: tatQueries[1].rows[0]?.avg_ms ? Math.round(parseFloat(tatQueries[1].rows[0].avg_ms)) : null,
      UnderwritingToSanctionMs: tatQueries[2].rows[0]?.avg_ms ? Math.round(parseFloat(tatQueries[2].rows[0].avg_ms)) : null,
      SanctionToDisbursementMs: tatQueries[3].rows[0]?.avg_ms ? Math.round(parseFloat(tatQueries[3].rows[0].avg_ms)) : null
    };
    
    logger.debug('TATReport', { correlationId: (_req as any).correlationId });
    return res.status(200).json({ data });
  } catch (err) {
    logger.error('TATReportError', { error: (err as Error).message, correlationId: (_req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch TAT data' });
  }
});

// GET /api/reporting/summary - overall summary statistics
app.get('/api/reporting/summary', async (_req, res) => {
  try {
    const summaryQueries = await Promise.all([
      // Total applications
      pool.query('SELECT COUNT(*) as total FROM applications'),
      // Applications by channel
      pool.query('SELECT channel, COUNT(*) as count FROM applications GROUP BY channel'),
      // Applications by product
      pool.query('SELECT product_code, COUNT(*) as count FROM applications GROUP BY product_code'),
      // Approval rate (AUTO_APPROVE decisions / total decisions)
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE decision = 'AUTO_APPROVE') as approved,
          COUNT(*) as total
        FROM underwriting_decisions
        WHERE override_request_id IS NULL
      `),
      // Total disbursed amount
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total_disbursed
        FROM disbursements
        WHERE status = 'DISBURSED'
      `)
    ]);
    
    const totalApplications = parseInt(summaryQueries[0].rows[0].total, 10);
    const channels: Record<string, number> = {};
    summaryQueries[1].rows.forEach((row: any) => {
      channels[row.channel] = parseInt(row.count, 10);
    });
    const products: Record<string, number> = {};
    summaryQueries[2].rows.forEach((row: any) => {
      products[row.product_code] = parseInt(row.count, 10);
    });
    const approved = parseInt(summaryQueries[3].rows[0]?.approved || '0', 10);
    const totalDecisions = parseInt(summaryQueries[3].rows[0]?.total || '0', 10);
    const approvalRate = totalDecisions > 0 ? (approved / totalDecisions) * 100 : 0;
    const totalDisbursed = parseFloat(summaryQueries[4].rows[0]?.total_disbursed || '0');
    
    const data = {
      totalApplications,
      channels,
      products,
      approvalRate: +approvalRate.toFixed(2),
      totalDisbursed: +totalDisbursed.toFixed(2)
    };
    
    logger.debug('SummaryReport', { correlationId: (_req as any).correlationId });
    return res.status(200).json({ data });
  } catch (err) {
    logger.error('SummaryReportError', { error: (err as Error).message, correlationId: (_req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3015;
app.listen(port, () => {
  logger.info('Reporting service listening', { port });
});


