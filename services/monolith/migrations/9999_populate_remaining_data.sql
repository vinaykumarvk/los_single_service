-- Populate remaining demo data (Documents, History, Notes, KYC)
-- This is a simpler direct approach

-- Documents
INSERT INTO documents (doc_id, application_id, doc_type, file_name, file_type, size_bytes, status, object_key, version, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  a.application_id,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 7
    WHEN 0 THEN 'PAN_CARD'
    WHEN 1 THEN 'AADHAAR'
    WHEN 2 THEN 'SALARY_SLIP'
    WHEN 3 THEN 'BANK_STATEMENT'
    WHEN 4 THEN 'ITR'
    WHEN 5 THEN 'PROPERTY_DOCS'
    ELSE 'FORM_16'
  END,
  'document_' || a.application_id || '_' || (ROW_NUMBER() OVER (PARTITION BY a.application_id))::TEXT || '.pdf',
  'application/pdf',
  (500000 + (RANDOM() * 2000000))::BIGINT,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 3
    WHEN 0 THEN 'Uploaded'
    WHEN 1 THEN 'Verified'
    ELSE 'Pending'
  END,
  'docs/' || a.application_id || '/' || gen_random_uuid() || '.pdf',
  1,
  a.created_at - (RANDOM() * INTERVAL '30 days'),
  a.created_at - (RANDOM() * INTERVAL '25 days')
FROM applications a
WHERE a.status NOT IN ('Draft', 'Withdrawn')
LIMIT 500;

-- Application History
INSERT INTO application_history (history_id, application_id, event_type, event_source, event_data, actor_id, occurred_at, created_at)
SELECT
  gen_random_uuid(),
  a.application_id,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 9
    WHEN 0 THEN 'ApplicationCreated'
    WHEN 1 THEN 'StatusChanged'
    WHEN 2 THEN 'DocumentUploaded'
    WHEN 3 THEN 'AssignedToRM'
    WHEN 4 THEN 'UnderReview'
    WHEN 5 THEN 'VerificationPending'
    WHEN 6 THEN 'Approved'
    WHEN 7 THEN 'Sanctioned'
    ELSE 'Disbursed'
  END,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 3
    WHEN 0 THEN 'System'
    WHEN 1 THEN 'RM'
    ELSE 'Operations'
  END,
  jsonb_build_object('status', a.status, 'note', 'Event for ' || a.application_id),
  a.assigned_to,
  a.created_at + ((ROW_NUMBER() OVER (PARTITION BY a.application_id)) * INTERVAL '1 day'),
  a.created_at + ((ROW_NUMBER() OVER (PARTITION BY a.application_id)) * INTERVAL '1 day')
FROM applications a
WHERE a.status NOT IN ('Draft')
LIMIT 400;

-- Application Notes
INSERT INTO application_notes (note_id, application_id, note_text, created_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  a.application_id,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 3
    WHEN 0 THEN 'Initial review completed. Documents verified.'
    WHEN 1 THEN 'Credit check passed. Income verified.'
    ELSE 'Property valuation completed. Ready for sanction.'
  END,
  COALESCE(a.assigned_to::TEXT, 'system'),
  a.created_at - (RANDOM() * INTERVAL '20 days'),
  a.created_at - (RANDOM() * INTERVAL '15 days')
FROM applications a
WHERE a.status NOT IN ('Draft')
LIMIT 200;

-- KYC Sessions (using applications - application_id is required, but it's TEXT in applications, UUID in kyc_sessions)
-- So we'll create sessions linked to applicant_id only (if schema allows) or skip application_id
INSERT INTO kyc_sessions (session_id, application_id, applicant_id, status, provider, started_at, completed_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  gen_random_uuid(), -- Generate UUID for application_id since applications uses TEXT
  a.applicant_id,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 4
    WHEN 0 THEN 'SCHEDULED'
    WHEN 1 THEN 'IN_PROGRESS'
    WHEN 2 THEN 'COMPLETED'
    ELSE 'FAILED'
  END,
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 4
    WHEN 0 THEN 'VIDEO_KYC'
    WHEN 1 THEN 'IN_PERSON'
    WHEN 2 THEN 'AADHAAR_OTP'
    ELSE 'DIGITAL'
  END,
  a.created_at - (RANDOM() * INTERVAL '10 days'),
  CASE (ROW_NUMBER() OVER (PARTITION BY a.application_id)) % 2
    WHEN 0 THEN a.created_at - (RANDOM() * INTERVAL '5 days')
    ELSE NULL
  END,
  a.created_at - (RANDOM() * INTERVAL '15 days'),
  a.created_at - (RANDOM() * INTERVAL '10 days')
FROM applications a
WHERE a.status NOT IN ('Draft', 'Withdrawn')
LIMIT 80;

