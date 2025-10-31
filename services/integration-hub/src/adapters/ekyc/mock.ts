/**
 * Mock eKYC Adapter
 * Returns realistic dummy responses matching real eKYC API contract
 */

import { v4 as uuidv4 } from 'uuid';
import { EKYCAdapter, EKYCStartRequest, EKYCStartResponse, EKYCStatus } from './types';
import { createLogger } from '@los/shared-libs';

const logger = createLogger('ekyc-mock-adapter');

export class MockEKYCAdapter implements EKYCAdapter {
  // Store simulated sessions (in production, this would be in database)
  private mockSessions: Map<string, EKYCStatus> = new Map();
  
  async startVerification(request: EKYCStartRequest): Promise<EKYCStartResponse> {
    logger.info('MockEKYCStart', { applicationId: request.applicationId, provider: request.provider });
    
    const sessionId = uuidv4();
    const provider = request.provider || 'NSDL';
    
    // Initialize session
    const session: EKYCStatus = {
      sessionId,
      status: 'PENDING',
      provider,
      kycStatus: 'PENDING'
    };
    this.mockSessions.set(sessionId, session);
    
    // Simulate async processing
    setTimeout(() => {
      this.completeVerification(sessionId, request);
    }, 3000 + Math.random() * 2000); // 3-5 second delay
    
    return {
      sessionId,
      status: 'PENDING',
      provider,
      estimatedCompletionTime: 5,
      requiresOTP: provider === 'AADHAAR_XML',
      maskedMobile: request.mobile ? `******${request.mobile.slice(-4)}` : undefined
    };
  }
  
  async getStatus(sessionId: string): Promise<EKYCStatus | null> {
    logger.debug('MockEKYCGetStatus', { sessionId });
    return this.mockSessions.get(sessionId) || null;
  }
  
  async submitOTP(sessionId: string, otp: string): Promise<{ success: boolean; status: string }> {
    logger.info('MockEKYCSubmitOTP', { sessionId });
    
    const session = this.mockSessions.get(sessionId);
    if (!session) {
      return { success: false, status: 'SESSION_NOT_FOUND' };
    }
    
    // Mock: Accept any 6-digit OTP
    if (/^\d{6}$/.test(otp)) {
      session.status = 'COMPLETED';
      session.kycStatus = 'VERIFIED';
      session.verificationLevel = 'LEVEL_2';
      session.completedAt = new Date().toISOString();
      session.kycData = {
        name: 'John Doe',
        dob: '1990-01-15',
        gender: 'Male',
        address: '123 Main Street, City, State 123456',
        panVerified: true,
        aadhaarVerified: true
      };
      
      return { success: true, status: 'VERIFIED' };
    }
    
    return { success: false, status: 'INVALID_OTP' };
  }
  
  private completeVerification(sessionId: string, request: EKYCStartRequest): void {
    const session = this.mockSessions.get(sessionId);
    if (!session) return;
    
    // Simulate successful verification (90% success rate)
    if (Math.random() > 0.1) {
      session.status = 'COMPLETED';
      session.kycStatus = 'VERIFIED';
      session.verificationLevel = 'LEVEL_2';
      session.completedAt = new Date().toISOString();
      session.kycData = {
        name: 'John Doe',
        dob: '1990-01-15',
        gender: 'Male',
        address: '123 Main Street, City, State 123456',
        panVerified: !!request.pan,
        aadhaarVerified: !!request.aadhaar
      };
      
      logger.info('MockEKYCCompleted', { sessionId, status: 'VERIFIED' });
    } else {
      session.status = 'FAILED';
      session.kycStatus = 'REJECTED';
      session.rejectionReason = 'Data mismatch or verification failed';
      
      logger.info('MockEKYCRejected', { sessionId, reason: session.rejectionReason });
    }
  }
}


