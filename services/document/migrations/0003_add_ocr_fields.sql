-- Add OCR and metadata extraction fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS extracted_data JSONB,
ADD COLUMN IF NOT EXISTS ocr_provider TEXT,
ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES documents(doc_id);

-- Create index for efficient version queries
CREATE INDEX IF NOT EXISTS idx_documents_previous_version ON documents(previous_version_id) WHERE previous_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(application_id, doc_type, version);

