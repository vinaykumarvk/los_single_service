/**
 * CIBIL Real Adapter
 * Production implementation for CIBIL API integration
 */

import { BureauAdapter, BureauPullRequest, BureauPullResponse, BureauReport } from './types';
import { createLogger, retry } from '@los/shared-libs';

const logger = createLogger('bureau-cibil-adapter');

export class CIBILAdapter implements BureauAdapter {
  private apiKey: string;
  private apiEndpoint: string;
  private timeout: number;
  private useFallback: boolean;
  private mockReports: Map<string, BureauReport> = new Map(); // Store reports in fallback mode
  
  constructor() {
    this.apiKey = process.env.CIBIL_API_KEY || '';
    this.apiEndpoint = process.env.CIBIL_API_ENDPOINT || 'https://api.cibil.com/v1';
    this.timeout = parseInt(process.env.CIBIL_API_TIMEOUT || '30000', 10);
    this.useFallback = !this.apiKey;
    
    if (this.useFallback) {
      logger.warn('CIBILAdapterUsingFallback', { reason: 'CIBIL_API_KEY not configured, using dummy responses' });
    }
  }
  
  async pullCreditReport(request: BureauPullRequest): Promise<BureauPullResponse> {
    logger.info('CIBILPullRequest', { applicationId: request.applicationId, useFallback: this.useFallback });
    
    // Fallback to dummy response if API key not configured
    if (this.useFallback) {
      const requestId = `CIBIL_REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate and store report immediately for stub (synchronous for testing)
      // In real implementation, this would be async via webhook
      const creditScore = Math.floor(Math.random() * 200) + 650;
      const lenders = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Mahindra Bank'];
      const accountTypes = ['HOME_LOAN', 'PERSONAL_LOAN', 'AUTO_LOAN', 'CREDIT_CARD', 'EDUCATION_LOAN'];
      const accountCount = creditScore > 750 ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 3) + 1;
      
      const accounts = [];
      for (let i = 0; i < accountCount; i++) {
        const dateOpened = new Date();
        dateOpened.setFullYear(dateOpened.getFullYear() - Math.floor(Math.random() * 5) - 1);
        const isDelinquent = creditScore < 700 && Math.random() > 0.7;
        const currentBalance = Math.floor(Math.random() * 5000000) + 50000;
        
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
      
      const report: BureauReport = {
        requestId,
        applicationId: request.applicationId || '',
        score: creditScore,
        reportData: {
          creditHistory: {
            totalAccounts: accounts.length,
            activeAccounts: accounts.filter(a => a.status === 'CURRENT').length,
            closedAccounts: Math.floor(Math.random() * 3),
            delinquentAccounts: accounts.filter(a => a.dpd > 0).length,
            writtenOffAccounts: creditScore < 600 ? Math.floor(Math.random() * 2) : 0
          },
          accountDetails: accounts,
          recentEnquiries: Math.floor(Math.random() * 5) + 1,
          lastEnquiryDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        provider: 'CIBIL',
        generatedAt: new Date().toISOString()
      };
      
      // Store report immediately for stub
      this.mockReports.set(requestId, report);
      logger.info('CIBILMockReportGenerated', { requestId, score: creditScore, applicationId: request.applicationId });
      
      return {
        requestId,
        externalRef: `EXT_${Date.now()}`,
        status: 'REQUESTED',
        provider: 'CIBIL',
        estimatedCompletionTime: 1
      };
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/credit-report/request`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'X-Request-ID': request.applicationId || '',
              },
              body: JSON.stringify({
                pan: request.pan,
                dob: request.dob,
                mobile: request.mobile,
                applicationId: request.applicationId,
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`CIBIL API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
        }
      );
      
      return {
        requestId: response.requestId || response.request_id,
        externalRef: response.externalRef || response.external_ref,
        status: 'REQUESTED',
        provider: 'CIBIL',
        estimatedCompletionTime: response.estimatedCompletionTime || response.estimated_time || 300
      };
    } catch (err) {
      logger.error('CIBILPullError', { error: (err as Error).message, applicationId: request.applicationId });
      throw err;
    }
  }
  
  async getCreditReport(requestId: string): Promise<BureauReport | null> {
    logger.debug('CIBILGetReport', { requestId, useFallback: this.useFallback });
    
    // Fallback to dummy response if API key not configured
    if (this.useFallback) {
      // Check if report is already generated and stored
      const storedReport = this.mockReports.get(requestId);
      if (storedReport) {
        return storedReport;
      }
      
      // If not found, return null (report not ready yet)
      // In real implementation, this would poll or wait for webhook
      return null;
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/credit-report/${requestId}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (res.status === 404) {
              return null; // Report not ready yet
            }
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`CIBIL API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 2,
          initialDelayMs: 2000,
          maxDelayMs: 5000,
        }
      );
      
      if (!response) {
        return null;
      }
      
      return {
        requestId: response.requestId || requestId,
        applicationId: response.applicationId || '',
        score: response.creditScore || response.credit_score || 0,
        reportData: {
          creditHistory: response.creditHistory || response.credit_history || {},
          accountDetails: response.accounts || response.accountDetails || [],
          recentEnquiries: response.recentEnquiries || response.recent_enquiries || 0,
          lastEnquiryDate: response.lastEnquiryDate || response.last_enquiry_date || new Date().toISOString().split('T')[0]
        },
        provider: 'CIBIL',
        generatedAt: response.generatedAt || response.generated_at || new Date().toISOString(),
      };
    } catch (err) {
      logger.error('CIBILGetReportError', { error: (err as Error).message, requestId });
      throw err;
    }
  }
}


