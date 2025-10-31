CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS underwriting_decisions (
  decision_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('AUTO_APPROVE', 'REFER', 'DECLINE')),
  reasons TEXT[],
  metrics JSONB, -- foir, ltv, ageAtMaturity, proposedEmi
  original_decision TEXT, -- For overrides, store original decision
  override_request_id UUID, -- Link to override request if this is an override decision
  evaluated_by TEXT, -- User who evaluated
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS override_requests (
  override_request_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  original_decision TEXT NOT NULL CHECK (original_decision IN ('REFER', 'DECLINE')),
  requested_decision TEXT NOT NULL CHECK (requested_decision IN ('AUTO_APPROVE', 'REFER')),
  justification TEXT NOT NULL, -- Maker's reason for override
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by TEXT NOT NULL, -- Maker user ID
  reviewed_by TEXT, -- Checker user ID
  review_remarks TEXT, -- Checker's remarks
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_decisions_application ON underwriting_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_decisions_evaluated_at ON underwriting_decisions(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_override_requests_application ON override_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_override_requests_status ON override_requests(status);
CREATE INDEX IF NOT EXISTS idx_override_requests_requested_by ON override_requests(requested_by);

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

