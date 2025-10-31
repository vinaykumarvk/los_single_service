-- Seed master data for LOS
-- Run this after creating schemas: psql -U los -d los < infra/seed.sql

-- Products
INSERT INTO products (product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit)
VALUES
  ('HOME_LOAN_V1', 'Home Loan', 500000, 10000000, 60, 360, 0.45, 70),
  ('PERSONAL_LOAN_V1', 'Personal Loan', 50000, 5000000, 12, 60, 0.50, 65)
ON CONFLICT (product_code) DO NOTHING;

-- Document checklist
INSERT INTO document_checklist (id, product_code, doc_type, required)
VALUES
  (gen_random_uuid(), 'HOME_LOAN_V1', 'PAN', true),
  (gen_random_uuid(), 'HOME_LOAN_V1', 'AADHAAR', true),
  (gen_random_uuid(), 'HOME_LOAN_V1', 'ITR', true),
  (gen_random_uuid(), 'HOME_LOAN_V1', 'BANK_STATEMENT', true),
  (gen_random_uuid(), 'HOME_LOAN_V1', 'PROPERTY_DOCS', true),
  (gen_random_uuid(), 'PERSONAL_LOAN_V1', 'PAN', true),
  (gen_random_uuid(), 'PERSONAL_LOAN_V1', 'AADHAAR', true),
  (gen_random_uuid(), 'PERSONAL_LOAN_V1', 'SALARY_SLIP', true),
  (gen_random_uuid(), 'PERSONAL_LOAN_V1', 'BANK_STATEMENT', true)
ON CONFLICT DO NOTHING;

