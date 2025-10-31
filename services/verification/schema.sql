CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS verification_tasks (
  task_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  verification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  assignee_id TEXT,
  result TEXT,
  remarks TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_app ON verification_tasks (application_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_tasks (status);

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

