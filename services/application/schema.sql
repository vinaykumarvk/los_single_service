CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS applications (
  application_id UUID PRIMARY KEY,
  applicant_id UUID NOT NULL,
  channel TEXT NOT NULL,
  product_code TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL,
  requested_tenure_months INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

