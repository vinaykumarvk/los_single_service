CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS documents (
  doc_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  doc_type TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'Uploaded',
  hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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


