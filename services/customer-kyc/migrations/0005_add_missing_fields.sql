-- Add missing fields for RM application forms
-- other_income_sources, years_in_job, bank account fields

ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS other_income_sources TEXT,
ADD COLUMN IF NOT EXISTS years_in_job NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_verification_method TEXT CHECK (bank_verification_method IN ('name_match', 'penny_drop', 'manual')),
ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ;

-- Update dob column name to date_of_birth for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applicants' AND column_name = 'dob'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applicants' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE applicants RENAME COLUMN dob TO date_of_birth;
  END IF;
END $$;

-- Create index on bank fields
CREATE INDEX IF NOT EXISTS idx_applicants_bank_verified ON applicants(bank_verified, bank_verified_at);

-- Update employment_type enum to match frontend (Self-employed -> SelfEmployed)
-- Note: Frontend sends 'Self-employed' but we store 'SelfEmployed', conversion happens in API layer

