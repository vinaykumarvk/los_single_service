-- Comprehensive script to populate ALL data for all applications
-- Includes: Employment, Property, Bank Details, Documents

-- Step 1: Ensure all employment data is complete
UPDATE applicants 
SET 
    employment_type = CASE 
        WHEN employment_type IS NULL THEN 
            CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 3)
                WHEN 0 THEN 'Salaried'
                WHEN 1 THEN 'SelfEmployed'
                ELSE 'Business'
            END
        ELSE employment_type
    END,
    monthly_income = CASE 
        WHEN monthly_income IS NULL THEN 30000 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 200000)
        ELSE monthly_income
    END,
    employer_name = CASE 
        WHEN employer_name IS NULL THEN 
            CASE 
                WHEN employment_type = 'Salaried' OR employment_type IS NULL THEN 
                    CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 5)
                        WHEN 0 THEN 'Tech Solutions Pvt Ltd'
                        WHEN 1 THEN 'Global Services Inc'
                        WHEN 2 THEN 'Financial Services Ltd'
                        WHEN 3 THEN 'Manufacturing Corp'
                        ELSE 'IT Services Ltd'
                    END
                ELSE 'Self Owned Business'
            END
        ELSE employer_name
    END,
    years_in_job = CASE 
        WHEN years_in_job IS NULL THEN (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10) + 1
        ELSE years_in_job
    END,
    other_income_sources = CASE 
        WHEN other_income_sources IS NULL AND (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 3) != 0
            THEN (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 50000)::NUMERIC
        ELSE other_income_sources
    END,
    updated_at = NOW()
WHERE employment_type IS NULL 
   OR monthly_income IS NULL
   OR employer_name IS NULL
   OR years_in_job IS NULL;

-- Step 2: Populate bank details for all applicants
UPDATE applicants 
SET 
    bank_account_number = CASE 
        WHEN bank_account_number IS NULL THEN 
            LPAD((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 100000000000)::TEXT, 12, '0')
        ELSE bank_account_number
    END,
    bank_ifsc = CASE 
        WHEN bank_ifsc IS NULL THEN 
            CHR(65 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 26)) ||
            CHR(65 + ((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) + 1) % 26)) ||
            '00' ||
            LPAD((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10000)::TEXT, 4, '0')
        ELSE bank_ifsc
    END,
    bank_verified = CASE 
        WHEN bank_verified IS NULL THEN 
            (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 3) = 0
        ELSE bank_verified
    END,
    bank_verified_at = CASE 
        WHEN bank_verified = true AND bank_verified_at IS NULL THEN NOW() - (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 30 || ' days')::INTERVAL
        ELSE bank_verified_at
    END,
    bank_verification_method = CASE 
        WHEN bank_verified = true AND bank_verification_method IS NULL THEN 
            CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 3)
                WHEN 0 THEN 'penny_drop'
                WHEN 1 THEN 'manual'
                ELSE 'name_match'
            END
        ELSE bank_verification_method
    END,
    updated_at = NOW()
WHERE bank_account_number IS NULL 
   OR bank_ifsc IS NULL;

-- Step 3: Populate property details for all home loans
DO $$
DECLARE
    app_record RECORD;
    counter INTEGER := 0;
    property_type_val TEXT;
    property_value_val NUMERIC;
    city_val TEXT;
    state_val TEXT;
    pincode_val TEXT;
BEGIN
    FOR app_record IN 
        SELECT app.application_id, app.requested_amount, a.city, a.state, a.pincode
        FROM applications app
        LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
        WHERE (app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%')
          AND NOT EXISTS (SELECT 1 FROM property_details WHERE application_id = app.application_id)
        ORDER BY app.created_at
    LOOP
        -- Determine property type
        property_type_val := CASE (counter % 4)
            WHEN 0 THEN 'Under Construction'
            WHEN 1 THEN 'Flat'
            WHEN 2 THEN 'House'
            ELSE 'Plot'
        END;
        
        -- Calculate property value
        property_value_val := COALESCE(app_record.requested_amount, 500000) * (1.5 + (counter % 10) * 0.1);
        
        -- Use applicant's city/state if available, otherwise default
        city_val := COALESCE(app_record.city, 'Mumbai');
        state_val := COALESCE(app_record.state, 'Maharashtra');
        pincode_val := COALESCE(app_record.pincode, '400001');
        
        INSERT INTO property_details (
            property_id, application_id, property_type, property_value,
            builder_name, project_name, property_address, property_city,
            property_state, property_pincode, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(),
            app_record.application_id,
            property_type_val,
            property_value_val,
            CASE 
                WHEN property_type_val != 'Plot' THEN 'Premium Builders Ltd'
                ELSE NULL
            END,
            CASE 
                WHEN property_type_val != 'Plot' THEN 'Green Valley Apartments'
                ELSE NULL
            END,
            'Property Address, ' || city_val,
            city_val,
            state_val,
            pincode_val,
            NOW(),
            NOW()
        );
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Populated property details for % home loan applications', counter;
END $$;

-- Step 4: Populate documents for all applications
-- Create a sample document file reference (in production, this would be actual file storage)
DO $$
DECLARE
    app_record RECORD;
    doc_types TEXT[] := ARRAY[
        'PAN_CARD', 'AADHAAR_CARD', 'SALARY_SLIP', 'ITR', 'FORM_16',
        'BANK_STATEMENT', 'ADDRESS_PROOF', 'PHOTO', 'SIGNATURE'
    ];
    doc_type TEXT;
    doc_counter INTEGER := 0;
BEGIN
    FOR app_record IN 
        SELECT application_id, product_code
        FROM applications
        ORDER BY created_at
    LOOP
        -- Add 3-5 documents per application
        FOR i IN 1..(3 + (doc_counter % 3)) LOOP
            doc_type := doc_types[1 + (doc_counter % array_length(doc_types, 1))];
            
            -- Check if document already exists (using doc_type)
            IF NOT EXISTS (
                SELECT 1 FROM documents d
                WHERE d.application_id = app_record.application_id 
                  AND d.doc_type = doc_type
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
                    102400 + (doc_counter * 1000) % 500000, -- 100KB to 600KB
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
    
    RAISE NOTICE 'Populated documents for applications. Total documents: %', doc_counter;
END $$;

-- Step 5: Verification
SELECT 
    'Employment Data' as data_type,
    COUNT(*) FILTER (WHERE a.employment_type IS NOT NULL AND a.monthly_income IS NOT NULL) as with_data,
    COUNT(*) FILTER (WHERE a.employment_type IS NULL OR a.monthly_income IS NULL) as missing_data
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Property Data',
    COUNT(*) FILTER (WHERE pd.property_id IS NOT NULL),
    COUNT(*) FILTER (WHERE pd.property_id IS NULL AND (app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%'))
FROM applications app
LEFT JOIN property_details pd ON pd.application_id = app.application_id
WHERE app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%'
UNION ALL
SELECT 
    'Bank Details',
    COUNT(*) FILTER (WHERE a.bank_account_number IS NOT NULL AND a.bank_ifsc IS NOT NULL),
    COUNT(*) FILTER (WHERE a.bank_account_number IS NULL OR a.bank_ifsc IS NULL)
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Documents',
    COUNT(DISTINCT d.application_id),
    COUNT(*) - COUNT(DISTINCT d.application_id)
FROM applications app
LEFT JOIN documents d ON d.application_id = app.application_id;

