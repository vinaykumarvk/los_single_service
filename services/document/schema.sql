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

-- Outbox table
\i ../../shared/libs/outbox/outbox.sql

