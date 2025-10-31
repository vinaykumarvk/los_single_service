/**
 * Bureau Integration Types
 * Common interface for all bureau providers (CIBIL, Experian, Equifax)
 */

export interface BureauPullRequest {
  applicationId: string;
  applicantId: string;
  pan?: string;
  mobile?: string;
  dob?: string;
  provider?: 'CIBIL' | 'EXPERIAN' | 'EQUIFAX';
}

export interface BureauPullResponse {
  requestId: string;
  externalRef: string;
  status: 'REQUESTED' | 'PENDING' | 'COMPLETED' | 'FAILED';
  provider: string;
  estimatedCompletionTime?: number; // seconds
}

export interface BureauReport {
  requestId: string;
  applicationId: string;
  score: number; // 300-900 range
  reportData: {
    personalInfo?: {
      name?: string;
      dateOfBirth?: string;
      pan?: string;
    };
    creditHistory?: {
      totalAccounts?: number;
      activeAccounts?: number;
      closedAccounts?: number;
      delinquentAccounts?: number;
      writtenOffAccounts?: number;
    };
    accountDetails?: Array<{
      accountType?: string;
      lender?: string;
      accountNumber?: string;
      dateOpened?: string;
      dateLastReported?: string;
      currentBalance?: number;
      overdueAmount?: number;
      dpd?: number; // Days Past Due
      status?: string;
    }>;
    recentEnquiries?: number;
    lastEnquiryDate?: string;
  };
  provider: string;
  generatedAt: string;
}

export interface BureauAdapter {
  /**
   * Pull credit report from bureau
   * In real implementation, this would be async (webhook callback)
   * Mock implementation simulates the delay
   */
  pullCreditReport(request: BureauPullRequest): Promise<BureauPullResponse>;
  
  /**
   * Get credit report by request ID
   * In real implementation, poll or receive via webhook
   */
  getCreditReport(requestId: string): Promise<BureauReport | null>;
}


