-- Consolidated Base Schema for Monolith
-- This creates all base tables needed by all services

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  roles TEXT[] DEFAULT ARRAY['applicant']::TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  reports_to UUID REFERENCES users(user_id),
  employee_id TEXT,
  designation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================
-- APPLICANTS / KYC
-- ============================================
CREATE TABLE IF NOT EXISTS applicants (
  applicant_id UUID PRIMARY KEY,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT,
  father_name TEXT,
  mother_name TEXT,
  marital_status TEXT,
  mobile TEXT,
  email TEXT,
  pan TEXT,
  aadhaar_masked TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  occupation TEXT,
  employer_name TEXT,
  employment_type TEXT,
  monthly_income NUMERIC(15,2),
  existing_emi NUMERIC(15,2),
  other_income_sources TEXT,
  years_in_job INTEGER,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_account_holder_name TEXT,
  bank_verified BOOLEAN DEFAULT false,
  bank_verification_method TEXT,
  bank_verified_at TIMESTAMPTZ,
  co_applicant_id UUID,
  is_co_applicant BOOLEAN DEFAULT false,
  kyc_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applicants_mobile ON applicants(mobile);
CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email);
CREATE INDEX IF NOT EXISTS idx_applicants_pan ON applicants(pan);

-- ============================================
-- APPLICATIONS
-- ============================================
-- Sequences for human-readable application IDs
CREATE SEQUENCE IF NOT EXISTS seq_home_loan START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_personal_loan START WITH 1;
CREATE SEQUENCE IF NOT EXISTS seq_balance_transfer START WITH 1;

CREATE TABLE IF NOT EXISTS applications (
  application_id TEXT PRIMARY KEY,
  applicant_id UUID NOT NULL,
  channel TEXT NOT NULL,
  product_code TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL,
  requested_tenure_months INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  assigned_to UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_applicant ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_product ON applications(product_code);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to ON applications(assigned_to);

CREATE TABLE IF NOT EXISTS application_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  event_data JSONB NOT NULL,
  actor_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_application ON application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_history_occurred_at ON application_history(occurred_at DESC);

CREATE TABLE IF NOT EXISTS application_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_details (
  property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  property_type TEXT NOT NULL CHECK (property_type IN ('Flat', 'Plot', 'House', 'Under Construction')),
  builder_name TEXT,
  project_name TEXT,
  property_value NUMERIC(15,2),
  property_address TEXT,
  property_pincode TEXT,
  property_city TEXT,
  property_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  hash TEXT,
  status TEXT DEFAULT 'Uploaded',
  object_key TEXT,
  extracted_data JSONB,
  ocr_provider TEXT,
  ocr_confidence NUMERIC(5,2),
  version INTEGER DEFAULT 1,
  previous_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_application ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(doc_type);

-- ============================================
-- MASTERS / PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  product_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_amount NUMERIC(15,2) NOT NULL,
  max_amount NUMERIC(15,2) NOT NULL,
  min_tenure_months INTEGER NOT NULL,
  max_tenure_months INTEGER NOT NULL,
  max_foir NUMERIC(5,2),
  age_at_maturity_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_calendar (
  holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_type TEXT NOT NULL CHECK (holiday_type IN ('NATIONAL', 'BANK', 'STATE', 'REGIONAL')),
  applicable_states TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_calendar_date ON business_calendar(holiday_date);

-- ============================================
-- OUTBOX (Event Publishing)
-- ============================================
CREATE TABLE IF NOT EXISTS outbox (
  id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  topic TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ NULL,
  attempts INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_outbox_published ON outbox (published_at);
CREATE INDEX IF NOT EXISTS idx_outbox_topic ON outbox (topic);

-- ============================================
-- FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION generate_application_id(product_code TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  serial_num INTEGER;
  app_id TEXT;
BEGIN
  CASE 
    WHEN product_code = 'HOME_LOAN_V1' OR product_code LIKE 'HOME%' THEN prefix := 'HL';
    WHEN product_code = 'PERSONAL_LOAN_V1' OR product_code = 'PL' OR product_code LIKE 'PERSONAL%' THEN prefix := 'PL';
    WHEN product_code = 'BALANCE_TRANSFER_V1' OR product_code LIKE 'BALANCE%' THEN prefix := 'BT';
    WHEN product_code = 'BUSINESS_LOAN_V1' OR product_code LIKE 'BUSINESS%' THEN prefix := 'BL';
    WHEN product_code = 'EDUCATION_LOAN_V1' OR product_code LIKE 'EDUCATION%' THEN prefix := 'EL';
    WHEN product_code = 'VEHICLE_LOAN_V1' OR product_code LIKE 'VEHICLE%' THEN prefix := 'VL';
    ELSE prefix := 'AP';
  END CASE;

  CASE 
    WHEN product_code = 'HOME_LOAN_V1' OR product_code LIKE 'HOME%' THEN 
      serial_num := nextval('seq_home_loan');
    WHEN product_code = 'PERSONAL_LOAN_V1' OR product_code = 'PL' OR product_code LIKE 'PERSONAL%' THEN 
      serial_num := nextval('seq_personal_loan');
    WHEN product_code = 'BALANCE_TRANSFER_V1' OR product_code LIKE 'BALANCE%' THEN 
      serial_num := nextval('seq_balance_transfer');
    ELSE 
      serial_num := nextval('seq_home_loan');
  END CASE;

  app_id := prefix || LPAD(serial_num::TEXT, 5, '0');

  RETURN app_id;
END;
$$ LANGUAGE plpgsql;

