CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Scoring Results Table
CREATE TABLE IF NOT EXISTS scoring_results (
  scoring_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  score NUMERIC(6, 2) NOT NULL, -- Score (0-1000)
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH')),
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('APPROVE', 'REFER', 'DECLINE')),
  provider TEXT NOT NULL, -- 'InternalML', 'Experian', 'FICO', etc.
  provider_ref TEXT, -- Reference ID from provider
  factors JSONB, -- Array of scoring factors
  metadata JSONB, -- Additional metadata
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scoring_results_application ON scoring_results(application_id);
CREATE INDEX IF NOT EXISTS idx_scoring_results_applicant ON scoring_results(applicant_id);
CREATE INDEX IF NOT EXISTS idx_scoring_results_evaluated_at ON scoring_results(evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scoring_results_provider ON scoring_results(provider);
CREATE INDEX IF NOT EXISTS idx_scoring_results_score ON scoring_results(score DESC);

-- Outbox table (for event publishing)
\i ../../shared/libs/outbox/outbox.sql

