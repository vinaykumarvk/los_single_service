/**
 * Mock Bureau Adapter
 * Returns realistic dummy responses matching real bureau API contract
 */

import { v4 as uuidv4 } from 'uuid';
import { BureauAdapter, BureauPullRequest, BureauPullResponse, BureauReport } from './types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('bureau-mock-adapter');

// Simulate realistic credit scores (650-850 range, with some variation)
function generateMockScore(): number {
  const baseScore = Math.floor(Math.random() * 200) + 650; // 650-850
  return Math.min(850, Math.max(300, baseScore));
}

// Simulate realistic account details
function generateMockAccounts(score: number): Array<{
  accountType: string;
  lender: string;
  accountNumber: string;
  dateOpened: string;
  dateLastReported: string;
  currentBalance: number;
  overdueAmount: number;
  dpd: number;
  status: string;
}> {
  const accountCount = score > 750 ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 3) + 1;
  const accounts = [];
  
  const lenders = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank'];
  const accountTypes = ['Credit Card', 'Home Loan', 'Personal Loan', 'Auto Loan', 'Education Loan'];
  
  for (let i = 0; i < accountCount; i++) {
    const dateOpened = new Date();
    dateOpened.setFullYear(dateOpened.getFullYear() - Math.floor(Math.random() * 5) - 1);
    
    const isDelinquent = score < 700 && Math.random() > 0.7;
    const currentBalance = Math.floor(Math.random() * 500000) + 50000;
    
    accounts.push({
      accountType: accountTypes[Math.floor(Math.random() * accountTypes.length)],
      lender: lenders[Math.floor(Math.random() * lenders.length)],
      accountNumber: `****${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      dateOpened: dateOpened.toISOString().split('T')[0],
      dateLastReported: new Date().toISOString().split('T')[0],
      currentBalance: isDelinquent ? currentBalance : Math.floor(currentBalance * 0.3),
      overdueAmount: isDelinquent ? Math.floor(currentBalance * 0.2) : 0,
      dpd: isDelinquent ? Math.floor(Math.random() * 180) + 30 : 0,
      status: isDelinquent ? 'OVERDUE' : 'CURRENT'
    });
  }
  
  return accounts;
}

export class MockBureauAdapter implements BureauAdapter {
  // Store simulated reports (in production, this would be in database)
  private mockReports: Map<string, BureauReport> = new Map();
  
  async pullCreditReport(request: BureauPullRequest): Promise<BureauPullResponse> {
    logger.info('MockBureauPullRequest', { applicationId: request.applicationId, provider: request.provider });
    
    const requestId = uuidv4();
    const externalRef = uuidv4();
    const provider = request.provider || 'CIBIL';
    
    // Simulate async processing (in real scenario, bureau processes and calls webhook)
    setTimeout(() => {
      this.generateMockReport(requestId, request.applicationId, provider);
    }, 2000 + Math.random() * 3000); // 2-5 second delay
    
    return {
      requestId,
      externalRef,
      status: 'REQUESTED',
      provider,
      estimatedCompletionTime: 5
    };
  }
  
  async getCreditReport(requestId: string): Promise<BureauReport | null> {
    logger.debug('MockBureauGetReport', { requestId });
    return this.mockReports.get(requestId) || null;
  }
  
  private generateMockReport(requestId: string, applicationId: string, provider: string): void {
    const score = generateMockScore();
    const accounts = generateMockAccounts(score);
    
    const report: BureauReport = {
      requestId,
      applicationId,
      score,
      reportData: {
        creditHistory: {
          totalAccounts: accounts.length,
          activeAccounts: accounts.filter(a => a.status === 'CURRENT').length,
          closedAccounts: Math.floor(Math.random() * 3),
          delinquentAccounts: accounts.filter(a => a.dpd > 0).length,
          writtenOffAccounts: score < 600 ? Math.floor(Math.random() * 2) : 0
        },
        accountDetails: accounts,
        recentEnquiries: Math.floor(Math.random() * 5) + 1,
        lastEnquiryDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      provider,
      generatedAt: new Date().toISOString()
    };
    
    this.mockReports.set(requestId, report);
    logger.info('MockBureauReportGenerated', { requestId, score, applicationId });
  }
}


