-- Create notification_templates table for storing templates
CREATE TABLE IF NOT EXISTS notification_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  template_type TEXT NOT NULL CHECK (template_type IN ('email', 'sms', 'push')),
  subject_template TEXT, -- For email only
  body_template TEXT NOT NULL,
  variables JSONB, -- Expected variables with descriptions
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_templates_name ON notification_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(template_type);

