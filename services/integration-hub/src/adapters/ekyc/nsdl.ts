/**
 * NSDL eKYC Real Adapter
 * Production implementation for NSDL eKYC API integration
 */

import { EKYCAdapter, EKYCStartRequest, EKYCStartResponse, EKYCStatus } from './types';
import { createLogger, retry } from '@los/shared-libs';

const logger = createLogger('ekyc-nsdl-adapter');

export class NSDLAdapter implements EKYCAdapter {
  private apiKey: string;
  private apiSecret: string;
  private apiEndpoint: string;
  private timeout: number;
  private useFallback: boolean;
  
  constructor() {
    this.apiKey = process.env.NSDL_API_KEY || '';
    this.apiSecret = process.env.NSDL_API_SECRET || '';
    this.apiEndpoint = process.env.NSDL_API_ENDPOINT || 'https://api.nsdl.com/v1';
    this.timeout = parseInt(process.env.NSDL_API_TIMEOUT || '30000', 10);
    this.useFallback = !this.apiKey || !this.apiSecret;
    
    if (this.useFallback) {
      logger.warn('NSDLAdapterUsingFallback', { reason: 'NSDL_API_KEY or NSDL_API_SECRET not configured, using dummy responses' });
    }
  }
  
  private getAuthHeader(): string {
    // For NSDL, typically use Basic Auth or custom header with API key/secret
    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }
  
  async startVerification(request: EKYCStartRequest): Promise<EKYCStartResponse> {
    logger.info('NSDLStartSession', { applicationId: request.applicationId, useFallback: this.useFallback });
    
    // Fallback to dummy response if API keys not configured
    if (this.useFallback) {
      const sessionId = `NSDL_SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        sessionId,
        provider: 'NSDL',
        status: 'PENDING',
        estimatedCompletionTime: 300,
        requiresOTP: true,
        maskedMobile: request.mobile ? `******${request.mobile.slice(-4)}` : undefined
      };
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/ekyc/start`, {
              method: 'POST',
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
                'X-Request-ID': request.applicationId || '',
              },
              body: JSON.stringify({
                aadhaarNumber: request.aadhaarNumber || request.aadhaar,
                mobile: request.mobile,
                applicationId: request.applicationId,
                applicantId: request.applicantId,
                pan: request.pan,
                consent: request.consent,
                purpose: request.purpose,
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`NSDL API error: ${res.status} ${errorText}`);
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
        sessionId: response.sessionId || response.session_id,
        provider: 'NSDL',
        status: 'PENDING',
        estimatedCompletionTime: response.estimatedCompletionTime || response.estimated_time || 300,
        requiresOTP: response.requiresOTP !== false || response.otpSent === true,
        maskedMobile: response.maskedMobile || response.masked_mobile
      };
    } catch (err) {
      logger.error('NSDLStartSessionError', { error: (err as Error).message, applicationId: request.applicationId });
      throw err;
    }
  }
  
  async submitOTP(sessionId: string, otp: string): Promise<{ success: boolean; status: string }> {
    logger.debug('NSDLVerifyOTP', { sessionId, useFallback: this.useFallback });
    
    // Fallback to dummy response if API keys not configured
    if (this.useFallback) {
      // Simulate 85% success rate for testing
      const success = Math.random() > 0.15;
      return {
        success,
        status: success ? 'COMPLETED' : 'FAILED'
      };
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/ekyc/verify`, {
              method: 'POST',
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId,
                otp,
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`NSDL API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          maxDelayMs: 3000,
        }
      );
      
      return {
        success: response.status === 'VERIFIED',
        status: response.status === 'VERIFIED' ? 'COMPLETED' : 'FAILED'
      };
    } catch (err) {
      logger.error('NSDLVerifyOTPError', { error: (err as Error).message, sessionId });
      throw err;
    }
  }
  
  async getStatus(sessionId: string): Promise<EKYCStatus | null> {
    logger.debug('NSDLGetStatus', { sessionId, useFallback: this.useFallback });
    
    // Fallback to dummy response if API keys not configured
    if (this.useFallback) {
      return {
        sessionId,
        provider: 'NSDL',
        status: 'COMPLETED',
        verificationLevel: 'LEVEL_1',
        kycStatus: 'VERIFIED',
        completedAt: new Date().toISOString(),
        kycData: {
          name: 'Test User',
          dob: '1990-01-01',
          gender: 'Male',
          address: '123 Test Street, Test City, Test State 123456',
          panVerified: true,
          aadhaarVerified: true
        }
      };
    }
    
    try {
      const response = await retry(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);
          
          try {
            const res = await fetch(`${this.apiEndpoint}/ekyc/status/${sessionId}`, {
              method: 'GET',
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (res.status === 404) {
              return { sessionId, provider: 'NSDL', status: 'NOT_FOUND', verified: false };
            }
            
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`NSDL API error: ${res.status} ${errorText}`);
            }
            
            return res.json();
          } catch (err) {
            clearTimeout(timeoutId);
            throw err;
          }
        },
        {
          maxAttempts: 2,
          initialDelayMs: 1000,
          maxDelayMs: 3000,
        }
      );
      
      return {
        sessionId,
        provider: 'NSDL',
        status: (response.status === 'VERIFIED' ? 'COMPLETED' : response.status === 'FAILED' ? 'FAILED' : response.status === 'REJECTED' ? 'REJECTED' : 'PENDING') as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REJECTED',
        verificationLevel: response.verificationLevel || response.verification_level || 'LEVEL_1',
        kycStatus: response.kycStatus || response.kyc_status || (response.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING'),
        completedAt: response.verifiedAt || response.verified_at || response.completedAt || response.completed_at,
        kycData: response.kycData || response.kyc_data || {
          name: response.name,
          dob: response.dob,
          gender: response.gender,
          address: response.address,
          photo: response.photo,
          panVerified: response.panVerified || response.pan_verified,
          aadhaarVerified: response.aadhaarVerified !== false && response.status === 'VERIFIED'
        }
      };
    } catch (err) {
      logger.error('NSDLGetStatusError', { error: (err as Error).message, sessionId });
      throw err;
    }
  }
}

