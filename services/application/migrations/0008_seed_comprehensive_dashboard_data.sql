-- Comprehensive Seed Data for All Dashboard Widgets
-- Ensures sufficient data for RM, Admin, Operations, SRM, and Regional Head dashboards
-- Includes diverse statuses, time periods, and real-time data

-- First, ensure all RMs have 25-30 applications assigned
-- Update existing applications to be assigned to RMs
DO $$
DECLARE
  rm_ids UUID[];
  rm_count INT;
  app_count INT;
  i INT;
  rm_index INT := 0;
  target_apps_per_rm INT := 28; -- 25-30 range
BEGIN
  -- Get all RM user IDs
  SELECT ARRAY_AGG(user_id) INTO rm_ids
  FROM users
  WHERE 'rm' = ANY(roles) AND COALESCE(is_active, true) = true;
  
  rm_count := array_length(rm_ids, 1);
  
  IF rm_count IS NULL OR rm_count = 0 THEN
    RAISE NOTICE 'No RM users found';
    RETURN;
  END IF;
  
  -- Get count of unassigned or null assigned applications
  SELECT COUNT(*) INTO app_count
  FROM applications
  WHERE assigned_to IS NULL;
  
  RAISE NOTICE 'Found % RMs, % unassigned applications', rm_count, app_count;
  
  -- Assign applications to RMs in round-robin fashion
  FOR i IN 1..(target_apps_per_rm * rm_count) LOOP
    rm_index := ((i - 1) % rm_count) + 1;
    
    UPDATE applications
    SET assigned_to = rm_ids[rm_index],
        updated_at = now()
    WHERE application_id = (
      SELECT application_id
      FROM applications
      WHERE assigned_to IS NULL
      ORDER BY created_at
      LIMIT 1
    );
    
    -- Exit if no more unassigned applications
    EXIT WHEN NOT FOUND;
  END LOOP;
  
  RAISE NOTICE 'Assigned applications to RMs';
END $$;

-- Update application statuses to create diverse dashboard data
-- Distribute across various statuses for meaningful widgets
UPDATE applications
SET status = CASE 
  WHEN (application_id::text)::int % 10 = 0 THEN 'Disbursed'
  WHEN (application_id::text)::int % 10 = 1 THEN 'Sanctioned'
  WHEN (application_id::text)::int % 10 = 2 THEN 'UnderReview'
  WHEN (application_id::text)::int % 10 = 3 THEN 'PendingVerification'
  WHEN (application_id::text)::int % 10 = 4 THEN 'Approved'
  WHEN (application_id::text)::int % 10 = 5 THEN 'InProgress'
  WHEN (application_id::text)::int % 10 = 6 THEN 'Submitted'
  WHEN (application_id::text)::int % 10 = 7 THEN 'Draft'
  WHEN (application_id::text)::int % 10 = 8 THEN 'Rejected'
  ELSE 'Draft'
END,
updated_at = now() - (RANDOM() * INTERVAL '30 days') -- Spread over last 30 days
WHERE status IN ('Draft', 'Submitted') OR status IS NULL;

-- Create additional applications for Admin dashboard (unassigned)
-- These represent pending assignments
DO $$
DECLARE
  applicant_id UUID;
  app_id UUID;
  i INT;
  statuses TEXT[] := ARRAY['Draft', 'Submitted', 'Draft', 'Draft', 'Submitted'];
  status_index INT;
BEGIN
  FOR i IN 1..30 LOOP
    applicant_id := gen_random_uuid();
    app_id := gen_random_uuid();
    status_index := 1 + (i % array_length(statuses, 1));
    
    -- Create applicant
    INSERT INTO applicants (
      applicant_id, first_name, last_name,
      date_of_birth, gender, mobile, email,
      address_line1, city, state, pincode, country,
      employment_type, monthly_income,
      created_at, updated_at
    )
    VALUES (
      applicant_id,
      'Admin' || i::TEXT,
      'Customer' || i::TEXT,
      (CURRENT_DATE - INTERVAL '30 years' - INTERVAL '1 day' * (i % 1825))::DATE,
      CASE (i % 2) WHEN 0 THEN 'Male' ELSE 'Female' END,
      '999999' || LPAD(i::TEXT, 4, '0'),
      'admin.customer' || i::TEXT || '@test.com',
      'Admin Address ' || i::TEXT,
      'Mumbai',
      'Maharashtra',
      '400001',
      'India',
      'Salaried',
      50000 + (i * 1000),
      now() - (RANDOM() * INTERVAL '15 days'),
      now() - (RANDOM() * INTERVAL '15 days')
    )
    ON CONFLICT (applicant_id) DO NOTHING;
    
    -- Create application (unassigned - for Admin to assign)
    INSERT INTO applications (
      application_id,
      applicant_id,
      status,
      channel,
      product_code,
      requested_amount,
      requested_tenure_months,
      assigned_to, -- NULL = unassigned
      created_at,
      updated_at
    )
    VALUES (
      app_id,
      applicant_id,
      statuses[status_index],
      'Online',
      'PL',
      100000 + (i * 50000),
      12 + (i % 48),
      NULL, -- Unassigned - Admin will assign
      now() - (RANDOM() * INTERVAL '15 days'),
      now() - (RANDOM() * INTERVAL '15 days')
    )
    ON CONFLICT (application_id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Created 30 unassigned applications for Admin dashboard';
END $$;

-- Update timestamps to create meaningful trends (last 6 months)
UPDATE applications
SET created_at = now() - (RANDOM() * INTERVAL '180 days'),
    updated_at = CASE 
      WHEN status = 'Disbursed' THEN created_at + (RANDOM() * INTERVAL '60 days')
      WHEN status IN ('Sanctioned', 'Approved') THEN created_at + (RANDOM() * INTERVAL '45 days')
      WHEN status IN ('UnderReview', 'PendingVerification') THEN created_at + (RANDOM() * INTERVAL '30 days')
      WHEN status = 'Submitted' THEN created_at + (RANDOM() * INTERVAL '7 days')
      ELSE created_at
    END
WHERE created_at > now() - INTERVAL '1 day';

-- Ensure SRMs have reportees (should already be set, but verify)
DO $$
DECLARE
  srm_ids UUID[];
  rm_ids UUID[];
  srm_count INT;
  rm_count INT;
  i INT;
BEGIN
  -- Get SRM IDs
  SELECT ARRAY_AGG(user_id) INTO srm_ids
  FROM users
  WHERE designation = 'SRM' AND COALESCE(is_active, true) = true;
  
  -- Get RM IDs
  SELECT ARRAY_AGG(user_id) INTO rm_ids
  FROM users
  WHERE 'rm' = ANY(roles) AND COALESCE(is_active, true) = true;
  
  srm_count := array_length(srm_ids, 1);
  rm_count := array_length(rm_ids, 1);
  
  IF srm_count IS NULL OR rm_count IS NULL THEN
    RAISE NOTICE 'SRMs or RMs not found';
    RETURN;
  END IF;
  
  -- Ensure RMs report to SRMs (3-4 RMs per SRM)
  FOR i IN 1..rm_count LOOP
    UPDATE users
    SET reports_to = srm_ids[1 + ((i - 1) % srm_count)],
        updated_at = now()
    WHERE user_id = rm_ids[i]
      AND (reports_to IS NULL OR reports_to != srm_ids[1 + ((i - 1) % srm_count)]);
  END LOOP;
  
  RAISE NOTICE 'Updated RM reporting structure';
END $$;

-- Create summary statistics
DO $$
DECLARE
  total_apps INT;
  assigned_apps INT;
  unassigned_apps INT;
  rm_count INT;
  srm_count INT;
BEGIN
  SELECT COUNT(*) INTO total_apps FROM applications;
  SELECT COUNT(*) INTO assigned_apps FROM applications WHERE assigned_to IS NOT NULL;
  SELECT COUNT(*) INTO unassigned_apps FROM applications WHERE assigned_to IS NULL;
  SELECT COUNT(*) INTO rm_count FROM users WHERE 'rm' = ANY(roles);
  SELECT COUNT(*) INTO srm_count FROM users WHERE designation = 'SRM';
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Dashboard Data Summary:';
  RAISE NOTICE '  Total Applications: %', total_apps;
  RAISE NOTICE '  Assigned Applications: %', assigned_apps;
  RAISE NOTICE '  Unassigned Applications: %', unassigned_apps;
  RAISE NOTICE '  RM Users: %', rm_count;
  RAISE NOTICE '  SRM Users: %', srm_count;
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

