CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Immutable audit log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  service TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_id UUID,
  actor_id TEXT,
  details JSONB NOT NULL,
  hash TEXT -- For optional hash-chaining (WORM)
);

CREATE INDEX IF NOT EXISTS idx_audit_aggregate ON audit_log (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_audit_occurred ON audit_log (occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_service ON audit_log (service);

-- Consent ledger
CREATE TABLE IF NOT EXISTS consent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL,
  consent_id UUID NOT NULL,
  purpose TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  details JSONB
);

