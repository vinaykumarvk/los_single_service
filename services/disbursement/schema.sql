CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS disbursements (
  disbursement_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  beneficiary_account TEXT NOT NULL,
  ifsc TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  cbs_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_disbursement_idempotency ON disbursements (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disbursement_app ON disbursements (application_id);

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

