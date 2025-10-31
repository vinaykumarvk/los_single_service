-- Add withdrawal fields to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add index for assigned_to for efficient queries
CREATE INDEX IF NOT EXISTS idx_applications_assigned_to ON applications(assigned_to) WHERE assigned_to IS NOT NULL;

