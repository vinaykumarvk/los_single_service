CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS bureau_requests (
  request_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'CIBIL',
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bureau_reports (
  report_id UUID PRIMARY KEY,
  request_id UUID NOT NULL,
  application_id UUID NOT NULL,
  score NUMERIC,
  report_data JSONB NOT NULL,
  provider TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id)
);

CREATE INDEX IF NOT EXISTS idx_bureau_app ON bureau_requests (application_id);
CREATE INDEX IF NOT EXISTS idx_bureau_status ON bureau_requests (status);

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

