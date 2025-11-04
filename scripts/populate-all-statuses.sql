-- Populate applications with all statuses for RM dashboard testing
-- This ensures each status category has representative data

-- RM user ID (rm1)
DO $$
DECLARE
  applicant_id_var UUID;
  app_id UUID;
  status_list TEXT[] := ARRAY['Draft', 'Submitted', 'PendingVerification', 'UnderReview', 'InProgress', 'Approved', 'Rejected', 'Disbursed'];
  status_val TEXT;
  i INT;
  base_amount NUMERIC;
  rm_user_id UUID := '00000001-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Create applications with different statuses
  FOR i IN 1..24 LOOP
    -- Generate applicant ID
    applicant_id_var := gen_random_uuid();
    
    -- Check if applicant already exists, if not create one
    IF NOT EXISTS (SELECT 1 FROM applicants WHERE applicant_id = applicant_id_var) THEN
      INSERT INTO applicants (
        applicant_id,
        first_name,
        last_name,
        mobile,
        email,
        date_of_birth,
        pan,
        created_at,
        updated_at
      ) VALUES (
        applicant_id_var,
        'Test',
        'Applicant ' || i,
        '98765432' || LPAD(i::TEXT, 2, '0'),
        'test' || i || '@example.com',
        (CURRENT_DATE - INTERVAL '25 years' - (i || ' days')::INTERVAL)::DATE,
        'ABCDE' || LPAD(i::TEXT, 4, '0') || 'F',
        now(),
        now()
      )
      ON CONFLICT (applicant_id) DO NOTHING;
    END IF;
    
    -- Assign status in round-robin fashion to ensure all statuses are represented
    status_val := status_list[((i - 1) % array_length(status_list, 1)) + 1];
    app_id := gen_random_uuid();
    base_amount := 3000000 + (i * 500000);
    
    INSERT INTO applications (
      application_id,
      applicant_id,
      channel,
      product_code,
      requested_amount,
      requested_tenure_months,
      status,
      assigned_to,
      assigned_at,
      created_at,
      updated_at
    ) VALUES (
      app_id,
      applicant_id_var,
      CASE (i % 4)
        WHEN 0 THEN 'Branch'
        WHEN 1 THEN 'MobileApp'
        WHEN 2 THEN 'Website'
        ELSE 'CallCenter'
      END,
      'HOME_LOAN_V1',
      base_amount,
      60 + (i % 240), -- 5-25 years (60-300 months)
      status_val,
      rm_user_id,
      now(),
      now() - (i || ' days')::INTERVAL, -- Stagger creation dates
      now()
    )
    ON CONFLICT (application_id) DO NOTHING;
    
    -- For approved/rejected/disbursed, add appropriate timestamps
    IF status_val = 'Approved' THEN
      UPDATE applications 
      SET approved_by = rm_user_id,
          approved_at = now() - (i || ' hours')::INTERVAL
      WHERE application_id = app_id;
    END IF;
    
    IF status_val = 'Disbursed' THEN
      UPDATE applications 
      SET approved_by = rm_user_id,
          approved_at = now() - ((i + 5) || ' hours')::INTERVAL
      WHERE application_id = app_id;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Created 24 applications with all statuses for rm1';
END $$;

-- Verify distribution
SELECT 
  status,
  COUNT(*) as count
FROM applications
WHERE assigned_to = '00000001-0000-0000-0000-000000000001'::uuid
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'Draft' THEN 1
    WHEN 'Submitted' THEN 2
    WHEN 'PendingVerification' THEN 3
    WHEN 'UnderReview' THEN 4
    WHEN 'InProgress' THEN 5
    WHEN 'Approved' THEN 6
    WHEN 'Rejected' THEN 7
    WHEN 'Disbursed' THEN 8
    ELSE 9
  END;

