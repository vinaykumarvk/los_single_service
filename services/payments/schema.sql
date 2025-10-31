CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS fee_payments (
  payment_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'CAPTURED',
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outbox table for FeeCalculated/FeePaymentCaptured
\i ../../shared/libs/outbox/outbox.sql

