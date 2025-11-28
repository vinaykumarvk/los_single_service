-- Add geographic restrictions to products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS allowed_states TEXT[],
ADD COLUMN IF NOT EXISTS allowed_cities TEXT[],
ADD COLUMN IF NOT EXISTS restricted_states TEXT[],
ADD COLUMN IF NOT EXISTS restricted_cities TEXT[];

-- Create indexes for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_products_allowed_states ON products USING GIN(allowed_states) WHERE allowed_states IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_restricted_states ON products USING GIN(restricted_states) WHERE restricted_states IS NOT NULL;

