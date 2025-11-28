-- Add address, employment, and co-applicant fields to applicants table

ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'PreferNotToSay')),
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed')),
-- Address fields
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS address_line2 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India',
-- Employment fields
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS employer_name TEXT,
ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('Salaried', 'SelfEmployed', 'Business', 'Retired', 'Student', 'Unemployed')),
ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS existing_emi NUMERIC(15,2) DEFAULT 0,
-- Co-applicant reference (self-reference to applicants table for primary applicant)
ADD COLUMN IF NOT EXISTS co_applicant_id UUID REFERENCES applicants(applicant_id),
ADD COLUMN IF NOT EXISTS is_co_applicant BOOLEAN DEFAULT false;

-- Create index on co_applicant_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_applicants_co_applicant ON applicants(co_applicant_id);

-- Create index on employment fields for filtering
CREATE INDEX IF NOT EXISTS idx_applicants_employment ON applicants(employment_type, monthly_income);

