/**
 * AI/ML Scoring Service
 * 
 * Provides flexible scoring capabilities:
 * - Internal AI/ML engine
 * - Third-party scoring provider integration
 * - Fallback mechanisms
 */

import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { correlationIdMiddleware, createLogger } from '@los/shared-libs';
import { createScoringAdapter, getAvailableProviders, calculateWithFallback, ScoringProvider } from './adapters';
import { ScoringRequest } from './adapters/types';

const app = express();
const logger = createLogger('scoring-service');

app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

const ScoringRequestSchema = z.object({
  applicationId: z.string().uuid(),
  applicantId: z.string().uuid(),
  monthlyIncome: z.number().positive(),
  existingEmi: z.number().min(0),
  proposedAmount: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  propertyValue: z.number().positive().optional(),
  applicantAgeYears: z.number().int().min(18).max(100),
  creditScore: z.number().int().min(300).max(900).optional(),
  employmentType: z.enum(['SALARIED', 'SELF_EMPLOYED', 'BUSINESS']).optional(),
  employmentTenure: z.number().int().min(0).optional(),
  bankingRelationship: z.number().int().min(0).optional(),
  previousDefaults: z.boolean().optional(),
  channel: z.string().optional(),
  productCode: z.string().optional(),
  bureauReport: z.object({
    score: z.number().optional(),
    totalAccounts: z.number().optional(),
    activeAccounts: z.number().optional(),
    delinquentAccounts: z.number().optional(),
    dpd: z.number().optional()
  }).optional(),
  documentCount: z.number().int().min(0).optional(),
  kycStatus: z.string().optional()
});

// GET /api/scoring/providers - list available scoring providers
app.get('/api/scoring/providers', (_req, res) => {
  try {
    const providers = getAvailableProviders();
    const providerDetails = providers.map(provider => {
      const adapter = createScoringAdapter(provider);
      const metadata = adapter.getMetadata();
      return {
        provider,
        name: metadata.name,
        version: metadata.version,
        available: adapter.isAvailable(),
        supportedFeatures: metadata.supportedFeatures
      };
    });

    return res.status(200).json({
      providers: providerDetails,
      defaultProvider: 'INTERNAL_ML'
    });
  } catch (err) {
    logger.error('GetProvidersError', { error: (err as Error).message });
    return res.status(500).json({ error: 'Failed to get providers' });
  }
});

// POST /api/scoring/calculate - calculate credit score
app.post('/api/scoring/calculate', async (req, res) => {
  try {
    // Parse provider from query or use default
    const provider = (req.query.provider as ScoringProvider) || 'INTERNAL_ML';

    // Validate request
    const parsed = ScoringRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten()
      });
    }

    const scoringRequest: ScoringRequest = parsed.data;

    logger.info('ScoringRequest', {
      applicationId: scoringRequest.applicationId,
      provider,
      correlationId: (req as any).correlationId
    });

    // Calculate score with fallback
    const { result, providerUsed } = await calculateWithFallback(
      scoringRequest,
      provider,
      'INTERNAL_ML' // Always fallback to internal ML
    );

    logger.info('ScoringCompleted', {
      applicationId: scoringRequest.applicationId,
      score: result.score,
      riskLevel: result.riskLevel,
      recommendation: result.recommendation,
      providerUsed,
      correlationId: (req as any).correlationId
    });

    return res.status(200).json(result);

  } catch (err) {
    logger.error('ScoringError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({
      error: 'Failed to calculate score',
      message: (err as Error).message
    });
  }
});

// POST /api/scoring/batch - calculate scores for multiple applications
app.post('/api/scoring/batch', async (req, res) => {
  try {
    const provider = (req.query.provider as ScoringProvider) || 'INTERNAL_ML';
    const requests = z.array(ScoringRequestSchema).parse(req.body);

    logger.info('BatchScoringRequest', {
      count: requests.length,
      provider,
      correlationId: (req as any).correlationId
    });

    const results = await Promise.allSettled(
      requests.map(request => calculateWithFallback(request, provider, 'INTERNAL_ML'))
    );

    const successful = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value.result);

    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason);

    logger.info('BatchScoringCompleted', {
      total: requests.length,
      successful: successful.length,
      failed: failed.length,
      correlationId: (req as any).correlationId
    });

    return res.status(200).json({
      results: successful,
      failed: failed.length,
      total: requests.length
    });

  } catch (err) {
    logger.error('BatchScoringError', {
      error: (err as Error).message,
      correlationId: (req as any).correlationId
    });
    return res.status(500).json({ error: 'Failed to calculate batch scores' });
  }
});

// GET /api/scoring/:applicationId/history - get scoring history for application
app.get('/api/scoring/:applicationId/history', async (req, res) => {
  try {
    // In production, this would query a scoring_history table
    // For now, return placeholder
    return res.status(200).json({
      applicationId: req.params.applicationId,
      history: [],
      message: 'Scoring history feature - to be implemented with database persistence'
    });
  } catch (err) {
    logger.error('GetScoringHistoryError', { error: (err as Error).message });
    return res.status(500).json({ error: 'Failed to get scoring history' });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3018;
app.listen(port, () => {
  logger.info('ScoringServiceStarted', { port });
});

export { app };
