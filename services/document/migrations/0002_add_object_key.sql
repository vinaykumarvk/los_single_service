ALTER TABLE documents ADD COLUMN IF NOT EXISTS object_key TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_app ON documents (application_id);

