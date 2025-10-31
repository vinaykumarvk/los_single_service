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


