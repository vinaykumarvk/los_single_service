/**
 * Advanced Analytics Service
 * 
 * Provides:
 * - Custom report builder
 * - Predictive analytics
 * - Interactive dashboards
 * - Portfolio analytics
 */

import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { correlationIdMiddleware, createLogger, createPgPool } from '@los/shared-libs';
import { buildCustomReport, predictApprovalRate, predictApplicationVolume, analyzePortfolioRisk, generateTrendAnalysis } from './analytics-engine';

const app = express();
const logger = createLogger('analytics-service');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://los:los@localhost:5432/los';
}

app.use(json());
app.use(correlationIdMiddleware);

const pool = createPgPool();

app.get('/health', (_req, res) => res.status(200).send('OK'));

const CustomReportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  filters: z.record(z.any()).optional(),
  metrics: z.array(z.string()),
  dimensions: z.array(z.string()),
  dateRange: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional(),
  groupBy: z.array(z.string()).optional(),
  orderBy: z.string().optional(),
  limit: z.number().int().positive().optional()
});

// POST /api/analytics/reports/build - Build custom report
app.post('/api/analytics/reports/build', async (req, res) => {
  try {
    const parsed = CustomReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid report configuration',
        details: parsed.error.flatten()
      });
    }

    logger.info('BuildingCustomReport', {
      name: parsed.data.name,
      metrics: parsed.data.metrics.length,
      correlationId: (req as any).correlationId
    });

    const report = await buildCustomReport(pool, parsed.data);

    return res.status(200).json(report);

  } catch (err) {
    logger.error('BuildReportError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to build report' });
  }
});

// GET /api/analytics/predictive/approval-rate - Predict approval rate
app.get('/api/analytics/predictive/approval-rate', async (req, res) => {
  try {
    const productCode = req.query.productCode as string | undefined;
    const channel = req.query.channel as string | undefined;
    const timeframe = req.query.timeframe as string || '30d'; // 7d, 30d, 90d, 365d

    const prediction = await predictApprovalRate(pool, {
      productCode,
      channel,
      timeframe
    });

    return res.status(200).json(prediction);

  } catch (err) {
    logger.error('PredictApprovalRateError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to predict approval rate' });
  }
});

// GET /api/analytics/predictive/application-volume - Predict application volume
app.get('/api/analytics/predictive/application-volume', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string || '30', 10);
    const channel = req.query.channel as string | undefined;
    const productCode = req.query.productCode as string | undefined;

    const prediction = await predictApplicationVolume(pool, {
      days,
      channel,
      productCode
    });

    return res.status(200).json(prediction);

  } catch (err) {
    logger.error('PredictVolumeError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to predict application volume' });
  }
});

// GET /api/analytics/portfolio/risk - Analyze portfolio risk
app.get('/api/analytics/portfolio/risk', async (req, res) => {
  try {
    const productCode = req.query.productCode as string | undefined;
    const channel = req.query.channel as string | undefined;

    const analysis = await analyzePortfolioRisk(pool, {
      productCode,
      channel
    });

    return res.status(200).json(analysis);

  } catch (err) {
    logger.error('PortfolioRiskError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to analyze portfolio risk' });
  }
});

// GET /api/analytics/trends - Trend analysis
app.get('/api/analytics/trends', async (req, res) => {
  try {
    const metric = req.query.metric as string || 'applications';
    const period = req.query.period as string || 'daily'; // daily, weekly, monthly
    const days = parseInt(req.query.days as string || '90', 10);

    const trends = await generateTrendAnalysis(pool, {
      metric,
      period,
      days
    });

    return res.status(200).json(trends);

  } catch (err) {
    logger.error('TrendAnalysisError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to generate trend analysis' });
  }
});

// GET /api/analytics/reports/saved - Get saved reports (placeholder)
app.get('/api/analytics/reports/saved', async (_req, res) => {
  // In production, this would query a saved_reports table
  return res.status(200).json({
    reports: [],
    message: 'Saved reports feature - to be implemented with database persistence'
  });
});

// POST /api/analytics/reports/save - Save report (placeholder)
app.post('/api/analytics/reports/save', async (req, res) => {
  // In production, this would save to saved_reports table
  return res.status(201).json({
    reportId: 'placeholder',
    message: 'Save report feature - to be implemented with database persistence'
  });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3019;
app.listen(port, () => {
  logger.info('AnalyticsServiceStarted', { port });
});

export { app };

