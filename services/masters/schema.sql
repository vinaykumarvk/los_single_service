CREATE TABLE IF NOT EXISTS products (
  product_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  min_amount NUMERIC NOT NULL,
  max_amount NUMERIC NOT NULL,
  min_tenure_months INT NOT NULL,
  max_tenure_months INT NOT NULL,
  max_foir NUMERIC,
  age_at_maturity_limit INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_checklist (
  id UUID PRIMARY KEY,
  product_code TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true
);

