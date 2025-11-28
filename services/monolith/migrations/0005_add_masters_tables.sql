-- Rates matrices table
CREATE TABLE IF NOT EXISTS rate_matrices (
  rate_matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT NOT NULL,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('Fixed', 'Floating', 'Hybrid')),
  interest_rate NUMERIC(5,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_until DATE,
  min_amount NUMERIC(15,2),
  max_amount NUMERIC(15,2),
  min_tenure_months INT,
  max_tenure_months INT,
  applicable_channels TEXT[],
  applicable_states TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_code, rate_type, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_rate_matrices_product ON rate_matrices(product_code);
CREATE INDEX IF NOT EXISTS idx_rate_matrices_effective ON rate_matrices(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_rate_matrices_active ON rate_matrices(is_active);

-- Charges/fees configuration table
CREATE TABLE IF NOT EXISTS charges (
  charge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_code TEXT UNIQUE NOT NULL,
  charge_name TEXT NOT NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('ProcessingFee', 'DocumentationFee', 'LegalFee', 'StampDuty', 'Other')),
  calculation_method TEXT NOT NULL CHECK (calculation_method IN ('Fixed', 'Percentage', 'Tiered')),
  fixed_amount NUMERIC(15,2),
  percentage_rate NUMERIC(5,2),
  min_charge NUMERIC(15,2),
  max_charge NUMERIC(15,2),
  applicable_to_products TEXT[],
  applicable_channels TEXT[],
  applicable_states TEXT[],
  effective_from DATE NOT NULL,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_charges_code ON charges(charge_code);
CREATE INDEX IF NOT EXISTS idx_charges_type ON charges(charge_type);
CREATE INDEX IF NOT EXISTS idx_charges_active ON charges(is_active);

-- Document master table (extends document_checklist)
CREATE TABLE IF NOT EXISTS document_master (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code TEXT UNIQUE NOT NULL,
  document_name TEXT NOT NULL,
  document_category TEXT NOT NULL CHECK (document_category IN ('Identity', 'Address', 'Income', 'Property', 'Other')),
  is_mandatory BOOLEAN DEFAULT false,
  validity_period_days INT,
  applicable_products TEXT[],
  applicable_channels TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_master_code ON document_master(document_code);
CREATE INDEX IF NOT EXISTS idx_document_master_category ON document_master(document_category);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  branch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_code TEXT UNIQUE NOT NULL,
  branch_name TEXT NOT NULL,
  branch_type TEXT NOT NULL CHECK (branch_type IN ('HeadOffice', 'RegionalOffice', 'Branch', 'CampOffice')),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT,
  contact_mobile TEXT,
  contact_email TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(branch_code);
CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city, state);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);

-- Roles master table
CREATE TABLE IF NOT EXISTS roles_master (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code TEXT UNIQUE NOT NULL,
  role_name TEXT NOT NULL,
  role_category TEXT NOT NULL CHECK (role_category IN ('Sales', 'Operations', 'Risk', 'Underwriting', 'Verification', 'Admin')),
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roles_master_code ON roles_master(role_code);
CREATE INDEX IF NOT EXISTS idx_roles_master_category ON roles_master(role_category);

-- Rule store with maker-checker
CREATE TABLE IF NOT EXISTS rule_store (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT UNIQUE NOT NULL,
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL CHECK (rule_category IN ('Underwriting', 'Risk', 'Pricing', 'Eligibility', 'Documentation', 'Other')),
  rule_expression TEXT NOT NULL, -- JSON or SQL-like expression
  rule_version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  effective_from DATE,
  effective_until DATE,
  approval_status TEXT DEFAULT 'Draft' CHECK (approval_status IN ('Draft', 'PendingApproval', 'Approved', 'Rejected', 'Suspended')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rule_store_code ON rule_store(rule_code);
CREATE INDEX IF NOT EXISTS idx_rule_store_status ON rule_store(approval_status);
CREATE INDEX IF NOT EXISTS idx_rule_store_active ON rule_store(is_active);
CREATE INDEX IF NOT EXISTS idx_rule_store_category ON rule_store(rule_category);

-- Rule history for audit trail
CREATE TABLE IF NOT EXISTS rule_store_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES rule_store(rule_id),
  rule_version INT NOT NULL,
  rule_expression TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('Created', 'Updated', 'Submitted', 'Approved', 'Rejected', 'Suspended', 'Activated', 'Deactivated')),
  action_by UUID,
  action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_rule_history_rule ON rule_store_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_history_action_at ON rule_store_history(action_at);

