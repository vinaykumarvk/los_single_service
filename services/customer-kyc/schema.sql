CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS applicants (
  applicant_id UUID PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  dob DATE,
  mobile TEXT,
  email TEXT,
  pan TEXT,
  aadhaar_masked TEXT,
  kyc_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consents (
  consent_id UUID PRIMARY KEY,
  applicant_id UUID NOT NULL,
  purpose TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

