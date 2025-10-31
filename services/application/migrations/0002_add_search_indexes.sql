-- Add indexes for search and filtering

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_channel ON applications(channel);
CREATE INDEX IF NOT EXISTS idx_applications_product_code ON applications(product_code);
CREATE INDEX IF NOT EXISTS idx_applications_applicant_id ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_updated_at ON applications(updated_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON applications(status, created_at DESC);

