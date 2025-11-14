CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
CREATE INDEX IF NOT EXISTS idx_history_event_type ON application_history(event_type);
CREATE INDEX IF NOT EXISTS idx_history_event_source ON application_history(event_source);

CREATE TABLE IF NOT EXISTS application_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_notes_application ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_application_notes_created_at ON application_notes(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_property_details_application_id ON property_details(application_id);
CREATE INDEX IF NOT EXISTS idx_property_details_property_type ON property_details(property_type);

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

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql
