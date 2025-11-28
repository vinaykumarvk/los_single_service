-- Create business calendar table for holidays
CREATE TABLE IF NOT EXISTS business_calendar (
  holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  holiday_name TEXT NOT NULL,
  holiday_type TEXT CHECK (holiday_type IN ('NATIONAL', 'STATE', 'REGIONAL', 'BANK')),
  applicable_states TEXT[], -- NULL means all states
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_date ON business_calendar(holiday_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_holiday_type ON business_calendar(holiday_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_holiday_states ON business_calendar USING GIN(applicable_states) WHERE applicable_states IS NOT NULL;

