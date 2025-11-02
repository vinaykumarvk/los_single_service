-- Leads/Sourcing service migrations

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_channel TEXT NOT NULL CHECK (source_channel IN ('Website', 'MobileApp', 'Branch', 'DSA', 'CallCenter', 'Campaign', 'Referral', 'Other')),
  source_reference TEXT,
  first_name TEXT,
  last_name TEXT,
  mobile TEXT NOT NULL,
  email TEXT,
  pan TEXT,
  requested_product_code TEXT,
  requested_amount NUMERIC(15,2),
  lead_status TEXT DEFAULT 'New' CHECK (lead_status IN ('New', 'Contacted', 'Qualified', 'Converted', 'Rejected', 'Lost')),
  assigned_agent_id UUID,
  agency_id UUID,
  conversion_application_id UUID,
  conversion_date TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(source_channel);
CREATE INDEX IF NOT EXISTS idx_leads_mobile ON leads(mobile);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);

-- Agencies table
CREATE TABLE IF NOT EXISTS agencies (
  agency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_code TEXT UNIQUE NOT NULL,
  agency_name TEXT NOT NULL,
  contact_person TEXT,
  contact_mobile TEXT,
  contact_email TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_active BOOLEAN DEFAULT true,
  validation_status TEXT DEFAULT 'Pending' CHECK (validation_status IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  commission_rate NUMERIC(5,2) DEFAULT 0.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agencies_code ON agencies(agency_code);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON agencies(validation_status);
CREATE INDEX IF NOT EXISTS idx_agencies_active ON agencies(is_active);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code TEXT UNIQUE NOT NULL,
  agency_id UUID REFERENCES agencies(agency_id),
  first_name TEXT NOT NULL,
  last_name TEXT,
  mobile TEXT NOT NULL,
  email TEXT,
  pan TEXT,
  aadhaar TEXT,
  is_active BOOLEAN DEFAULT true,
  validation_status TEXT DEFAULT 'Pending' CHECK (validation_status IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_code ON agents(agent_code);
CREATE INDEX IF NOT EXISTS idx_agents_agency ON agents(agency_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(validation_status);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);

