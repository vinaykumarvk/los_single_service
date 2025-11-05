-- Force populate all applicant data, overwriting "New" and encrypted values
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
        
        -- Check current applicant data
        SELECT first_name, mobile, city
        INTO first_name_val, mobile_val, city_val
        FROM applicants 
        WHERE applicant_id = applicant_id_val;
        
        -- Force populate if missing, "New", or encrypted (long mobile)
        IF NOT FOUND 
           OR first_name_val IS NULL 
           OR first_name_val = '' 
           OR first_name_val = 'New'
           OR mobile_val IS NULL 
           OR mobile_val = ''
           OR LENGTH(mobile_val) > 20 THEN
            
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
            
            -- Force update applicant with all data
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
                gender = EXCLUDED.gender,
                marital_status = EXCLUDED.marital_status,
                date_of_birth = EXCLUDED.date_of_birth,
                address_line1 = EXCLUDED.address_line1,
                updated_at = NOW();
            
            RAISE NOTICE 'Fixed applicant data for application %', app_id;
        END IF;
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Completed fixing data for % applications', counter;
END $$;

-- Verify
SELECT 
    'Total Applications' as metric,
    COUNT(*)::TEXT as value
FROM applications
UNION ALL
SELECT 
    'With Complete Data',
    COUNT(*)::TEXT
FROM applications app
INNER JOIN applicants a ON a.applicant_id = app.applicant_id
WHERE a.first_name IS NOT NULL 
  AND a.first_name != '' 
  AND a.first_name != 'New'
  AND a.mobile IS NOT NULL 
  AND a.mobile != ''
  AND LENGTH(a.mobile) < 20
  AND a.employment_type IS NOT NULL;

