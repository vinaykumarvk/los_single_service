-- Add task assignment fields to verification_requests table
ALTER TABLE verification_requests
ADD COLUMN IF NOT EXISTS assigned_to TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10);

-- Create indexes for efficient queue management
CREATE INDEX IF NOT EXISTS idx_verification_assigned_to ON verification_requests(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_verification_unassigned ON verification_requests(assigned_to) WHERE assigned_to IS NULL AND status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_verification_priority ON verification_requests(priority DESC, created_at ASC) WHERE status = 'PENDING';

