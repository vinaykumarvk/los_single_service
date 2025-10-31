-- Add scheduling field to disbursements table
ALTER TABLE disbursements
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Create index for scheduled disbursements
CREATE INDEX IF NOT EXISTS idx_disbursements_scheduled_at ON disbursements(scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'SCHEDULED';

