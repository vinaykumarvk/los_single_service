-- Add Video KYC support to kyc_sessions table
ALTER TABLE kyc_sessions
ADD COLUMN IF NOT EXISTS kyc_type TEXT CHECK (kyc_type IN ('eKYC', 'VIDEO_KYC')) DEFAULT 'eKYC',
ADD COLUMN IF NOT EXISTS video_session_url TEXT,
ADD COLUMN IF NOT EXISTS video_session_id TEXT,
ADD COLUMN IF NOT EXISTS video_provider TEXT, -- e.g., 'ZOOM', 'GOOGLE_MEET', 'CUSTOM'
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_via TEXT CHECK (completed_via IN ('AUTOMATED', 'MANUAL', 'VIDEO')) DEFAULT 'AUTOMATED';

-- Create index for video KYC sessions
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_video ON kyc_sessions(kyc_type, status) WHERE kyc_type = 'VIDEO_KYC';
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_scheduled ON kyc_sessions(scheduled_at) WHERE scheduled_at IS NOT NULL;

