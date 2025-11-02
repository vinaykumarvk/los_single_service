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
      return {
        requestId: `CIBIL_REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        externalRef: `EXT_${Date.now()}`,
        status: 'REQUESTED',
        provider: 'CIBIL',
        estimatedCompletionTime: 300
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
                firstName: request.firstName,
                lastName: request.lastName,
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
      // Simulate realistic credit score (650-850)
      const creditScore = Math.floor(Math.random() * 200) + 650;
      
      return {
        requestId,
        creditScore,
        scoreDate: new Date().toISOString(),
        accounts: [
          {
            accountType: 'HOME_LOAN',
            lender: 'HDFC Bank',
            accountNumber: `HL${Math.random().toString(36).substr(2, 8)}`,
            dateOpened: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            dateLastReported: new Date().toISOString().split('T')[0],
            currentBalance: Math.floor(Math.random() * 5000000),
            overdueAmount: 0,
            dpd: 0,
            status: 'CURRENT'
          }
        ],
        inquiries: [],
        publicRecords: [],
        generatedAt: new Date().toISOString()
      };
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
        creditScore: response.creditScore || response.credit_score || 0,
        scoreDate: response.scoreDate || response.score_date || new Date().toISOString(),
        accounts: response.accounts || [],
        inquiries: response.inquiries || [],
        publicRecords: response.publicRecords || response.public_records || [],
        generatedAt: response.generatedAt || response.generated_at || new Date().toISOString(),
      };
    } catch (err) {
      logger.error('CIBILGetReportError', { error: (err as Error).message, requestId });
      throw err;
    }
  }
}


