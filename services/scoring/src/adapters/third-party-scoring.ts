/**
 * Third-Party Scoring Adapter
 * Connects to external scoring providers (e.g., Experian, FICO, TransUnion)
 */

import { ScoringAdapter, ScoringRequest, ScoringResult, ScoringFactor } from '../types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('third-party-scoring');

export interface ThirdPartyScoringConfig {
  provider: 'EXPERIAN' | 'FICO' | 'TRANSUNION' | 'CUSTOM';
  apiUrl: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Third-Party Scoring Adapter
 * Connects to external scoring service providers
 */
export class ThirdPartyScoringAdapter implements ScoringAdapter {
  private config: ThirdPartyScoringConfig;
  private useMock: boolean;

  constructor(config: ThirdPartyScoringConfig) {
    this.config = config;
    this.useMock = !config.apiKey || process.env.USE_MOCK_INTEGRATIONS !== 'false';
  }

  getName(): string {
    return `ThirdParty-${this.config.provider}`;
  }

  isAvailable(): boolean {
    return !this.useMock && !!this.config.apiKey && !!this.config.apiUrl;
  }

  async calculateScore(request: ScoringRequest): Promise<ScoringResult> {
    if (this.useMock) {
      return this.mockScoring(request);
    }

    try {
      logger.info('ThirdPartyScoringRequest', {
        applicationId: request.applicationId,
        provider: this.config.provider
      });

      // Prepare request payload for third-party API
      const payload = this.preparePayload(request);

      // Call third-party API
      const response = await this.callThirdPartyAPI(payload);

      // Transform response to our ScoringResult format
      return this.transformResponse(response, request);

    } catch (err) {
      logger.error('ThirdPartyScoringError', {
        error: (err as Error).message,
        applicationId: request.applicationId,
        provider: this.config.provider
      });

      // Fallback to mock if API call fails
      logger.warn('FallingBackToMockScoring', { provider: this.config.provider });
      return this.mockScoring(request);
    }
  }

  private async callThirdPartyAPI(payload: any): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), (this.config.timeout || 10000));

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-API-Version': 'v1'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Third-party API returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Third-party scoring API timeout');
      }
      throw err;
    }
  }

  private preparePayload(request: ScoringRequest): any {
    // Transform our request to third-party API format
    return {
      application_id: request.applicationId,
      applicant_id: request.applicantId,
      income_monthly: request.monthlyIncome,
      existing_emi: request.existingEmi,
      loan_amount: request.proposedAmount,
      tenure_months: request.tenureMonths,
      property_value: request.propertyValue,
      age: request.applicantAgeYears,
      credit_score: request.creditScore,
      employment_type: request.employmentType,
      employment_tenure_months: request.employmentTenure,
      education_level: request.educationLevel,
      banking_relationship_years: request.bankingRelationship,
      previous_defaults: request.previousDefaults,
      channel: request.channel,
      product_code: request.productCode,
      additional_data: request.additionalData
    };
  }

  private transformResponse(apiResponse: any, originalRequest: ScoringRequest): ScoringResult {
    // Transform third-party response to our format
    // This is provider-specific and should be customized per provider

    const factors: ScoringFactor[] = [];
    
    // Extract factors from API response (structure varies by provider)
    if (apiResponse.factors) {
      apiResponse.factors.forEach((factor: any) => {
        factors.push({
          name: factor.name || factor.factor_name,
          value: factor.score || factor.value,
          weight: factor.weight || 0,
          impact: this.determineImpact(factor.impact || factor.effect),
          description: factor.description || factor.reason || ''
        });
      });
    }

    // Determine recommendation from score
    let recommendation: 'APPROVE' | 'REFER' | 'DECLINE';
    const score = apiResponse.score || apiResponse.credit_score;
    
    if (score >= apiResponse.thresholds?.approve || apiResponse.recommendation === 'APPROVE') {
      recommendation = 'APPROVE';
    } else if (score >= apiResponse.thresholds?.refer || apiResponse.recommendation === 'REFER') {
      recommendation = 'REFER';
    } else {
      recommendation = 'DECLINE';
    }

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    if (score >= 750) riskLevel = 'LOW';
    else if (score >= 600) riskLevel = 'MEDIUM';
    else if (score >= 400) riskLevel = 'HIGH';
    else riskLevel = 'VERY_HIGH';

    return {
      score: Math.round(score),
      riskLevel: apiResponse.risk_level || riskLevel,
      confidence: apiResponse.confidence || 0.85,
      factors,
      recommendation,
      provider: this.config.provider,
      providerRef: apiResponse.reference_id || apiResponse.request_id,
      metadata: {
        providerMetadata: apiResponse.metadata,
        apiVersion: apiResponse.api_version
      },
      evaluatedAt: new Date()
    };
  }

  private determineImpact(impact: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    const upper = (impact || '').toUpperCase();
    if (upper.includes('POSITIVE') || upper.includes('GOOD') || upper.includes('FAVORABLE')) {
      return 'POSITIVE';
    }
    if (upper.includes('NEGATIVE') || upper.includes('BAD') || upper.includes('UNFAVORABLE')) {
      return 'NEGATIVE';
    }
    return 'NEUTRAL';
  }

  private async mockScoring(request: ScoringRequest): Promise<ScoringResult> {
    // Mock scoring for development/testing
    logger.debug('MockThirdPartyScoring', { applicationId: request.applicationId });

    // Simple mock calculation
    let mockScore = 650; // Base score
    if (request.creditScore) mockScore = (request.creditScore * 0.7) + 200;
    if (request.monthlyIncome > 50000) mockScore += 50;
    if (request.previousDefaults) mockScore -= 150;

    const factors: ScoringFactor[] = [
      {
        name: 'Credit Score',
        value: request.creditScore ? this.normalizeScore(request.creditScore) : 65,
        weight: 0.3,
        impact: 'POSITIVE',
        description: `Bureau score: ${request.creditScore || 'N/A'}`
      },
      {
        name: 'Income',
        value: request.monthlyIncome > 50000 ? 80 : 50,
        weight: 0.25,
        impact: 'POSITIVE',
        description: `Monthly income: ₹${request.monthlyIncome.toLocaleString()}`
      }
    ];

    return {
      score: Math.max(300, Math.min(900, mockScore)),
      riskLevel: mockScore >= 650 ? 'MEDIUM' : mockScore >= 500 ? 'HIGH' : 'VERY_HIGH',
      confidence: 0.75,
      factors,
      recommendation: mockScore >= 650 ? 'APPROVE' : mockScore >= 500 ? 'REFER' : 'DECLINE',
      provider: this.config.provider,
      providerRef: `MOCK-${Date.now()}`,
      metadata: { mock: true, note: 'Configure API key for real scoring' },
      evaluatedAt: new Date()
    };
  }

  private normalizeScore(score: number): number {
    // Normalize any score to 0-100
    if (score <= 900 && score >= 300) {
      return ((score - 300) / 600) * 100;
    }
    return 50; // Default
  }
}

