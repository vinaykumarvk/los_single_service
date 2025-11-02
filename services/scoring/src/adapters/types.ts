/**
 * Scoring Adapter Interface
 * Defines contract for scoring providers (internal ML or third-party)
 */

export interface ScoringRequest {
  applicationId: string;
  applicantId: string;
  monthlyIncome: number;
  existingEmi: number;
  proposedAmount: number;
  tenureMonths: number;
  propertyValue?: number;
  applicantAgeYears: number;
  creditScore?: number;
  employmentType?: 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS';
  employmentTenure?: number; // months
  bankingRelationship?: number; // months
  previousDefaults?: boolean;
  channel?: string;
  productCode?: string;
  // Additional context
  bureauReport?: {
    score?: number;
    totalAccounts?: number;
    activeAccounts?: number;
    delinquentAccounts?: number;
    dpd?: number;
  };
  documentCount?: number;
  kycStatus?: string;
}

export interface ScoringResponse {
  score: number; // 0-1000 scale
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  recommendation: 'APPROVE' | 'REFER' | 'DECLINE';
  confidence: number; // 0-1
  factors: Array<{
    factor: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    weight: number;
    explanation?: string;
  }>;
  providerUsed: string;
  modelVersion?: string;
  calculatedAt: string;
  metadata?: Record<string, any>;
}

export interface ScoringAdapter {
  /**
   * Calculate credit score for an application
   */
  calculate(request: ScoringRequest): Promise<ScoringResponse>;
  
  /**
   * Get adapter metadata
   */
  getMetadata(): {
    name: string;
    version: string;
    supportedFeatures: string[];
    requiresConfig: boolean;
  };
  
  /**
   * Check if adapter is available/configured
   */
  isAvailable(): boolean;
}

