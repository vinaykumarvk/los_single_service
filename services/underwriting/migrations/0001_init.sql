CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS underwriting_decisions (
  decision_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('AUTO_APPROVE', 'REFER', 'DECLINE')),
  reasons TEXT[],
  metrics JSONB,
  original_decision TEXT,
  override_request_id UUID,
  evaluated_by TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS override_requests (
  override_request_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  original_decision TEXT NOT NULL CHECK (original_decision IN ('REFER', 'DECLINE')),
  requested_decision TEXT NOT NULL CHECK (requested_decision IN ('AUTO_APPROVE', 'REFER')),
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by TEXT NOT NULL,
  reviewed_by TEXT,
  review_remarks TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_application ON underwriting_decisions(application_id);
CREATE INDEX IF NOT EXISTS idx_decisions_evaluated_at ON underwriting_decisions(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_override_requests_application ON override_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_override_requests_status ON override_requests(status);
CREATE INDEX IF NOT EXISTS idx_override_requests_requested_by ON override_requests(requested_by);

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

