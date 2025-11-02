/**
 * Internal ML/AI Scoring Engine
 * Our own machine learning-based credit scoring system
 */

import { ScoringAdapter, ScoringRequest, ScoringResult, ScoringFactor } from '../types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('internal-ml-scoring');

/**
 * Internal ML Scoring Adapter
 * Uses our own machine learning models for credit scoring
 */
export class InternalMLScoringAdapter implements ScoringAdapter {
  private modelVersion: string;
  private weights: Record<string, number>;

  constructor(modelVersion: string = 'v1.0') {
    this.modelVersion = modelVersion;
    // Default model weights (can be loaded from config/DB)
    this.weights = {
      income: 0.25,
      creditScore: 0.30,
      foir: 0.20,
      ltv: 0.10,
      employment: 0.08,
      bankingRelationship: 0.05,
      defaults: -0.30, // Negative weight for defaults
      age: 0.02
    };
  }

  getName(): string {
    return 'InternalML';
  }

  isAvailable(): boolean {
    // Always available (our own engine)
    return true;
  }

  async calculateScore(request: ScoringRequest): Promise<ScoringResult> {
    try {
      logger.info('MLScoreCalculation', { 
        applicationId: request.applicationId, 
        modelVersion: this.modelVersion 
      });

      // Calculate individual factor scores
      const factors: ScoringFactor[] = [];
      
      // Factor 1: Income Score (0-100)
      const incomeScore = this.calculateIncomeScore(request.monthlyIncome);
      factors.push({
        name: 'Income',
        value: incomeScore,
        weight: this.weights.income,
        impact: 'POSITIVE',
        description: `Monthly income: ₹${request.monthlyIncome.toLocaleString()}`
      });

      // Factor 2: Credit Score (0-100) - if available from bureau
      let creditScoreFactor = 50; // Default neutral score
      if (request.creditScore) {
        creditScoreFactor = this.normalizeCreditScore(request.creditScore);
        factors.push({
          name: 'Credit Score',
          value: creditScoreFactor,
          weight: this.weights.creditScore,
          impact: 'POSITIVE',
          description: `Bureau credit score: ${request.creditScore}`
        });
      }

      // Factor 3: FOIR Score (0-100)
      const proposedEmi = this.calculateEMI(request.proposedAmount, request.tenureMonths, 9.5); // Default rate
      const foir = (request.existingEmi + proposedEmi) / request.monthlyIncome;
      const foirScore = this.calculateFOIRScore(foir);
      factors.push({
        name: 'FOIR',
        value: foirScore,
        weight: this.weights.foir,
        impact: foir <= 0.5 ? 'POSITIVE' : 'NEGATIVE',
        description: `FOIR: ${(foir * 100).toFixed(2)}%`
      });

      // Factor 4: LTV Score (0-100) - if property value available
      if (request.propertyValue && request.propertyValue > 0) {
        const ltv = request.proposedAmount / request.propertyValue;
        const ltvScore = this.calculateLTVScore(ltv);
        factors.push({
          name: 'LTV',
          value: ltvScore,
          weight: this.weights.ltv,
          impact: ltv <= 0.8 ? 'POSITIVE' : 'NEGATIVE',
          description: `LTV: ${(ltv * 100).toFixed(2)}%`
        });
      }

      // Factor 5: Employment Stability Score
      const employmentScore = this.calculateEmploymentScore(
        request.employmentType,
        request.employmentTenure
      );
      factors.push({
        name: 'Employment',
        value: employmentScore,
        weight: this.weights.employment,
        impact: 'POSITIVE',
        description: `Employment type: ${request.employmentType || 'Not specified'}`
      });

      // Factor 6: Banking Relationship Score
      if (request.bankingRelationship) {
        const bankingScore = this.calculateBankingScore(request.bankingRelationship);
        factors.push({
          name: 'Banking Relationship',
          value: bankingScore,
          weight: this.weights.bankingRelationship,
          impact: 'POSITIVE',
          description: `Banking relationship: ${request.bankingRelationship} years`
        });
      }

      // Factor 7: Default History (Negative Impact)
      if (request.previousDefaults) {
        factors.push({
          name: 'Default History',
          value: 0,
          weight: this.weights.defaults,
          impact: 'NEGATIVE',
          description: 'Previous defaults detected'
        });
      }

      // Calculate weighted composite score
      let compositeScore = 0;
      let totalWeight = 0;

      factors.forEach(factor => {
        const weightedValue = factor.value * factor.weight;
        if (factor.impact === 'NEGATIVE') {
          compositeScore -= weightedValue;
        } else {
          compositeScore += weightedValue;
        }
        totalWeight += Math.abs(factor.weight);
      });

      // Normalize to 0-1000 scale
      const finalScore = Math.max(0, Math.min(1000, (compositeScore / totalWeight) * 1000));

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
      if (finalScore >= 750) riskLevel = 'LOW';
      else if (finalScore >= 600) riskLevel = 'MEDIUM';
      else if (finalScore >= 400) riskLevel = 'HIGH';
      else riskLevel = 'VERY_HIGH';

      // Determine recommendation
      let recommendation: 'APPROVE' | 'REFER' | 'DECLINE';
      if (finalScore >= 700 && foir <= 0.5 && (!request.previousDefaults)) {
        recommendation = 'APPROVE';
      } else if (finalScore >= 500) {
        recommendation = 'REFER';
      } else {
        recommendation = 'DECLINE';
      }

      // Calculate confidence (based on data completeness)
      const dataCompleteness = this.calculateDataCompleteness(request);
      const confidence = Math.min(0.95, 0.5 + (dataCompleteness * 0.45));

      logger.info('MLScoreCalculated', {
        applicationId: request.applicationId,
        score: finalScore,
        riskLevel,
        recommendation,
        confidence
      });

      return {
        score: Math.round(finalScore),
        riskLevel,
        confidence,
        factors,
        recommendation,
        modelVersion: this.modelVersion,
        provider: 'InternalML',
        metadata: {
          calculationMethod: 'weighted_composite',
          dataCompleteness
        },
        evaluatedAt: new Date()
      };
    } catch (err) {
      logger.error('MLScoringError', { error: (err as Error).message, applicationId: request.applicationId });
      throw new Error(`ML scoring failed: ${(err as Error).message}`);
    }
  }

  private calculateIncomeScore(monthlyIncome: number): number {
    // Income score: 0-100 based on income level
    if (monthlyIncome >= 100000) return 100;
    if (monthlyIncome >= 75000) return 90;
    if (monthlyIncome >= 50000) return 75;
    if (monthlyIncome >= 30000) return 60;
    if (monthlyIncome >= 20000) return 45;
    if (monthlyIncome >= 15000) return 30;
    return 20;
  }

  private normalizeCreditScore(bureauScore: number): number {
    // Normalize bureau score (300-900) to 0-100 scale
    return ((bureauScore - 300) / 600) * 100;
  }

  private calculateFOIRScore(foir: number): number {
    // FOIR score: lower is better
    if (foir <= 0.30) return 100;
    if (foir <= 0.40) return 90;
    if (foir <= 0.50) return 75;
    if (foir <= 0.60) return 50;
    if (foir <= 0.70) return 30;
    return 10;
  }

  private calculateLTVScore(ltv: number): number {
    // LTV score: lower is better
    if (ltv <= 0.60) return 100;
    if (ltv <= 0.70) return 85;
    if (ltv <= 0.80) return 70;
    if (ltv <= 0.85) return 50;
    if (ltv <= 0.90) return 30;
    return 10;
  }

  private calculateEmploymentScore(
    employmentType?: string,
    tenureMonths?: number
  ): number {
    let score = 50; // Base score

    // Employment type scoring
    if (employmentType === 'SALARIED') score += 20;
    else if (employmentType === 'SELF_EMPLOYED') score += 10;
    else if (employmentType === 'BUSINESS') score += 15;

    // Tenure scoring
    if (tenureMonths) {
      if (tenureMonths >= 36) score += 30;
      else if (tenureMonths >= 24) score += 20;
      else if (tenureMonths >= 12) score += 10;
    }

    return Math.min(100, score);
  }

  private calculateBankingScore(years: number): number {
    if (years >= 5) return 100;
    if (years >= 3) return 80;
    if (years >= 2) return 60;
    if (years >= 1) return 40;
    return 20;
  }

  private calculateEMI(principal: number, months: number, annualRate: number): number {
    const r = annualRate / 12 / 100;
    if (r === 0) return principal / months;
    const pow = Math.pow(1 + r, months);
    return principal * r * pow / (pow - 1);
  }

  private calculateDataCompleteness(request: ScoringRequest): number {
    let completeness = 0;
    let totalFields = 8;

    if (request.monthlyIncome > 0) completeness++;
    if (request.creditScore) completeness++;
    if (request.employmentType) completeness++;
    if (request.employmentTenure) completeness++;
    if (request.propertyValue && request.propertyValue > 0) completeness++;
    if (request.bankingRelationship) completeness++;
    if (request.educationLevel) completeness++;
    if (request.channel) completeness++;

    return completeness / totalFields;
  }
}

