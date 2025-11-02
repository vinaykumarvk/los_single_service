/**
 * Internal AI/ML Scoring Engine
 * 
 * Implements machine learning-based credit scoring using:
 * - Weighted factor analysis
 * - Pattern recognition
 * - Historical data patterns
 * - Risk modeling
 */

import { ScoringAdapter, ScoringRequest, ScoringResponse } from './types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('internal-ml-scorer');

export class InternalMLScoringAdapter implements ScoringAdapter {
  private modelVersion = '1.0.0';

  getMetadata() {
    return {
      name: 'Internal ML Engine',
      version: this.modelVersion,
      supportedFeatures: [
        'weighted_factor_analysis',
        'risk_level_calculation',
        'recommendation_engine',
        'confidence_scoring'
      ],
      requiresConfig: false
    };
  }

  isAvailable(): boolean {
    // Always available - internal service
    return true;
  }

  async calculate(request: ScoringRequest): Promise<ScoringResponse> {
    logger.info('InternalMLScoring', { 
      applicationId: request.applicationId,
      modelVersion: this.modelVersion 
    });

    // Feature extraction and normalization
    const features = this.extractFeatures(request);
    
    // Apply ML model (simplified - in production, use trained model)
    const score = this.calculateScore(features);
    
    // Determine risk level
    const riskLevel = this.calculateRiskLevel(score);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(score, features);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(features);
    
    // Identify key factors
    const factors = this.identifyFactors(features, score);

    return {
      score: Math.round(score),
      riskLevel,
      recommendation,
      confidence,
      factors,
      providerUsed: 'INTERNAL_ML',
      modelVersion: this.modelVersion,
      calculatedAt: new Date().toISOString(),
      metadata: {
        featuresUsed: Object.keys(features),
        modelType: 'weighted_factor_analysis'
      }
    };
  }

  private extractFeatures(request: ScoringRequest): Record<string, number> {
    const features: Record<string, number> = {};

    // Income-to-Loan Ratio (lower is better)
    features.incomeToLoanRatio = request.monthlyIncome > 0 
      ? request.proposedAmount / (request.monthlyIncome * 12) 
      : 10; // High risk if no income

    // FOIR (Fixed Obligation to Income Ratio)
    const proposedEmi = this.calculateEMI(request.proposedAmount, 9.5, request.tenureMonths);
    features.foir = request.monthlyIncome > 0 
      ? (request.existingEmi + proposedEmi) / request.monthlyIncome 
      : 1;

    // LTV (Loan to Value) for secured loans
    if (request.propertyValue && request.propertyValue > 0) {
      features.ltv = request.proposedAmount / request.propertyValue;
    } else {
      features.ltv = 1; // Unsecured loan
    }

    // Age factor (optimal age range 25-60)
    if (request.applicantAgeYears < 25) {
      features.ageFactor = 0.7; // Younger applicants
    } else if (request.applicantAgeYears > 60) {
      features.ageFactor = Math.max(0.3, 1 - (request.applicantAgeYears - 60) * 0.05);
    } else {
      features.ageFactor = 1.0; // Optimal age
    }

    // Credit score factor (normalize 300-900 to 0-1)
    if (request.creditScore) {
      features.creditScoreFactor = Math.max(0, Math.min(1, (request.creditScore - 300) / 600));
    } else {
      features.creditScoreFactor = 0.5; // Unknown credit
    }

    // Employment stability
    if (request.employmentTenure) {
      features.employmentStability = Math.min(1, request.employmentTenure / 24); // 24 months = stable
    } else {
      features.employmentStability = 0.5;
    }

    // Banking relationship
    if (request.bankingRelationship) {
      features.bankingRelationshipFactor = Math.min(1, request.bankingRelationship / 36); // 36 months = strong
    } else {
      features.bankingRelationshipFactor = 0.5;
    }

    // Employment type factor
    features.employmentTypeFactor = request.employmentType === 'SALARIED' ? 1.0 :
      request.employmentType === 'SELF_EMPLOYED' ? 0.8 : 0.6;

    // Default history
    features.defaultHistoryFactor = request.previousDefaults ? 0.2 : 1.0;

    // Bureau report factors (if available)
    if (request.bureauReport) {
      const bureauScore = request.bureauReport.score || 600;
      features.bureauScoreFactor = Math.max(0, Math.min(1, (bureauScore - 300) / 600));
      
      const delinquencyRate = request.bureauReport.totalAccounts > 0
        ? request.bureauReport.delinquentAccounts / request.bureauReport.totalAccounts
        : 0;
      features.delinquencyFactor = 1 - delinquencyRate * 0.5; // Penalty for delinquencies
    } else {
      features.bureauScoreFactor = 0.6; // Unknown
      features.delinquencyFactor = 1.0;
    }

    // Channel factor
    features.channelFactor = request.channel === 'Branch' ? 1.0 :
      request.channel === 'DSA' ? 0.95 : 0.9;

    // KYC completion
    features.kycCompleteness = request.kycStatus === 'COMPLETED' ? 1.0 :
      request.kycStatus === 'PENDING' ? 0.7 : 0.5;

    // Document completeness
    features.documentCompleteness = request.documentCount && request.documentCount >= 5 ? 1.0 :
      request.documentCount && request.documentCount >= 3 ? 0.8 : 0.6;

    return features;
  }

  private calculateScore(features: Record<string, number>): number {
    // Weighted scoring model (in production, use trained ML model)
    const weights: Record<string, number> = {
      incomeToLoanRatio: -0.15, // Negative weight - lower is better
      foir: -0.20, // Negative weight - lower FOIR is better
      ltv: -0.10, // Negative weight - lower LTV is better
      ageFactor: 0.08,
      creditScoreFactor: 0.25, // High weight on credit score
      employmentStability: 0.10,
      bankingRelationshipFactor: 0.05,
      employmentTypeFactor: 0.08,
      defaultHistoryFactor: 0.12,
      bureauScoreFactor: 0.15,
      delinquencyFactor: 0.10,
      channelFactor: 0.02,
      kycCompleteness: 0.05,
      documentCompleteness: 0.05
    };

    let score = 500; // Base score (neutral)

    // Apply feature weights
    for (const [feature, value] of Object.entries(features)) {
      const weight = weights[feature] || 0;
      
      if (feature === 'incomeToLoanRatio' || feature === 'foir' || feature === 'ltv') {
        // Negative features - lower values increase score
        score += weight * 100 * Math.max(0, 2 - value); // Normalize inverse
      } else {
        // Positive features - higher values increase score
        score += weight * 100 * value;
      }
    }

    // Normalize to 0-1000 scale
    score = Math.max(0, Math.min(1000, score));

    return score;
  }

  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    if (score >= 750) return 'LOW';
    if (score >= 650) return 'MEDIUM';
    if (score >= 500) return 'HIGH';
    return 'VERY_HIGH';
  }

  private generateRecommendation(
    score: number, 
    features: Record<string, number>
  ): 'APPROVE' | 'REFER' | 'DECLINE' {
    // High score with low FOIR and good credit
    if (score >= 750 && features.foir < 0.5 && features.creditScoreFactor > 0.7) {
      return 'APPROVE';
    }

    // Very low score or high FOIR
    if (score < 500 || features.foir > 0.7 || features.defaultHistoryFactor < 0.5) {
      return 'DECLINE';
    }

    // Medium score - needs review
    return 'REFER';
  }

  private calculateConfidence(features: Record<string, number>): number {
    // Higher confidence when more data points are available
    let confidence = 0.5; // Base confidence

    // Increase confidence with credit score
    if (features.creditScoreFactor > 0) confidence += 0.15;

    // Increase confidence with bureau report
    if (features.bureauScoreFactor > 0 && features.bureauScoreFactor !== 0.6) {
      confidence += 0.15;
    }

    // Increase confidence with employment stability
    if (features.employmentStability > 0.7) confidence += 0.1;

    // Increase confidence with banking relationship
    if (features.bankingRelationshipFactor > 0.7) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  private identifyFactors(
    features: Record<string, number>, 
    score: number
  ): Array<{ factor: string; impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; weight: number; explanation?: string }> {
    const factors: Array<{ factor: string; impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'; weight: number; explanation?: string }> = [];

    // Top contributing factors
    if (features.creditScoreFactor > 0.7) {
      factors.push({
        factor: 'Credit Score',
        impact: 'POSITIVE',
        weight: features.creditScoreFactor,
        explanation: 'Strong credit history'
      });
    } else if (features.creditScoreFactor < 0.5) {
      factors.push({
        factor: 'Credit Score',
        impact: 'NEGATIVE',
        weight: 1 - features.creditScoreFactor,
        explanation: 'Below average credit history'
      });
    }

    if (features.foir < 0.5) {
      factors.push({
        factor: 'FOIR',
        impact: 'POSITIVE',
        weight: 0.8,
        explanation: 'Low fixed obligation to income ratio'
      });
    } else if (features.foir > 0.6) {
      factors.push({
        factor: 'FOIR',
        impact: 'NEGATIVE',
        weight: features.foir,
        explanation: 'High fixed obligation to income ratio'
      });
    }

    if (features.employmentStability > 0.7) {
      factors.push({
        factor: 'Employment Stability',
        impact: 'POSITIVE',
        weight: features.employmentStability,
        explanation: 'Stable employment history'
      });
    }

    if (features.defaultHistoryFactor < 1.0) {
      factors.push({
        factor: 'Default History',
        impact: 'NEGATIVE',
        weight: 1 - features.defaultHistoryFactor,
        explanation: 'Previous defaults detected'
      });
    }

    if (features.bureauScoreFactor > 0.7) {
      factors.push({
        factor: 'Bureau Report',
        impact: 'POSITIVE',
        weight: features.bureauScoreFactor,
        explanation: 'Favorable credit bureau report'
      });
    }

    // Sort by weight (highest impact first)
    factors.sort((a, b) => b.weight - a.weight);

    // Return top 5 factors
    return factors.slice(0, 5);
  }

  private calculateEMI(principal: number, annualRate: number, months: number): number {
    const r = annualRate / 12 / 100;
    if (r === 0) return principal / months;
    const pow = Math.pow(1 + r, months);
    return principal * r * pow / (pow - 1);
  }
}

