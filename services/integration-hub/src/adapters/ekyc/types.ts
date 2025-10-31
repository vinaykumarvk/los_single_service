/**
 * eKYC Integration Types
 * Common interface for eKYC providers (NSDL, Aadhaar XML, CKYC)
 */

export interface EKYCStartRequest {
  applicationId: string;
  applicantId: string;
  pan?: string;
  aadhaar?: string; // Encrypted
  mobile?: string;
  consent: boolean;
  purpose: 'KYC' | 'CREDIT_CHECK' | 'LOAN_PROCESSING';
  provider?: 'NSDL' | 'AADHAAR_XML' | 'CKYC';
}

export interface EKYCStartResponse {
  sessionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  provider: string;
  estimatedCompletionTime?: number; // seconds
  requiresOTP?: boolean;
  maskedMobile?: string; // Last 4 digits only
}

export interface EKYCStatus {
  sessionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'REJECTED';
  verificationLevel?: 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  kycStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED';
  provider: string;
  completedAt?: string;
  rejectionReason?: string;
  kycData?: {
    name?: string;
    dob?: string;
    gender?: string;
    address?: string;
    photo?: string; // Base64 or URL
    panVerified?: boolean;
    aadhaarVerified?: boolean;
  };
}

export interface EKYCAdapter {
  /**
   * Start eKYC verification process
   */
  startVerification(request: EKYCStartRequest): Promise<EKYCStartResponse>;
  
  /**
   * Check eKYC status
   */
  getStatus(sessionId: string): Promise<EKYCStatus | null>;
  
  /**
   * Submit OTP for eKYC (if required)
   */
  submitOTP(sessionId: string, otp: string): Promise<{ success: boolean; status: string }>;
}


