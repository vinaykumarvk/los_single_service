-- Add metadata and status tracking to saga_instances
ALTER TABLE saga_instances
ADD COLUMN IF NOT EXISTS saga_type TEXT DEFAULT 'APPLICATION_LIFECYCLE',
ADD COLUMN IF NOT EXISTS current_step TEXT,
ADD COLUMN IF NOT EXISTS step_status TEXT CHECK (step_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'COMPENSATED')),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_saga_state ON saga_instances(state);
CREATE INDEX IF NOT EXISTS idx_saga_step_status ON saga_instances(step_status);
CREATE INDEX IF NOT EXISTS idx_saga_application ON saga_instances(application_id);
CREATE INDEX IF NOT EXISTS idx_saga_logs_saga ON saga_logs(saga_id, created_at);

-- Add step status and duration to saga_logs
ALTER TABLE saga_logs
ADD COLUMN IF NOT EXISTS step_status TEXT CHECK (step_status IN ('STARTED', 'COMPLETED', 'FAILED', 'COMPENSATED')),
ADD COLUMN IF NOT EXISTS duration_ms INT,
ADD COLUMN IF NOT EXISTS error_message TEXT;

