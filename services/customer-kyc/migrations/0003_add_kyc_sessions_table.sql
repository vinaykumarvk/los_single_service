-- Create KYC sessions table to track KYC process status
CREATE TABLE IF NOT EXISTS kyc_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  applicant_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'REJECTED')),
  provider TEXT, -- eKYC provider used (NSDL, Aadhaar XML, etc.)
  provider_session_id TEXT, -- Provider's session ID
  provider_response JSONB, -- Full provider response for audit
  remarks TEXT, -- Rejection remarks if status is REJECTED
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_application ON kyc_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_status ON kyc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_applicant ON kyc_sessions(applicant_id) WHERE applicant_id IS NOT NULL;

