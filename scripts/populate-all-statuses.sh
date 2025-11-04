#!/bin/bash

# Script to populate applications with all statuses for testing
# This ensures the RM dashboard shows data for all status categories

set -e

echo "📊 Populating applications with all statuses..."

# Database connection
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-los}"
DB_NAME="${DB_NAME:-los}"

# RM user ID (rm1)
RM_USER_ID="00000001-0000-0000-0000-000000000001"

# Get current count
CURRENT_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM applications WHERE assigned_to = '$RM_USER_ID';" 2>/dev/null | xargs)
echo "Current applications for rm1: $CURRENT_COUNT"

# Create a SQL script to populate data
cat > /tmp/populate_statuses.sql << 'EOF'
-- Populate applications with all statuses for RM dashboard testing
-- This ensures each status category has representative data

-- First, ensure we have some applicants
DO $$
DECLARE
  applicant_id UUID;
  app_id UUID;
  status_list TEXT[] := ARRAY['Draft', 'Submitted', 'PendingVerification', 'UnderReview', 'InProgress', 'Approved', 'Rejected', 'Disbursed'];
  status_val TEXT;
  i INT;
  base_amount NUMERIC;
BEGIN
  -- Create applicants if they don't exist
  FOR i IN 1..20 LOOP
    applicant_id := gen_random_uuid();
    
    -- Check if applicant already exists
    IF NOT EXISTS (SELECT 1 FROM applicants WHERE applicant_id = applicant_id) THEN
      INSERT INTO applicants (
        applicant_id,
        full_name,
        mobile_number,
        email,
        date_of_birth,
        pan_number,
        created_at,
        updated_at
      ) VALUES (
        applicant_id,
        'Test Applicant ' || i,
        '98765432' || LPAD(i::TEXT, 2, '0'),
        'test' || i || '@example.com',
        (CURRENT_DATE - INTERVAL '25 years' - (i || ' days')::INTERVAL)::DATE,
        'ABCDE' || LPAD(i::TEXT, 4, '0') || 'F',
        now(),
        now()
      )
      ON CONFLICT (applicant_id) DO NOTHING;
    ELSE
      SELECT applicant_id INTO applicant_id FROM applicants WHERE applicant_id = applicant_id LIMIT 1;
    END IF;
    
    -- Create applications with different statuses
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
      applicant_id,
      CASE (i % 4)
        WHEN 0 THEN 'Branch'
        WHEN 1 THEN 'MobileApp'
        WHEN 2 THEN 'Website'
        ELSE 'CallCenter'
      END,
      'HOME_LOAN_V1',
      base_amount,
      60 + (i % 240), -- 5-25 years
      status_val,
      '00000001-0000-0000-0000-000000000001'::uuid, -- rm1
      now(),
      now() - (i || ' days')::INTERVAL, -- Stagger creation dates
      now()
    )
    ON CONFLICT (application_id) DO NOTHING;
    
    -- For approved/rejected/disbursed, add appropriate timestamps
    IF status_val = 'Approved' THEN
      UPDATE applications 
      SET approved_by = '00000001-0000-0000-0000-000000000001'::uuid,
          approved_at = now() - (i || ' hours')::INTERVAL
      WHERE application_id = app_id;
    END IF;
    
    IF status_val = 'Disbursed' THEN
      UPDATE applications 
      SET approved_by = '00000001-0000-0000-0000-000000000001'::uuid,
          approved_at = now() - ((i + 5) || ' hours')::INTERVAL
      WHERE application_id = app_id;
    END IF;
    
  END LOOP;
  
  RAISE NOTICE 'Created 20 applications with various statuses';
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
EOF

echo "Running SQL script..."
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f /tmp/populate_statuses.sql

echo ""
echo "✅ Data populated successfully!"
echo ""
echo "📊 Status distribution for rm1:"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT status, COUNT(*) as count FROM applications WHERE assigned_to = '00000001-0000-0000-0000-000000000001' GROUP BY status ORDER BY status;" 2>&1

