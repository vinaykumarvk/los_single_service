-- Application history/activity timeline table
CREATE TABLE IF NOT EXISTS application_history (
  history_id UUID PRIMARY KEY,
  application_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL, -- 'application', 'kyc', 'document', 'underwriting', 'sanction', 'payment', 'disbursement', 'audit'
  event_data JSONB NOT NULL, -- Full event payload
  actor_id TEXT, -- User who triggered the event
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_application ON application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_history_occurred_at ON application_history(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON application_history(event_type);
CREATE INDEX IF NOT EXISTS idx_history_event_source ON application_history(event_source);


