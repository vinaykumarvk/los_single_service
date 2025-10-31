-- Create application_notes table for storing internal notes/comments
CREATE TABLE IF NOT EXISTS application_notes (
  note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(application_id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL, -- User ID or system
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_application_notes_application ON application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_application_notes_created_at ON application_notes(created_at DESC);

