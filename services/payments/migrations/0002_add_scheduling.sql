-- Add scheduling fields to fee_payments table
ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_frequency TEXT CHECK (recurring_frequency IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- Create index for scheduled payments
CREATE INDEX IF NOT EXISTS idx_payments_scheduled_at ON fee_payments(scheduled_at) WHERE scheduled_at IS NOT NULL AND status = 'SCHEDULED';
CREATE INDEX IF NOT EXISTS idx_payments_next_date ON fee_payments(next_payment_date) WHERE is_recurring = true;

