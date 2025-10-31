-- Add reconciliation fields to fee_payments table
ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reconciliation_status TEXT CHECK (reconciliation_status IN ('PENDING', 'RECONCILED', 'DISCREPANCY', 'FAILED')),
ADD COLUMN IF NOT EXISTS gateway_amount NUMERIC,
ADD COLUMN IF NOT EXISTS gateway_status TEXT,
ADD COLUMN IF NOT EXISTS gateway_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;

-- Create index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_payments_reconciliation_status ON fee_payments(reconciliation_status) WHERE reconciliation_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_gateway_transaction ON fee_payments(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;

