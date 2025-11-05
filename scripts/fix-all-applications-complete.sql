-- Comprehensive script to fix ALL applications with complete data
-- This ensures every application has full personal, employment, and property data

DO $$
DECLARE
    app_record RECORD;
    applicant_id_val UUID;
    app_id TEXT;
    first_name_val TEXT;
    last_name_val TEXT;
    mobile_val TEXT;
    email_val TEXT;
    pan_val TEXT;
    city_val TEXT;
    state_val TEXT;
    pincode_val TEXT;
    employment_type_val TEXT;
    monthly_income_val NUMERIC;
    employer_name_val TEXT;
    years_in_job_val NUMERIC;
    property_type_val TEXT;
    property_value_val NUMERIC;
    counter INTEGER := 0;
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all applications
    FOR app_record IN 
        SELECT application_id, applicant_id, product_code, status, requested_amount
        FROM applications 
        ORDER BY created_at
    LOOP
        app_id := app_record.application_id;
        applicant_id_val := app_record.applicant_id;
        
        -- Check current applicant data
        SELECT first_name, last_name, mobile, email, pan, city, state, pincode,
               employment_type, monthly_income, employer_name, years_in_job
        INTO first_name_val, last_name_val, mobile_val, email_val, pan_val, 
             city_val, state_val, pincode_val, employment_type_val, monthly_income_val,
             employer_name_val, years_in_job_val
        FROM applicants 
        WHERE applicant_id = applicant_id_val;
        
        -- Determine if we need to update
        DECLARE
            needs_update BOOLEAN := FALSE;
        BEGIN
            -- Check if data is missing, "New", or encrypted
            IF NOT FOUND 
               OR first_name_val IS NULL 
               OR first_name_val = '' 
               OR first_name_val = 'New'
               OR mobile_val IS NULL 
               OR mobile_val = ''
               OR LENGTH(mobile_val) > 20
               OR employment_type_val IS NULL
               OR monthly_income_val IS NULL
               OR employer_name_val IS NULL
               OR years_in_job_val IS NULL THEN
                needs_update := TRUE;
            END IF;
            
            -- If update needed, generate/populate all data
            IF needs_update THEN
                -- Generate realistic names
                first_name_val := CASE 
                    WHEN (counter % 10) = 0 THEN 'Rajesh'
                    WHEN (counter % 10) = 1 THEN 'Priya'
                    WHEN (counter % 10) = 2 THEN 'Amit'
                    WHEN (counter % 10) = 3 THEN 'Sneha'
                    WHEN (counter % 10) = 4 THEN 'Vikram'
                    WHEN (counter % 10) = 5 THEN 'Anjali'
                    WHEN (counter % 10) = 6 THEN 'Rahul'
                    WHEN (counter % 10) = 7 THEN 'Kavita'
                    WHEN (counter % 10) = 8 THEN 'Nikhil'
                    ELSE 'Divya'
                END;
                
                last_name_val := CASE 
                    WHEN (counter % 8) = 0 THEN 'Kumar'
                    WHEN (counter % 8) = 1 THEN 'Sharma'
                    WHEN (counter % 8) = 2 THEN 'Patel'
                    WHEN (counter % 8) = 3 THEN 'Singh'
                    WHEN (counter % 8) = 4 THEN 'Reddy'
                    WHEN (counter % 8) = 5 THEN 'Agarwal'
                    WHEN (counter % 8) = 6 THEN 'Gupta'
                    ELSE 'Verma'
                END;
                
                -- Generate mobile number (10 digits starting with 9)
                mobile_val := '9' || LPAD((9000000000 + (counter * 12345) % 100000000)::TEXT, 9, '0');
                
                -- Generate email
                email_val := LOWER(first_name_val || '.' || last_name_val || counter || '@example.com');
                
                -- Generate PAN (format: ABCDE1234F)
                pan_val := CHR(65 + (counter % 26)) || 
                          CHR(65 + ((counter + 1) % 26)) || 
                          CHR(65 + ((counter + 2) % 26)) || 
                          CHR(65 + ((counter + 3) % 26)) || 
                          CHR(65 + ((counter + 4) % 26)) ||
                          LPAD(((counter * 1000 + 1234) % 10000)::TEXT, 4, '0') ||
                          CHR(65 + ((counter + 5) % 26));
                
                -- Set city and state
                city_val := CASE 
                    WHEN (counter % 10) = 0 THEN 'Mumbai'
                    WHEN (counter % 10) = 1 THEN 'Delhi'
                    WHEN (counter % 10) = 2 THEN 'Bangalore'
                    WHEN (counter % 10) = 3 THEN 'Hyderabad'
                    WHEN (counter % 10) = 4 THEN 'Chennai'
                    WHEN (counter % 10) = 5 THEN 'Kolkata'
                    WHEN (counter % 10) = 6 THEN 'Pune'
                    WHEN (counter % 10) = 7 THEN 'Ahmedabad'
                    WHEN (counter % 10) = 8 THEN 'Jaipur'
                    ELSE 'Surat'
                END;
                
                state_val := CASE 
                    WHEN city_val = 'Mumbai' THEN 'Maharashtra'
                    WHEN city_val = 'Delhi' THEN 'Delhi'
                    WHEN city_val = 'Bangalore' THEN 'Karnataka'
                    WHEN city_val = 'Hyderabad' THEN 'Telangana'
                    WHEN city_val = 'Chennai' THEN 'Tamil Nadu'
                    WHEN city_val = 'Kolkata' THEN 'West Bengal'
                    WHEN city_val = 'Pune' THEN 'Maharashtra'
                    WHEN city_val = 'Ahmedabad' THEN 'Gujarat'
                    WHEN city_val = 'Jaipur' THEN 'Rajasthan'
                    ELSE 'Gujarat'
                END;
                
                pincode_val := CASE 
                    WHEN city_val = 'Mumbai' THEN '400001'
                    WHEN city_val = 'Delhi' THEN '110001'
                    WHEN city_val = 'Bangalore' THEN '560001'
                    WHEN city_val = 'Hyderabad' THEN '500001'
                    WHEN city_val = 'Chennai' THEN '600001'
                    WHEN city_val = 'Kolkata' THEN '700001'
                    WHEN city_val = 'Pune' THEN '411001'
                    WHEN city_val = 'Ahmedabad' THEN '380001'
                    WHEN city_val = 'Jaipur' THEN '302001'
                    ELSE '395001'
                END;
                
                -- Set employment data
                employment_type_val := CASE (counter % 3)
                    WHEN 0 THEN 'Salaried'
                    WHEN 1 THEN 'SelfEmployed'
                    ELSE 'Business'
                END;
                monthly_income_val := 30000 + (counter * 5000) % 200000;
                employer_name_val := CASE 
                    WHEN employment_type_val = 'Salaried' THEN 
                        CASE (counter % 5)
                            WHEN 0 THEN 'Tech Solutions Pvt Ltd'
                            WHEN 1 THEN 'Global Services Inc'
                            WHEN 2 THEN 'Financial Services Ltd'
                            WHEN 3 THEN 'Manufacturing Corp'
                            ELSE 'IT Services Ltd'
                        END
                    ELSE 'Self Owned Business'
                END;
                years_in_job_val := (counter % 10) + 1;
                
                -- Upsert applicant with all data
                INSERT INTO applicants (
                    applicant_id, first_name, last_name, mobile, email, pan,
                    city, state, pincode, country,
                    employment_type, monthly_income, employer_name, years_in_job,
                    gender, marital_status, date_of_birth, address_line1,
                    created_at, updated_at
                )
                VALUES (
                    applicant_id_val,
                    first_name_val,
                    last_name_val,
                    mobile_val,
                    email_val,
                    pan_val,
                    city_val,
                    state_val,
                    pincode_val,
                    'India',
                    employment_type_val,
                    monthly_income_val,
                    employer_name_val,
                    years_in_job_val,
                    CASE WHEN (counter % 2) = 0 THEN 'Male' ELSE 'Female' END,
                    CASE WHEN (counter % 3) = 0 THEN 'Single' ELSE 'Married' END,
                    (CURRENT_DATE - INTERVAL '30 years') - (counter || ' days')::INTERVAL,
                    'Address Line 1, ' || city_val,
                    COALESCE((SELECT created_at FROM applicants WHERE applicant_id = applicant_id_val), NOW()),
                    NOW()
                )
                ON CONFLICT (applicant_id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    mobile = EXCLUDED.mobile,
                    email = EXCLUDED.email,
                    pan = EXCLUDED.pan,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    pincode = EXCLUDED.pincode,
                    employment_type = EXCLUDED.employment_type,
                    monthly_income = EXCLUDED.monthly_income,
                    employer_name = EXCLUDED.employer_name,
                    years_in_job = EXCLUDED.years_in_job,
                    gender = COALESCE(EXCLUDED.gender, applicants.gender),
                    marital_status = COALESCE(EXCLUDED.marital_status, applicants.marital_status),
                    date_of_birth = COALESCE(EXCLUDED.date_of_birth, applicants.date_of_birth),
                    address_line1 = COALESCE(EXCLUDED.address_line1, applicants.address_line1),
                    updated_at = NOW();
                
                updated_count := updated_count + 1;
            ELSE
                -- Even if data exists, ensure employment fields are populated
                IF employment_type_val IS NULL OR monthly_income_val IS NULL OR employer_name_val IS NULL OR years_in_job_val IS NULL THEN
                    UPDATE applicants SET
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
                                    WHEN employment_type = 'Salaried' OR employment_type IS NULL THEN 'Tech Solutions Pvt Ltd'
                                    ELSE 'Self Owned Business'
                                END
                            ELSE employer_name
                        END,
                        years_in_job = CASE 
                            WHEN years_in_job IS NULL THEN (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10) + 1
                            ELSE years_in_job
                        END,
                        updated_at = NOW()
                    WHERE applicant_id = applicant_id_val;
                    
                    updated_count := updated_count + 1;
                END IF;
            END IF;
        END;
        
        -- Populate property data for home loans
        IF app_record.product_code LIKE '%HOME%' OR app_record.product_code LIKE '%HL%' THEN
            IF NOT EXISTS (SELECT 1 FROM property_details WHERE application_id = app_id) THEN
                property_type_val := CASE (counter % 4)
                    WHEN 0 THEN 'Under Construction'
                    WHEN 1 THEN 'Flat'
                    WHEN 2 THEN 'House'
                    ELSE 'Plot'
                END;
                
                property_value_val := COALESCE(app_record.requested_amount, 500000) * (1.5 + (counter % 10) * 0.1);
                
                INSERT INTO property_details (
                    property_id, application_id, property_type, property_value,
                    builder_name, project_name, property_address, property_city,
                    property_state, property_pincode, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid(),
                    app_id,
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
                    'Property Address, ' || COALESCE(city_val, 'Mumbai'),
                    COALESCE(city_val, 'Mumbai'),
                    COALESCE(state_val, 'Maharashtra'),
                    COALESCE(pincode_val, '400001'),
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Completed fixing data for % applications. Updated % applicants.', counter, updated_count;
END $$;

-- Final verification
SELECT 
    'Total Applications' as metric,
    COUNT(*)::TEXT as value
FROM applications
UNION ALL
SELECT 
    'With Complete Personal Info',
    COUNT(*)::TEXT
FROM applications app
INNER JOIN applicants a ON a.applicant_id = app.applicant_id
WHERE a.first_name IS NOT NULL 
  AND a.first_name != '' 
  AND a.first_name != 'New'
  AND a.mobile IS NOT NULL 
  AND a.mobile != ''
  AND LENGTH(a.mobile) < 20
  AND a.city IS NOT NULL
  AND a.state IS NOT NULL
UNION ALL
SELECT 
    'With Complete Employment Data',
    COUNT(*)::TEXT
FROM applications app
INNER JOIN applicants a ON a.applicant_id = app.applicant_id
WHERE a.employment_type IS NOT NULL
  AND a.monthly_income IS NOT NULL
  AND a.monthly_income > 0
  AND a.employer_name IS NOT NULL
  AND a.years_in_job IS NOT NULL
UNION ALL
SELECT 
    'Home Loans with Property',
    COUNT(*)::TEXT
FROM applications app
INNER JOIN property_details pd ON pd.application_id = app.application_id
WHERE app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%'
UNION ALL
SELECT 
    'Still Missing Data',
    COUNT(*)::TEXT
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
WHERE a.first_name IS NULL 
   OR a.first_name = '' 
   OR a.first_name = 'New'
   OR a.mobile IS NULL 
   OR a.mobile = ''
   OR LENGTH(a.mobile) > 20
   OR a.employment_type IS NULL
   OR a.monthly_income IS NULL;

