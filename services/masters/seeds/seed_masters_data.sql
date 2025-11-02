-- Seed data for Masters Service
-- This script populates sample data for rates, charges, documents, branches, roles, and rules

-- Seed Rate Matrices
INSERT INTO rate_matrices (product_code, rate_type, interest_rate, effective_from, min_amount, max_amount, min_tenure_months, max_tenure_months, applicable_channels, applicable_states)
VALUES
  ('HOME_LOAN_V1', 'Floating', 8.50, '2024-01-01', 500000, 50000000, 60, 360, ARRAY['Branch', 'Online', 'MobileApp'], ARRAY['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi']),
  ('HOME_LOAN_V1', 'Fixed', 8.75, '2024-01-01', 500000, 50000000, 60, 360, ARRAY['Branch'], NULL),
  ('PERSONAL_LOAN_V1', 'Floating', 12.50, '2024-01-01', 50000, 5000000, 12, 84, ARRAY['Branch', 'Online', 'MobileApp', 'DSA'], NULL),
  ('PERSONAL_LOAN_V1', 'Fixed', 13.00, '2024-01-01', 50000, 5000000, 12, 84, ARRAY['Branch', 'Online'], NULL),
  ('HOME_LOAN_V1', 'Hybrid', 8.60, '2024-01-01', 1000000, 50000000, 120, 360, ARRAY['Branch', 'Online'], NULL)
ON CONFLICT (product_code, rate_type, effective_from) DO NOTHING;

-- Seed Charges
INSERT INTO charges (charge_code, charge_name, charge_type, calculation_method, fixed_amount, percentage_rate, min_charge, max_charge, applicable_to_products, applicable_channels, effective_from)
VALUES
  ('PROC_FEE_HOME', 'Processing Fee - Home Loan', 'ProcessingFee', 'Percentage', NULL, 0.50, 5000, 50000, ARRAY['HOME_LOAN_V1'], ARRAY['Branch', 'Online', 'MobileApp'], '2024-01-01'),
  ('PROC_FEE_PERSONAL', 'Processing Fee - Personal Loan', 'ProcessingFee', 'Fixed', 2500, NULL, 2500, 2500, ARRAY['PERSONAL_LOAN_V1'], NULL, '2024-01-01'),
  ('DOC_FEE_HOME', 'Documentation Fee - Home Loan', 'DocumentationFee', 'Fixed', 10000, NULL, 10000, 10000, ARRAY['HOME_LOAN_V1'], NULL, '2024-01-01'),
  ('STAMP_DUTY', 'Stamp Duty', 'StampDuty', 'Percentage', NULL, 0.10, 1000, NULL, ARRAY['HOME_LOAN_V1'], NULL, '2024-01-01'),
  ('LEGAL_FEE', 'Legal Fee', 'LegalFee', 'Fixed', 15000, NULL, 15000, 15000, ARRAY['HOME_LOAN_V1'], NULL, '2024-01-01')
ON CONFLICT (charge_code) DO NOTHING;

-- Seed Document Master
INSERT INTO document_master (document_code, document_name, document_category, is_mandatory, validity_period_days, applicable_products, applicable_channels, metadata)
VALUES
  ('PAN_CARD', 'PAN Card', 'Identity', true, NULL, NULL, NULL, '{"format": "image", "size_limit_mb": 2}'),
  ('AADHAAR', 'Aadhaar Card', 'Identity', true, NULL, NULL, NULL, '{"format": "image", "size_limit_mb": 2}'),
  ('DRIVING_LICENSE', 'Driving License', 'Identity', false, NULL, NULL, NULL, '{"format": "image", "size_limit_mb": 2}'),
  ('VOTER_ID', 'Voter ID', 'Identity', false, NULL, NULL, NULL, '{"format": "image", "size_limit_mb": 2}'),
  ('AADHAAR_ADD_PROOF', 'Aadhaar Address Proof', 'Address', true, NULL, ARRAY['HOME_LOAN_V1'], NULL, '{"format": "image", "size_limit_mb": 2}'),
  ('UTILITY_BILL', 'Utility Bill (Electricity/Water)', 'Address', false, 90, ARRAY['HOME_LOAN_V1'], NULL, '{"format": "pdf,image", "size_limit_mb": 5}'),
  ('SALARY_SLIP', 'Salary Slip (Last 3 months)', 'Income', true, 30, ARRAY['HOME_LOAN_V1', 'PERSONAL_LOAN_V1'], NULL, '{"format": "pdf,image", "size_limit_mb": 5}'),
  ('BANK_STATEMENT', 'Bank Statement (Last 6 months)', 'Income', true, 30, ARRAY['HOME_LOAN_V1', 'PERSONAL_LOAN_V1'], NULL, '{"format": "pdf", "size_limit_mb": 10}'),
  ('ITR', 'Income Tax Return (Last 2 years)', 'Income', false, 365, ARRAY['HOME_LOAN_V1'], NULL, '{"format": "pdf", "size_limit_mb": 5}'),
  ('FORM_16', 'Form 16', 'Income', false, 365, ARRAY['HOME_LOAN_V1'], NULL, '{"format": "pdf", "size_limit_mb": 5}'),
  ('PROPERTY_DOCS', 'Property Documents (Title Deed)', 'Property', true, NULL, ARRAY['HOME_LOAN_V1'], NULL, '{"format": "pdf,image", "size_limit_mb": 10}'),
  ('PROPERTY_PLAN', 'Property Plan/Approval', 'Property', false, NULL, ARRAY['HOME_LOAN_V1'], NULL, '{"format": "pdf,image", "size_limit_mb": 5}')
ON CONFLICT (document_code) DO NOTHING;

-- Seed Branches
INSERT INTO branches (branch_code, branch_name, branch_type, address_line1, address_line2, city, state, pincode, contact_mobile, contact_email, manager_name, metadata)
VALUES
  ('HO_MUM', 'Head Office - Mumbai', 'HeadOffice', 'Nariman Point', 'Fort Area', 'Mumbai', 'Maharashtra', '400021', '022-12345678', 'ho.mumbai@los.com', 'Rajesh Kumar', '{"latitude": 18.9330, "longitude": 72.8350}'),
  ('BR_MUM_001', 'Mumbai - Andheri Branch', 'Branch', 'Andheri West', 'Near Metro Station', 'Mumbai', 'Maharashtra', '400053', '022-23456789', 'andheri@los.com', 'Priya Sharma', '{"latitude": 19.1136, "longitude": 72.8697}'),
  ('BR_DEL_001', 'Delhi - Connaught Place Branch', 'Branch', 'Connaught Place', 'Block A', 'New Delhi', 'Delhi', '110001', '011-34567890', 'cp@los.com', 'Amit Singh', '{"latitude": 28.6304, "longitude": 77.2177}'),
  ('RO_BLR', 'Regional Office - Bangalore', 'RegionalOffice', 'MG Road', 'Near Metro Station', 'Bangalore', 'Karnataka', '560001', '080-45678901', 'ro.bangalore@los.com', 'Suresh Reddy', '{"latitude": 12.9716, "longitude": 77.5946}'),
  ('BR_BLR_001', 'Bangalore - Whitefield Branch', 'Branch', 'Whitefield', 'ITPL Road', 'Bangalore', 'Karnataka', '560066', '080-56789012', 'whitefield@los.com', 'Kavitha Nair', '{"latitude": 12.9698, "longitude": 77.7499}'),
  ('BR_CHN_001', 'Chennai - T Nagar Branch', 'Branch', 'T Nagar', 'Thyagaraja Road', 'Chennai', 'Tamil Nadu', '600017', '044-67890123', 'tnagar@los.com', 'Vikram Iyer', '{"latitude": 13.0418, "longitude": 80.2341}')
ON CONFLICT (branch_code) DO NOTHING;

-- Seed Roles Master
INSERT INTO roles_master (role_code, role_name, role_category, permissions)
VALUES
  ('SALES_EXEC', 'Sales Executive', 'Sales', '["applications:create", "applications:view", "applicants:create", "applicants:view", "leads:view", "leads:convert"]'::jsonb),
  ('SALES_MANAGER', 'Sales Manager', 'Sales', '["applications:view", "applications:approve", "leads:view", "leads:assign", "reports:view"]'::jsonb),
  ('UNDERWRITER', 'Underwriter', 'Underwriting', '["applications:view", "applications:underwrite", "bureau:view", "documents:view", "rules:view"]'::jsonb),
  ('SENIOR_UNDERWRITER', 'Senior Underwriter', 'Underwriting', '["applications:view", "applications:underwrite", "applications:override", "bureau:view", "documents:view", "rules:view", "rules:approve"]'::jsonb),
  ('VERIFIER', 'Verification Officer', 'Verification', '["applications:view", "documents:verify", "kyc:verify", "address:verify"]'::jsonb),
  ('RISK_ANALYST', 'Risk Analyst', 'Risk', '["applications:view", "bureau:view", "reports:view", "rules:view"]'::jsonb),
  ('BRANCH_MANAGER', 'Branch Manager', 'Operations', '["applications:view", "applications:approve", "reports:view", "branches:manage"]'::jsonb),
  ('OPS_ADMIN', 'Operations Admin', 'Operations', '["applications:view", "applications:manage", "disbursement:manage", "reports:view"]'::jsonb)
ON CONFLICT (role_code) DO NOTHING;

-- Seed Rule Store (Sample Rules - in Draft status)
INSERT INTO rule_store (rule_code, rule_name, rule_category, rule_expression, effective_from, created_by, metadata)
VALUES
  ('MIN_INCOME_HOME', 'Minimum Income for Home Loan', 'Eligibility', '{"condition": "monthlyIncome >= (requestedAmount * 0.0005)", "description": "Minimum monthly income should be at least 0.05% of requested loan amount"}'::text, '2024-01-01', gen_random_uuid(), '{"priority": 1}'::jsonb),
  ('MAX_FOIR', 'Maximum FOIR Limit', 'Eligibility', '{"condition": "(existingEmi + newEmi) / monthlyIncome <= 0.40", "description": "Total EMI should not exceed 40% of monthly income"}'::text, '2024-01-01', gen_random_uuid(), '{"priority": 2}'::jsonb),
  ('MIN_CREDIT_SCORE', 'Minimum Credit Score Requirement', 'Risk', '{"condition": "creditScore >= 650", "description": "Minimum CIBIL score of 650 required"}'::text, '2024-01-01', gen_random_uuid(), '{"priority": 1}'::jsonb),
  ('AGE_AT_MATURITY', 'Age at Maturity Check', 'Eligibility', '{"condition": "ageAtMaturity <= 70", "description": "Applicant age at loan maturity should not exceed 70 years"}'::text, '2024-01-01', gen_random_uuid(), '{"priority": 2}'::jsonb)
ON CONFLICT (rule_code) DO NOTHING;

