/**
 * Scoring Service Types
 * Defines interfaces for scoring adapters and results
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
  creditScore?: number; // Bureau credit score (if available)
  employmentType?: 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS';
  employmentTenure?: number; // Months
  educationLevel?: string;
  existingLoans?: number;
  bankingRelationship?: number; // Years
  previousDefaults?: boolean;
  channel?: string;
  productCode?: string;
  additionalData?: Record<string, any>; // For extensibility
}

export interface ScoringResult {
  score: number; // Overall credit score (0-1000 or similar scale)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  confidence: number; // Confidence in score (0-1)
  factors: ScoringFactor[];
  recommendation: 'APPROVE' | 'REFER' | 'DECLINE';
  modelVersion?: string; // For our own ML models
  provider?: string; // For third-party providers
  providerRef?: string; // Reference ID from provider
  metadata?: Record<string, any>;
  evaluatedAt: Date;
}

export interface ScoringFactor {
  name: string;
  value: number;
  weight: number;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
}

export interface ScoringAdapter {
  /**
   * Calculate credit score based on application data
   */
  calculateScore(request: ScoringRequest): Promise<ScoringResult>;
  
  /**
   * Get adapter name/provider
   */
  getName(): string;
  
  /**
   * Check if adapter is available/configured
   */
  isAvailable(): boolean;
}

export interface MLModelConfig {
  modelType: 'LINEAR_REGRESSION' | 'RANDOM_FOREST' | 'XGBOOST' | 'NEURAL_NETWORK' | 'HYBRID';
  version: string;
  weights: {
    income: number;
    creditScore: number;
    foir: number;
    ltv: number;
    employment: number;
    bankingRelationship: number;
    defaults: number;
    [key: string]: number;
  };
  thresholds: {
    approve: number;
    refer: number;
    decline: number;
  };
}

