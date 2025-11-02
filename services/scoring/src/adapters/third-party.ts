/**
 * Third-Party Scoring Adapter
 * 
 * Supports integration with external scoring providers:
 * - Experian
 * - Equifax
 * - FICO
 * - Custom scoring APIs
 */

import { ScoringAdapter, ScoringRequest, ScoringResponse } from './types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('third-party-scorer');

export interface ThirdPartyScoringConfig {
  apiUrl: string;
  apiKey?: string;
  apiSecret?: string;
  timeout?: number;
  retryAttempts?: number;
}

/**
 * Generic Third-Party Scoring Adapter
 * Can be configured for any third-party scoring service
 */
export class ThirdPartyScoringAdapter implements ScoringAdapter {
  private config: ThirdPartyScoringConfig;
  private providerName: string;

  constructor(providerName: string, config: ThirdPartyScoringConfig) {
    this.providerName = providerName;
    this.config = {
      timeout: 30000,
      retryAttempts: 2,
      ...config
    };
  }

  getMetadata() {
    return {
      name: `${this.providerName} Scoring`,
      version: '1.0.0',
      supportedFeatures: [
        'external_scoring',
        'api_integration',
        'configurable_timeout'
      ],
      requiresConfig: true
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiUrl && !!this.config.apiKey;
  }

  async calculate(request: ScoringRequest): Promise<ScoringResponse> {
    if (!this.isAvailable()) {
      throw new Error(`Third-party scoring provider ${this.providerName} is not configured`);
    }

    logger.info('ThirdPartyScoringRequest', {
      provider: this.providerName,
      applicationId: request.applicationId
    });

    try {
      // Transform request to third-party API format
      const apiPayload = this.transformRequest(request);

      // Call third-party API
      const response = await this.callThirdPartyAPI(apiPayload);

      // Transform response to our format
      return this.transformResponse(response, request);

    } catch (err) {
      logger.error('ThirdPartyScoringError', {
        provider: this.providerName,
        error: (err as Error).message,
        applicationId: request.applicationId
      });
      throw err;
    }
  }

  private transformRequest(request: ScoringRequest): any {
    // Transform to third-party API format
    // This is a generic transformation - customize based on provider
    return {
      applicationId: request.applicationId,
      applicantId: request.applicantId,
      financialProfile: {
        monthlyIncome: request.monthlyIncome,
        existingEmi: request.existingEmi,
        proposedAmount: request.proposedAmount,
        tenureMonths: request.tenureMonths,
        propertyValue: request.propertyValue
      },
      applicantProfile: {
        age: request.applicantAgeYears,
        employmentType: request.employmentType,
        employmentTenure: request.employmentTenure,
        bankingRelationship: request.bankingRelationship
      },
      creditProfile: {
        creditScore: request.creditScore,
        bureauReport: request.bureauReport
      },
      metadata: {
        channel: request.channel,
        productCode: request.productCode,
        kycStatus: request.kycStatus,
        documentCount: request.documentCount
      }
    };
  }

  private async callThirdPartyAPI(payload: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      }

      if (this.config.apiSecret) {
        // In production, use proper authentication (OAuth, HMAC, etc.)
        headers['Authorization'] = `Bearer ${this.config.apiSecret}`;
      }

      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Third-party API returned ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Third-party API timeout after ${this.config.timeout}ms`);
      }
      throw err;
    }
  }

  private transformResponse(apiResponse: any, originalRequest: ScoringRequest): ScoringResponse {
    // Transform third-party response to our format
    // This is a generic transformation - customize based on provider

    // Handle different response formats
    const score = apiResponse.score || apiResponse.creditScore || apiResponse.totalScore || 600;
    const riskLevel = this.mapRiskLevel(
      apiResponse.riskLevel || apiResponse.riskCategory || apiResponse.risk
    );
    const recommendation = this.mapRecommendation(
      apiResponse.recommendation || apiResponse.decision || apiResponse.action
    );

    // Extract factors if available
    const factors = apiResponse.factors || apiResponse.reasons || [];
    const transformedFactors = factors.map((f: any) => ({
      factor: f.factor || f.name || f.reason || 'Unknown',
      impact: this.mapImpact(f.impact || f.effect || 'NEUTRAL'),
      weight: f.weight || f.importance || 0.5,
      explanation: f.explanation || f.description
    }));

    return {
      score: this.normalizeScore(score),
      riskLevel,
      recommendation,
      confidence: apiResponse.confidence || apiResponse.confidenceScore || 0.7,
      factors: transformedFactors.length > 0 ? transformedFactors : this.generateDefaultFactors(score),
      providerUsed: this.providerName,
      calculatedAt: apiResponse.timestamp || apiResponse.calculatedAt || new Date().toISOString(),
      metadata: {
        ...apiResponse.metadata,
        providerResponse: apiResponse
      }
    };
  }

  private normalizeScore(score: number): number {
    // Normalize to 0-1000 scale
    // Third-party providers may use different scales (300-900, 0-100, etc.)
    if (score <= 1000) return Math.max(0, Math.min(1000, score));
    if (score <= 900) return Math.round((score - 300) / 600 * 1000);
    if (score <= 100) return score * 10;
    return Math.min(1000, score);
  }

  private mapRiskLevel(risk: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    const riskLower = (risk || '').toLowerCase();
    if (riskLower.includes('low') || riskLower === 'a' || riskLower === '1') return 'LOW';
    if (riskLower.includes('medium') || riskLower.includes('moderate') || riskLower === 'b' || riskLower === '2') return 'MEDIUM';
    if (riskLower.includes('high') || riskLower === 'c' || riskLower === '3') return 'HIGH';
    return 'VERY_HIGH';
  }

  private mapRecommendation(rec: string): 'APPROVE' | 'REFER' | 'DECLINE' {
    const recLower = (rec || '').toLowerCase();
    if (recLower.includes('approve') || recLower.includes('accept')) return 'APPROVE';
    if (recLower.includes('decline') || recLower.includes('reject')) return 'DECLINE';
    return 'REFER';
  }

  private mapImpact(impact: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    const impactLower = (impact || '').toLowerCase();
    if (impactLower.includes('positive') || impactLower.includes('good') || impactLower === '+') return 'POSITIVE';
    if (impactLower.includes('negative') || impactLower.includes('bad') || impactLower === '-') return 'NEGATIVE';
    return 'NEUTRAL';
  }

  private generateDefaultFactors(score: number): Array<{ factor: string; impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; weight: number; explanation?: string }> {
    // Generate default factors when third-party doesn't provide them
    const factors: Array<{ factor: string; impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; weight: number; explanation?: string }> = [];

    if (score >= 750) {
      factors.push({
        factor: 'Overall Creditworthiness',
        impact: 'POSITIVE',
        weight: 0.8,
        explanation: 'Strong credit profile'
      });
    } else if (score < 500) {
      factors.push({
        factor: 'Overall Creditworthiness',
        impact: 'NEGATIVE',
        weight: 0.8,
        explanation: 'Weak credit profile'
      });
    }

    return factors;
  }
}

/**
 * Factory function to create third-party adapter
 */
export function createThirdPartyScoringAdapter(
  providerName: string,
  config: ThirdPartyScoringConfig
): ScoringAdapter {
  return new ThirdPartyScoringAdapter(providerName, config);
}

