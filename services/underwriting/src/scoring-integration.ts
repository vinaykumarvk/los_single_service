/**
 * Scoring Integration for Underwriting Service
 * Integrates with scoring service to enhance decision-making
 */

import { createLogger } from '@los/shared-libs';

const logger = createLogger('underwriting-scoring-integration');

interface ScoringServiceResponse {
  scoringId: string;
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  confidence: number;
  recommendation: 'APPROVE' | 'REFER' | 'DECLINE';
  factors: Array<{
    name: string;
    value: number;
    weight: number;
    impact: string;
    description: string;
  }>;
  provider: string;
  providerUsed: string;
}

/**
 * Get scoring from scoring service
 */
export async function getScoring(
  applicationId: string,
  scoringRequest: {
    applicantId: string;
    monthlyIncome: number;
    existingEmi: number;
    proposedAmount: number;
    tenureMonths: number;
    propertyValue?: number;
    applicantAgeYears: number;
    creditScore?: number;
    employmentType?: string;
    employmentTenure?: number;
    bankingRelationship?: number;
    previousDefaults?: boolean;
    channel?: string;
    productCode?: string;
  },
  provider?: string
): Promise<ScoringServiceResponse | null> {
  try {
    const scoringServiceUrl = process.env.SCORING_SERVICE_URL || 'http://localhost:3018';
    
    const response = await fetch(`${scoringServiceUrl}/api/scoring/calculate?provider=${provider || 'INTERNAL_ML'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId,
        ...scoringRequest
      })
    });

    if (!response.ok) {
      logger.warn('ScoringServiceUnavailable', {
        status: response.status,
        applicationId
      });
      return null; // Graceful degradation - continue without scoring
    }

    const result = await response.json();
    logger.info('ScoringRetrieved', {
      applicationId,
      score: result.score,
      provider: result.providerUsed
    });

    return result;
  } catch (err) {
    logger.warn('ScoringServiceError', {
      error: (err as Error).message,
      applicationId
    });
    return null; // Graceful degradation
  }
}

/**
 * Enhance underwriting decision with scoring
 */
export function enhanceDecisionWithScoring(
  originalDecision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE',
  scoringResult: ScoringServiceResponse | null,
  ruleReasons: string[]
): {
  decision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE';
  reasons: string[];
  scoringEnhancement?: {
    score: number;
    riskLevel: string;
    recommendation: string;
    provider: string;
  };
} {
  if (!scoringResult) {
    // No scoring available, return original decision
    return {
      decision: originalDecision,
      reasons: ruleReasons
    };
  }

  // Combine rule-based and ML-based decisions
  let finalDecision: 'AUTO_APPROVE' | 'REFER' | 'DECLINE' = originalDecision;
  const enhancedReasons = [...ruleReasons];

  // Add scoring information to reasons
  enhancedReasons.push(`ML Score: ${scoringResult.score} (${scoringResult.riskLevel} risk, ${scoringResult.recommendation} recommendation)`);

  // Decision enhancement logic:
  // - If scoring recommends APPROVE and rules also pass, keep APPROVE
  // - If scoring recommends DECLINE but rules pass, downgrade to REFER
  // - If scoring recommends APPROVE but rules fail, keep REFER/DECLINE
  // - If both recommend DECLINE, keep DECLINE

  if (scoringResult.recommendation === 'DECLINE' && originalDecision !== 'DECLINE') {
    // Scoring suggests decline, downgrade decision
    if (originalDecision === 'AUTO_APPROVE') {
      finalDecision = 'REFER';
      enhancedReasons.push('Scoring indicates high risk');
    } else {
      finalDecision = 'DECLINE';
      enhancedReasons.push('Both rules and scoring indicate decline');
    }
  } else if (scoringResult.recommendation === 'APPROVE' && originalDecision === 'DECLINE') {
    // Scoring suggests approve but rules decline, upgrade to REFER
    finalDecision = 'REFER';
    enhancedReasons.push('Scoring indicates lower risk than rules suggest');
  } else if (scoringResult.recommendation === 'APPROVE' && originalDecision === 'REFER' && scoringResult.score >= 750) {
    // High scoring score and approve recommendation, can upgrade REFER to APPROVE
    if (ruleReasons.length === 0 || (ruleReasons.length === 1 && scoringResult.confidence > 0.8)) {
      finalDecision = 'AUTO_APPROVE';
      enhancedReasons.push('High ML score overrides minor rule failure');
    }
  }

  return {
    decision: finalDecision,
    reasons: enhancedReasons,
    scoringEnhancement: {
      score: scoringResult.score,
      riskLevel: scoringResult.riskLevel,
      recommendation: scoringResult.recommendation,
      provider: scoringResult.providerUsed
    }
  };
}

