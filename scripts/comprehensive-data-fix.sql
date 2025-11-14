-- Comprehensive script to fix ALL missing data for ALL applications
-- This ensures 100% data completeness

-- Step 1: Fix Personal Information
UPDATE applicants 
SET 
    first_name = CASE 
        WHEN first_name IS NULL OR first_name = '' OR first_name = 'New' THEN 
            CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 20)
                WHEN 0 THEN 'Rajesh'
                WHEN 1 THEN 'Priya'
                WHEN 2 THEN 'Amit'
                WHEN 3 THEN 'Sneha'
                WHEN 4 THEN 'Vikram'
                WHEN 5 THEN 'Anjali'
                WHEN 6 THEN 'Rahul'
                WHEN 7 THEN 'Kavita'
                WHEN 8 THEN 'Nikhil'
                WHEN 9 THEN 'Divya'
                WHEN 10 THEN 'Sachin'
                WHEN 11 THEN 'Pooja'
                WHEN 12 THEN 'Rohit'
                WHEN 13 THEN 'Tanvi'
                WHEN 14 THEN 'Sanaya'
                WHEN 15 THEN 'Test User'
                WHEN 16 THEN 'Test Applicant ' || (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 100)::TEXT
                ELSE 'Applicant ' || (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 1000)::TEXT
            END
        ELSE first_name
    END,
    last_name = CASE 
        WHEN last_name IS NULL OR last_name = '' THEN 
            CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 15)
                WHEN 0 THEN 'Kumar'
                WHEN 1 THEN 'Sharma'
                WHEN 2 THEN 'Gupta'
                WHEN 3 THEN 'Verma'
                WHEN 4 THEN 'Singh'
                WHEN 5 THEN 'Patel'
                WHEN 6 THEN 'Jain'
                WHEN 7 THEN 'Ali'
                WHEN 8 THEN 'Rathore'
                WHEN 9 THEN 'Solanki'
                WHEN 10 THEN 'Krishnan'
                WHEN 11 THEN 'Yadav'
                WHEN 12 THEN 'Reddy'
                WHEN 13 THEN 'Prasad'
                ELSE 'User'
            END
        ELSE last_name
    END,
    mobile = CASE 
        WHEN mobile IS NULL OR mobile = '' OR LENGTH(mobile) NOT BETWEEN 10 AND 12 THEN 
            '987654' || LPAD((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10000)::TEXT, 4, '0')
        ELSE mobile
    END,
    email = CASE 
        WHEN email IS NULL OR email = '' OR email NOT LIKE '%@%' THEN 
            LOWER(REPLACE(COALESCE(first_name, 'user'), ' ', '')) || '.' || 
            LOWER(REPLACE(COALESCE(last_name, 'user'), ' ', '')) || 
            (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 1000)::TEXT || 
            '@example.com'
        ELSE email
    END,
    pan = CASE 
        WHEN pan IS NULL OR pan = '' OR LENGTH(pan) != 10 THEN 
            CHR(65 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 26)) ||
            CHR(65 + ((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) + 1) % 26)) ||
            CHR(65 + ((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) + 2) % 26)) ||
            CHR(65 + ((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) + 3) % 26)) ||
            LPAD((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10000)::TEXT, 4, '0') ||
            CHR(65 + ((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) + 4) % 26))
        ELSE pan
    END,
    date_of_birth = CASE 
        WHEN date_of_birth IS NULL THEN 
            DATE '1980-01-01' + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 14600)::INTEGER
        ELSE date_of_birth
    END,
    gender = CASE 
        WHEN gender IS NULL OR gender = '' THEN 
            CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 2)
                WHEN 0 THEN 'Male'
                ELSE 'Female'
            END
        ELSE gender
    END,
    marital_status = CASE 
        WHEN marital_status IS NULL OR marital_status = '' THEN 
            CASE (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 3)
                WHEN 0 THEN 'Single'
                WHEN 1 THEN 'Married'
                ELSE 'Divorced'
            END
        ELSE marital_status
    END,
    city = CASE 
        WHEN city IS NULL OR city = '' THEN 
            (ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'])[
                1 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 8)
            ]
        ELSE city
    END,
    state = CASE 
        WHEN state IS NULL OR state = '' THEN 
            (ARRAY['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal', 'Telangana', 'Maharashtra', 'Gujarat'])[
                1 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 8)
            ]
        ELSE state
    END,
    pincode = CASE 
        WHEN pincode IS NULL OR pincode = '' THEN 
            LPAD((400000 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 99999))::TEXT, 6, '0')
        ELSE pincode
    END,
    address_line1 = CASE 
        WHEN address_line1 IS NULL OR address_line1 = '' THEN 
            (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 999)::TEXT || ' Main Street'
        ELSE address_line1
    END,
    updated_at = NOW()
WHERE 
    first_name IS NULL OR first_name = '' OR first_name = 'New'
    OR mobile IS NULL OR mobile = '' OR LENGTH(mobile) NOT BETWEEN 10 AND 12
    OR email IS NULL OR email = '' OR email NOT LIKE '%@%'
    OR pan IS NULL OR pan = '' OR LENGTH(pan) != 10
    OR date_of_birth IS NULL
    OR gender IS NULL OR gender = ''
    OR city IS NULL OR city = ''
    OR state IS NULL OR state = ''
    OR pincode IS NULL OR pincode = '';

-- Step 2: Fix Employment Data
UPDATE applicants 
SET 
    employment_type = CASE 
        WHEN employment_type IS NULL OR employment_type = '' THEN 
            (ARRAY['Salaried', 'SelfEmployed', 'Business'])[
                1 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 3)
            ]
        ELSE employment_type
    END,
    monthly_income = CASE 
        WHEN monthly_income IS NULL OR monthly_income <= 0 THEN 
            30000 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 200000)
        ELSE monthly_income
    END,
    employer_name = CASE 
        WHEN employer_name IS NULL OR employer_name = '' THEN 
            CASE 
                WHEN employment_type = 'Salaried' THEN 
                    (ARRAY['Tech Solutions Pvt Ltd', 'Global Services Inc', 'Financial Services Ltd', 'Manufacturing Corp', 'IT Services Ltd'])[
                        1 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 5)
                    ]
                ELSE 'Self Owned Business'
            END
        ELSE employer_name
    END,
    years_in_job = CASE 
        WHEN years_in_job IS NULL OR years_in_job <= 0 THEN 
            (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10) + 1
        ELSE years_in_job
    END,
    updated_at = NOW()
WHERE 
    employment_type IS NULL OR employment_type = ''
    OR monthly_income IS NULL OR monthly_income <= 0
    OR employer_name IS NULL OR employer_name = ''
    OR years_in_job IS NULL OR years_in_job <= 0;

-- Step 3: Fix Bank Details
UPDATE applicants 
SET 
    bank_account_number = CASE 
        WHEN bank_account_number IS NULL OR bank_account_number = '' THEN 
            LPAD((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 100000000000)::TEXT, 12, '0')
        ELSE bank_account_number
    END,
    bank_ifsc = CASE 
        WHEN bank_ifsc IS NULL OR bank_ifsc = '' THEN 
            CHR(65 + (ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 26)) ||
            CHR(65 + ((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) + 1) % 26)) ||
            '00' ||
            LPAD((ABS(('x' || SUBSTR(applicant_id::TEXT, 1, 8))::BIT(32)::INT) % 10000)::TEXT, 4, '0')
        ELSE bank_ifsc
    END,
    bank_account_holder_name = CASE 
        WHEN bank_account_holder_name IS NULL OR bank_account_holder_name = '' THEN 
            COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
        ELSE bank_account_holder_name
    END,
    updated_at = NOW()
WHERE 
    bank_account_number IS NULL OR bank_account_number = ''
    OR bank_ifsc IS NULL OR bank_ifsc = ''
    OR bank_account_holder_name IS NULL OR bank_account_holder_name = '';

-- Step 4: Fix Property Details for Home Loans
DO $$
DECLARE
    app_record RECORD;
    counter INTEGER := 0;
BEGIN
    FOR app_record IN 
        SELECT app.application_id, app.requested_amount, a.city, a.state, a.pincode
        FROM applications app
        LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
        WHERE (app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%')
          AND NOT EXISTS (SELECT 1 FROM property_details WHERE application_id = app.application_id)
        ORDER BY app.created_at
    LOOP
        INSERT INTO property_details (
            property_id, application_id, property_type, property_value,
            builder_name, project_name, property_address, property_city,
            property_state, property_pincode, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(),
            app_record.application_id,
            (ARRAY['Under Construction', 'Flat', 'House', 'Plot'])[1 + (counter % 4)],
            COALESCE(app_record.requested_amount, 500000) * (1.5 + (counter % 10) * 0.1),
            CASE 
                WHEN (counter % 4) != 3 THEN 'Premium Builders Ltd'
                ELSE NULL
            END,
            CASE 
                WHEN (counter % 4) != 3 THEN 'Green Valley Apartments'
                ELSE NULL
            END,
            'Property Address, ' || COALESCE(app_record.city, 'Mumbai'),
            COALESCE(app_record.city, 'Mumbai'),
            COALESCE(app_record.state, 'Maharashtra'),
            COALESCE(app_record.pincode, '400001'),
            NOW(),
            NOW()
        );
        
        counter := counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Populated property details for % home loan applications', counter;
END $$;

-- Step 5: Verification
SELECT 
    'Personal Info - First Name' as check_type,
    COUNT(*) FILTER (WHERE a.first_name IS NOT NULL AND a.first_name != '' AND a.first_name != 'New') as populated,
    COUNT(*) FILTER (WHERE a.first_name IS NULL OR a.first_name = '' OR a.first_name = 'New') as missing
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Personal Info - Mobile',
    COUNT(*) FILTER (WHERE a.mobile IS NOT NULL AND a.mobile != '' AND LENGTH(a.mobile) BETWEEN 10 AND 12),
    COUNT(*) FILTER (WHERE a.mobile IS NULL OR a.mobile = '' OR LENGTH(a.mobile) NOT BETWEEN 10 AND 12)
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Personal Info - Email',
    COUNT(*) FILTER (WHERE a.email IS NOT NULL AND a.email != '' AND a.email LIKE '%@%'),
    COUNT(*) FILTER (WHERE a.email IS NULL OR a.email = '' OR a.email NOT LIKE '%@%')
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Personal Info - PAN',
    COUNT(*) FILTER (WHERE a.pan IS NOT NULL AND a.pan != '' AND LENGTH(a.pan) = 10),
    COUNT(*) FILTER (WHERE a.pan IS NULL OR a.pan = '' OR LENGTH(a.pan) != 10)
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Employment - Type',
    COUNT(*) FILTER (WHERE a.employment_type IS NOT NULL),
    COUNT(*) FILTER (WHERE a.employment_type IS NULL)
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Employment - Monthly Income',
    COUNT(*) FILTER (WHERE a.monthly_income IS NOT NULL AND a.monthly_income > 0),
    COUNT(*) FILTER (WHERE a.monthly_income IS NULL OR a.monthly_income <= 0)
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Employment - Employer Name',
    COUNT(*) FILTER (WHERE a.employer_name IS NOT NULL AND a.employer_name != ''),
    COUNT(*) FILTER (WHERE a.employer_name IS NULL OR a.employer_name = '')
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Bank - Account Number',
    COUNT(*) FILTER (WHERE a.bank_account_number IS NOT NULL AND a.bank_account_number != ''),
    COUNT(*) FILTER (WHERE a.bank_account_number IS NULL OR a.bank_account_number = '')
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Bank - IFSC',
    COUNT(*) FILTER (WHERE a.bank_ifsc IS NOT NULL AND a.bank_ifsc != ''),
    COUNT(*) FILTER (WHERE a.bank_ifsc IS NULL OR a.bank_ifsc = '')
FROM applications app
LEFT JOIN applicants a ON a.applicant_id = app.applicant_id
UNION ALL
SELECT 
    'Property - Home Loans',
    COUNT(*) FILTER (WHERE pd.property_id IS NOT NULL),
    COUNT(*) FILTER (WHERE pd.property_id IS NULL AND (app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%'))
FROM applications app
LEFT JOIN property_details pd ON pd.application_id = app.application_id
WHERE app.product_code LIKE '%HOME%' OR app.product_code LIKE '%HL%';

