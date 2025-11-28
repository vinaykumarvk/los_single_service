-- Add reporting hierarchy support
-- This allows dynamic organizational structure: RMs → SRMs → Regional Head

-- Add reports_to column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS designation TEXT;

-- Create index for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation);

-- Create hierarchy view for easy queries (recursive CTE support)
-- This will be used by aggregation endpoints to compute hierarchies dynamically
COMMENT ON COLUMN users.reports_to IS 'User ID of the manager this user reports to (for hierarchy)';
COMMENT ON COLUMN users.employee_id IS 'Unique employee identifier';
COMMENT ON COLUMN users.designation IS 'Job title/designation (RM, SRM, Regional Head, etc.)';

