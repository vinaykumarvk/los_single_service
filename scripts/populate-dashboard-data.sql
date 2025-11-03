-- Script to populate sufficient data for all dashboard widgets
-- Ensures diverse status distribution, assignments, and hierarchical data

-- Step 1: Update existing applications to have diverse statuses
UPDATE applications
SET status = CASE 
  WHEN (ROW_NUMBER() OVER ()) % 10 = 0 THEN 'Disbursed'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 1 THEN 'Sanctioned'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 2 THEN 'Underwriting'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 3 THEN 'Verification'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 4 THEN 'Approved'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 5 THEN 'Rejected'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 6 THEN 'PendingVerification'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 7 THEN 'InProgress'
  WHEN (ROW_NUMBER() OVER ()) % 10 = 8 THEN 'Submitted'
  ELSE 'Draft'
END,
updated_at = NOW() - (RANDOM() * INTERVAL '30 days')
WHERE status IN ('Draft', 'Submitted');

-- Step 2: Create additional applications for rm10 and ensure all RMs have sufficient data
DO $$
DECLARE
  rm_ids UUID[];
  rm_id UUID;
  applicant_count INT := 50;
  i INT;
  new_app_id UUID;
BEGIN
  -- Get all RM user IDs
  SELECT ARRAY_AGG(user_id) INTO rm_ids
  FROM users
  WHERE roles && ARRAY['rm', 'relationship_manager']::text[];
  
  -- Create applicants and applications for rm10 and top up others
  FOR i IN 1..applicant_count LOOP
    -- Randomly assign to an RM
    rm_id := rm_ids[1 + floor(random() * array_length(rm_ids, 1))::int];
    
    -- Create applicant
    INSERT INTO applicants (
      applicant_id,
      first_name,
      last_name,
      mobile,
      email,
      date_of_birth,
      address_line1,
      city,
      state,
      pincode,
      employment_type,
      monthly_income,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'Applicant' || i,
      'Test' || i,
      '9876543' || LPAD(i::text, 3, '0'),
      'applicant' || i || '@test.local',
      '1990-01-01'::date + (RANDOM() * INTERVAL '30 years')::interval,
      'Street ' || i,
      'City' || (i % 10),
      'State' || (i % 5),
      '123456',
      CASE (i % 4)
        WHEN 0 THEN 'salaried'
        WHEN 1 THEN 'self_employed'
        WHEN 2 THEN 'business'
        ELSE 'professional'
      END,
      25000 + (RANDOM() * 200000)::int,
      NOW() - (RANDOM() * INTERVAL '60 days'),
      NOW() - (RANDOM() * INTERVAL '30 days')
    )
    ON CONFLICT (mobile) DO NOTHING
    RETURNING applicant_id INTO new_app_id;
    
    IF new_app_id IS NOT NULL THEN
      -- Create application with diverse status
      INSERT INTO applications (
        application_id,
        applicant_id,
        status,
        channel,
        product_code,
        requested_amount,
        requested_tenure_months,
        assigned_to,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        new_app_id,
        CASE (i % 12)
          WHEN 0 THEN 'Disbursed'
          WHEN 1 THEN 'Sanctioned'
          WHEN 2 THEN 'Underwriting'
          WHEN 3 THEN 'Verification'
          WHEN 4 THEN 'Approved'
          WHEN 5 THEN 'Rejected'
          WHEN 6 THEN 'PendingVerification'
          WHEN 7 THEN 'InProgress'
          WHEN 8 THEN 'OfferAccepted'
          WHEN 9 THEN 'DisbursementRequested'
          WHEN 10 THEN 'Submitted'
          ELSE 'Draft'
        END,
        CASE (i % 3)
          WHEN 0 THEN 'online'
          WHEN 1 THEN 'branch'
          ELSE 'mobile'
        END,
        'PL' || (1 + (i % 5)),
        50000 + (RANDOM() * 2000000)::int,
        12 + (RANDOM() * 48)::int,
        rm_id,
        NOW() - (RANDOM() * INTERVAL '60 days'),
        NOW() - (RANDOM() * INTERVAL '30 days')
      );
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Created % applications distributed across RMs', applicant_count;
END $$;

-- Step 3: Ensure rm10 has applications
UPDATE applications
SET assigned_to = (SELECT user_id FROM users WHERE username = 'rm10' LIMIT 1)
WHERE application_id IN (
  SELECT application_id FROM applications 
  WHERE assigned_to IS NOT NULL
  ORDER BY RANDOM()
  LIMIT 15
);

-- Step 4: Add some disbursed amounts for financial metrics
UPDATE applications
SET requested_amount = CASE 
  WHEN status = 'Disbursed' THEN requested_amount * 0.95  -- 95% of requested
  ELSE requested_amount
END
WHERE status = 'Disbursed';

-- Step 5: Update timestamps to create realistic TAT data
UPDATE applications
SET 
  created_at = NOW() - (RANDOM() * INTERVAL '90 days'),
  updated_at = CASE
    WHEN status IN ('Disbursed', 'Sanctioned') THEN created_at + (RANDOM() * INTERVAL '45 days')
    WHEN status IN ('Underwriting', 'Verification') THEN created_at + (RANDOM() * INTERVAL '30 days')
    WHEN status IN ('Submitted', 'InProgress') THEN created_at + (RANDOM() * INTERVAL '15 days')
    ELSE created_at + (RANDOM() * INTERVAL '5 days')
  END
WHERE updated_at = created_at;

-- Step 6: Summary report
SELECT 
  'Summary' as report_type,
  COUNT(*) as total_applications,
  COUNT(DISTINCT assigned_to) as rms_with_apps,
  COUNT(*) FILTER (WHERE status = 'Draft') as draft,
  COUNT(*) FILTER (WHERE status = 'Submitted') as submitted,
  COUNT(*) FILTER (WHERE status = 'InProgress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'Underwriting') as underwriting,
  COUNT(*) FILTER (WHERE status = 'Sanctioned') as sanctioned,
  COUNT(*) FILTER (WHERE status = 'Disbursed') as disbursed,
  COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
FROM applications;

