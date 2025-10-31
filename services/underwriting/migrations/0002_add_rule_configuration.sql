-- Create rule_configurations table for dynamic rule management
CREATE TABLE IF NOT EXISTS rule_configurations (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE, -- e.g., 'FOIR_MAX', 'LTV_MAX', 'MIN_CREDIT_SCORE'
  rule_type TEXT NOT NULL CHECK (rule_type IN ('THRESHOLD', 'RANGE', 'BOOLEAN', 'CUSTOM')),
  rule_expression TEXT NOT NULL, -- JSON or expression string
  applies_to_product_code TEXT, -- NULL = applies to all products
  applies_to_channel TEXT, -- NULL = applies to all channels
  priority INT NOT NULL DEFAULT 0, -- Higher priority = evaluated first
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB -- Additional rule metadata
);

-- Create indexes for efficient rule lookup
CREATE INDEX IF NOT EXISTS idx_rules_product ON rule_configurations(applies_to_product_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rules_channel ON rule_configurations(applies_to_channel) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rules_active ON rule_configurations(is_active, priority DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rules_effective ON rule_configurations(effective_from, effective_until) WHERE is_active = true;

-- Create rule_evaluation_history table for tracking rule evaluations
CREATE TABLE IF NOT EXISTS rule_evaluation_history (
  evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  rule_id UUID NOT NULL REFERENCES rule_configurations(rule_id),
  rule_name TEXT NOT NULL,
  rule_result BOOLEAN NOT NULL, -- true = passed, false = failed
  evaluated_value NUMERIC,
  threshold_value NUMERIC,
  evaluation_details JSONB, -- Full evaluation context
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_history_application ON rule_evaluation_history(application_id);
CREATE INDEX IF NOT EXISTS idx_eval_history_rule ON rule_evaluation_history(rule_id);
CREATE INDEX IF NOT EXISTS idx_eval_history_result ON rule_evaluation_history(rule_result);

