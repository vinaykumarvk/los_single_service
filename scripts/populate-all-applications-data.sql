-- Script to populate full data for all applications in the database
-- This populates applicant data, employment data, property data, and documents

-- First, let's see what we're working with
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
BEGIN
    -- Loop through all applications
    FOR app_record IN 
        SELECT application_id, applicant_id, product_code, status, requested_amount
        FROM applications 
        ORDER BY created_at
    LOOP
        app_id := app_record.application_id;
        applicant_id_val := app_record.applicant_id;
        
        -- Check if applicant exists and has data
        SELECT first_name, last_name, mobile, email, pan, city, state, pincode,
               employment_type, monthly_income, employer_name, years_in_job
        INTO first_name_val, last_name_val, mobile_val, email_val, pan_val, 
             city_val, state_val, pincode_val, employment_type_val, monthly_income_val,
             employer_name_val, years_in_job_val
        FROM applicants 
        WHERE applicant_id = applicant_id_val;
        
        -- Populate missing applicant data
        IF NOT FOUND OR first_name_val IS NULL OR first_name_val = '' THEN
            -- Generate realistic names based on application ID
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
            
            -- Set employment data (must match allowed values)
            employment_type_val := CASE (counter % 3)
                WHEN 0 THEN 'Salaried'
                WHEN 1 THEN 'SelfEmployed'
                ELSE 'Business'
            END;
            monthly_income_val := 30000 + (counter * 5000) % 200000; -- Between 30k and 230k
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
            years_in_job_val := (counter % 10) + 1; -- 1 to 10 years
            
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
                NOW(),
                NOW()
            )
            ON CONFLICT (applicant_id) DO UPDATE SET
                first_name = COALESCE(EXCLUDED.first_name, applicants.first_name),
                last_name = COALESCE(EXCLUDED.last_name, applicants.last_name),
                mobile = COALESCE(EXCLUDED.mobile, applicants.mobile),
                email = COALESCE(EXCLUDED.email, applicants.email),
                pan = COALESCE(EXCLUDED.pan, applicants.pan),
                city = COALESCE(EXCLUDED.city, applicants.city),
                state = COALESCE(EXCLUDED.state, applicants.state),
                pincode = COALESCE(EXCLUDED.pincode, applicants.pincode),
                employment_type = COALESCE(EXCLUDED.employment_type, applicants.employment_type),
                monthly_income = COALESCE(EXCLUDED.monthly_income, applicants.monthly_income),
                employer_name = COALESCE(EXCLUDED.employer_name, applicants.employer_name),
                years_in_job = COALESCE(EXCLUDED.years_in_job, applicants.years_in_job),
                gender = COALESCE(EXCLUDED.gender, applicants.gender),
                marital_status = COALESCE(EXCLUDED.marital_status, applicants.marital_status),
                date_of_birth = COALESCE(EXCLUDED.date_of_birth, applicants.date_of_birth),
                address_line1 = COALESCE(EXCLUDED.address_line1, applicants.address_line1),
                updated_at = NOW();
            
            RAISE NOTICE 'Populated applicant data for application %', app_id;
        END IF;
        
        -- Populate property data for home loans
        IF app_record.product_code LIKE '%HOME%' OR app_record.product_code LIKE '%HL%' THEN
            -- Check if property data exists
            IF NOT EXISTS (SELECT 1 FROM property_details WHERE application_id = app_id) THEN
                property_type_val := CASE (counter % 4)
                    WHEN 0 THEN 'Under Construction'
                    WHEN 1 THEN 'Flat'
                    WHEN 2 THEN 'House'
                    ELSE 'Plot'
                END;
                
                -- Calculate property value based on loan amount (default to 5L if null)
                property_value_val := COALESCE(app_record.requested_amount, 500000) * (1.5 + (counter % 10) * 0.1); -- 1.5x to 2.4x loan amount
                
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
                    'Property Address, ' || city_val,
                    city_val,
                    state_val,
                    pincode_val,
                    NOW(),
                    NOW()
                );
                
                RAISE NOTICE 'Populated property data for home loan application %', app_id;
            END IF;
        END IF;
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Completed populating data for % applications', counter;
END $$;

-- Verify the data
SELECT 
    COUNT(*) as total_applications,
    COUNT(DISTINCT a.applicant_id) as applicants_with_data,
    COUNT(CASE WHEN a.first_name IS NOT NULL AND a.first_name != '' THEN 1 END) as with_name,
    COUNT(CASE WHEN a.mobile IS NOT NULL AND a.mobile != '' THEN 1 END) as with_mobile,
    COUNT(CASE WHEN a.employment_type IS NOT NULL THEN 1 END) as with_employment,
    COUNT(CASE WHEN a.monthly_income IS NOT NULL THEN 1 END) as with_income,
    COUNT(CASE WHEN pd.property_id IS NOT NULL THEN 1 END) as with_property
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
LEFT JOIN property_details pd ON pd.application_id = app.application_id;

