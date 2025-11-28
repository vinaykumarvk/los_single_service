-- Create blacklist/whitelist tables
CREATE TABLE IF NOT EXISTS blacklist (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PAN', 'AADHAAR', 'MOBILE', 'EMAIL', 'ACCOUNT')),
  entity_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  source TEXT, -- Source of blacklist entry (e.g., 'FRAUD_DB', 'BUREAU', 'INTERNAL')
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ -- NULL means permanent
);

CREATE TABLE IF NOT EXISTS whitelist (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('PAN', 'AADHAAR', 'MOBILE', 'EMAIL', 'ACCOUNT')),
  entity_value TEXT NOT NULL,
  reason TEXT,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_blacklist_entity ON blacklist(entity_type, entity_value) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_whitelist_entity ON whitelist(entity_type, entity_value) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_blacklist_expires ON blacklist(expires_at) WHERE expires_at IS NOT NULL;

