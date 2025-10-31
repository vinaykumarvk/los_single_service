-- Add valid_till field to sanctions table for offer expiry
ALTER TABLE sanctions 
ADD COLUMN IF NOT EXISTS valid_till TIMESTAMPTZ;

-- Create index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_sanctions_valid_till ON sanctions(valid_till) WHERE status = 'ISSUED';

