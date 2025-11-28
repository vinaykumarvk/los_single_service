-- Create property_details table for loan applications

CREATE TABLE IF NOT EXISTS property_details (
  property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  property_type TEXT NOT NULL CHECK (property_type IN ('Flat', 'Plot', 'House', 'Under Construction')),
  builder_name TEXT,
  project_name TEXT,
  property_value NUMERIC(15,2),
  property_address TEXT,
  property_pincode TEXT,
  property_city TEXT,
  property_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

CREATE INDEX IF NOT EXISTS idx_property_details_application_id ON property_details(application_id);
CREATE INDEX IF NOT EXISTS idx_property_details_property_type ON property_details(property_type);

