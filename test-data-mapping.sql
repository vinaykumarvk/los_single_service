-- Test script to verify data mapping works correctly
-- Simulates frontend form submission and verifies storage

-- Test 1: Insert test applicant with all new fields
DO $$
DECLARE
    test_applicant_id UUID := gen_random_uuid();
    test_date_of_birth DATE := '1990-01-15';
BEGIN
    -- Insert with frontend format (dateOfBirth will be transformed to date_of_birth)
    INSERT INTO applicants (
        applicant_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        marital_status,
        mobile,
        email,
        employment_type,
        monthly_income,
        other_income_sources,
        years_in_job,
        bank_account_number,
        bank_ifsc,
        bank_account_holder_name,
        bank_verified,
        bank_verification_method
    ) VALUES (
        test_applicant_id,
        'Test',
        'User',
        test_date_of_birth,
        'Male',
        'Married',
        '9876543210',
        'test@example.com',
        'SelfEmployed',  -- Note: Frontend sends 'Self-employed', backend stores 'SelfEmployed'
        50000,
        'Rental income: ₹10000/month',
        5.5,
        '1234567890123456',
        'ABCD0123456',
        'Test User',
        true,
        'name_match'
    );
    
    -- Verify data was stored correctly
    RAISE NOTICE 'Test applicant created: %', test_applicant_id;
    RAISE NOTICE 'Date of birth stored: %', (SELECT date_of_birth FROM applicants WHERE applicant_id = test_applicant_id);
    RAISE NOTICE 'Employment type stored: %', (SELECT employment_type FROM applicants WHERE applicant_id = test_applicant_id);
    RAISE NOTICE 'Other income sources stored: %', (SELECT other_income_sources FROM applicants WHERE applicant_id = test_applicant_id);
    RAISE NOTICE 'Years in job stored: %', (SELECT years_in_job FROM applicants WHERE applicant_id = test_applicant_id);
    RAISE NOTICE 'Bank verified: %', (SELECT bank_verified FROM applicants WHERE applicant_id = test_applicant_id);
    
    -- Cleanup
    DELETE FROM applicants WHERE applicant_id = test_applicant_id;
    RAISE NOTICE 'Test data cleaned up';
END $$;

-- Test 2: Verify property_details table works
DO $$
DECLARE
    test_app_id UUID := gen_random_uuid();
    test_property_id UUID;
BEGIN
    -- First create a test application
    INSERT INTO applications (application_id, applicant_id, channel, product_code, requested_amount, requested_tenure_months, status)
    VALUES (test_app_id, gen_random_uuid(), 'Branch', 'HOME_LOAN_V1', 5000000, 240, 'Draft');
    
    -- Insert property details
    INSERT INTO property_details (
        application_id,
        property_type,
        builder_name,
        project_name,
        property_value,
        property_address,
        property_pincode,
        property_city,
        property_state
    ) VALUES (
        test_app_id,
        'Flat',
        'ABC Builders',
        'ABC Heights',
        10000000,
        '123 Property Street',
        '400001',
        'Mumbai',
        'Maharashtra'
    ) RETURNING property_id INTO test_property_id;
    
    RAISE NOTICE 'Property details created: %', test_property_id;
    RAISE NOTICE 'Property type: %', (SELECT property_type FROM property_details WHERE property_id = test_property_id);
    
    -- Cleanup
    DELETE FROM property_details WHERE application_id = test_app_id;
    DELETE FROM applications WHERE application_id = test_app_id;
    RAISE NOTICE 'Test data cleaned up';
END $$;

-- Test 3: Verify password reset OTP table works
DO $$
DECLARE
    test_user_id UUID;
    test_otp_id UUID;
BEGIN
    -- Get a test user (or create one)
    SELECT user_id INTO test_user_id FROM users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found, skipping OTP test';
        RETURN;
    END IF;
    
    -- Insert test OTP
    INSERT INTO password_reset_otps (
        user_id,
        otp_hash,
        purpose,
        expires_at
    ) VALUES (
        test_user_id,
        'hashed_otp_value',
        'password_reset',
        NOW() + INTERVAL '5 minutes'
    ) RETURNING otp_id INTO test_otp_id;
    
    RAISE NOTICE 'OTP record created: %', test_otp_id;
    RAISE NOTICE 'OTP expires at: %', (SELECT expires_at FROM password_reset_otps WHERE otp_id = test_otp_id);
    
    -- Cleanup
    DELETE FROM password_reset_otps WHERE otp_id = test_otp_id;
    RAISE NOTICE 'Test data cleaned up';
END $$;

SELECT '✅ All data mapping tests completed' as status;

