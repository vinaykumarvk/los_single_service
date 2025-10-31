CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sanctions (
  sanction_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  sanctioned_amount NUMERIC NOT NULL,
  tenure_months INT NOT NULL,
  rate_annual NUMERIC NOT NULL,
  emi NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  offer_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbox table for events like SanctionIssued/OfferAccepted
\i ../../shared/libs/outbox/outbox.sql

