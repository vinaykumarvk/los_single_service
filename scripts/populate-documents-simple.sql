-- Simple script to populate documents for all applications
-- Using same file references for all document types

DO $$
DECLARE
    app_record RECORD;
    doc_types TEXT[] := ARRAY['PAN', 'AADHAAR', 'SALARY_SLIP', 'ITR', 'FORM_16', 'BANK_STATEMENT', 'ADDRESS_PROOF', 'PROPERTY_DOCS'];
    current_doc_type TEXT;
    doc_counter INTEGER := 0;
BEGIN
    FOR app_record IN 
        SELECT application_id, product_code
        FROM applications
        ORDER BY created_at
    LOOP
        -- Add 3-5 documents per application
        FOR i IN 1..(3 + (doc_counter % 3)) LOOP
            current_doc_type := doc_types[1 + (doc_counter % array_length(doc_types, 1))];
            
            -- Check if document already exists
            IF NOT EXISTS (
                SELECT 1 FROM documents d
                WHERE d.application_id = app_record.application_id 
                  AND d.doc_type = current_doc_type
            ) THEN
                INSERT INTO documents (
                    doc_id, application_id, doc_type,
                    file_name, file_type, size_bytes, status, object_key,
                    created_at
                )
                VALUES (
                    gen_random_uuid(),
                    app_record.application_id,
                    current_doc_type,
                    'sample_' || current_doc_type || '_' || app_record.application_id || '.pdf',
                    'application/pdf',
                    102400 + (doc_counter * 1000) % 500000,
                    CASE (doc_counter % 3)
                        WHEN 0 THEN 'Verified'
                        WHEN 1 THEN 'Pending'
                        ELSE 'Rejected'
                    END,
                    'documents/' || app_record.application_id || '/' || current_doc_type || '.pdf',
                    NOW() - (doc_counter || ' days')::INTERVAL
                );
                
                doc_counter := doc_counter + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Populated % documents for applications', doc_counter;
END $$;

-- Verify
SELECT 
    'Total Documents' as metric,
    COUNT(*)::TEXT as value
FROM documents
UNION ALL
SELECT 
    'Applications with Documents',
    COUNT(DISTINCT application_id)::TEXT
FROM documents
UNION ALL
SELECT 
    'Applications without Documents',
    (COUNT(*) - COUNT(DISTINCT d.application_id))::TEXT
FROM applications app
LEFT JOIN documents d ON d.application_id = app.application_id;

