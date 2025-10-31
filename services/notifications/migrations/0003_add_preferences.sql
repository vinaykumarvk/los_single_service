-- Create notification_preferences table for user notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Keycloak user ID or applicant_id
  recipient TEXT NOT NULL, -- email/mobile for quick lookup
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb, -- { email: { enabled: true, types: [...] }, sms: { enabled: true, types: [...] }, push: { enabled: false } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipient)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_recipient ON notification_preferences(recipient);

