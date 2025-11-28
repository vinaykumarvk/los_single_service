-- Comprehensive Demo Data Population Script
-- This script populates all tables with rich dataset for customer demo
-- Run this after all migrations are complete

-- ============================================
-- PART 1: USERS (RMs, Admins, Operations, SRMs)
-- ============================================

-- Create additional RM users (10 RMs total for demo)
-- Password for all: Demo@123456 (bcrypt hash: $2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i)
INSERT INTO users (user_id, username, email, password_hash, roles, is_active, employee_id, designation, created_at, updated_at)
VALUES
  -- SRMs (Senior Relationship Managers)
  ('a0000001-0000-0000-0000-000000000001', 'srm1', 'srm1@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager', 'srm'], true, 'SRM001', 'SRM', now(), now()),
  ('a0000001-0000-0000-0000-000000000002', 'srm2', 'srm2@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager', 'srm'], true, 'SRM002', 'SRM', now(), now()),
  
  -- RMs (Relationship Managers)
  ('a0000002-0000-0000-0000-000000000001', 'rm1', 'rm1@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM001', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000002', 'rm2', 'rm2@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM002', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000003', 'rm3', 'rm3@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM003', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000004', 'rm4', 'rm4@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM004', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000005', 'rm5', 'rm5@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM005', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000006', 'rm6', 'rm6@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM006', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000007', 'rm7', 'rm7@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM007', 'RM', now(), now()),
  ('a0000002-0000-0000-0000-000000000008', 'rm8', 'rm8@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, 'RM008', 'RM', now(), now()),
  
  -- Operations Team
  ('a0000003-0000-0000-0000-000000000001', 'ops1', 'ops1@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['ops', 'operations'], true, 'OPS001', 'Operations Officer', now(), now()),
  ('a0000003-0000-0000-0000-000000000002', 'ops2', 'ops2@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['ops', 'operations'], true, 'OPS002', 'Operations Officer', now(), now()),
  
  -- Admin
  ('a0000004-0000-0000-0000-000000000001', 'admin', 'admin@los.demo', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['admin'], true, 'ADMIN001', 'Administrator', now(), now())
ON CONFLICT (username) DO UPDATE SET
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active,
  designation = EXCLUDED.designation;

-- Set reporting hierarchy (RMs report to SRMs)
UPDATE users SET reports_to = 'a0000001-0000-0000-0000-000000000001' 
WHERE user_id IN ('a0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000002', 
                  'a0000002-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000004');

UPDATE users SET reports_to = 'a0000001-0000-0000-0000-000000000002' 
WHERE user_id IN ('a0000002-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000006', 
                  'a0000002-0000-0000-0000-000000000007', 'a0000002-0000-0000-0000-000000000008');

-- ============================================
-- PART 2: PRODUCTS & MASTERS DATA
-- ============================================

-- Products
INSERT INTO products (product_code, name, min_amount, max_amount, min_tenure_months, max_tenure_months, max_foir, age_at_maturity_limit, created_at)
VALUES
  ('HOME_LOAN_V1', 'Home Loan', 500000, 10000000, 60, 360, 0.45, 70, now()),
  ('PERSONAL_LOAN_V1', 'Personal Loan', 50000, 5000000, 12, 60, 0.50, 65, now()),
  ('BUSINESS_LOAN_V1', 'Business Loan', 100000, 20000000, 12, 120, 0.55, 70, now()),
  ('EDUCATION_LOAN_V1', 'Education Loan', 50000, 2000000, 12, 120, 0.40, 65, now()),
  ('VEHICLE_LOAN_V1', 'Vehicle Loan', 100000, 5000000, 12, 84, 0.50, 70, now())
ON CONFLICT (product_code) DO UPDATE SET
  name = EXCLUDED.name,
  min_amount = EXCLUDED.min_amount,
  max_amount = EXCLUDED.max_amount;

-- Rate Matrices
INSERT INTO rate_matrices (product_code, rate_type, interest_rate, effective_from, min_amount, max_amount, min_tenure_months, max_tenure_months, applicable_channels, applicable_states)
VALUES
  ('HOME_LOAN_V1', 'Floating', 8.50, '2024-01-01', 500000, 50000000, 60, 360, ARRAY['Branch', 'Online', 'MobileApp'], ARRAY['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi']),
  ('HOME_LOAN_V1', 'Fixed', 8.75, '2024-01-01', 500000, 50000000, 60, 360, ARRAY['Branch'], NULL),
  ('HOME_LOAN_V1', 'Hybrid', 8.60, '2024-01-01', 1000000, 50000000, 120, 360, ARRAY['Branch', 'Online'], NULL),
  ('PERSONAL_LOAN_V1', 'Floating', 12.50, '2024-01-01', 50000, 5000000, 12, 84, ARRAY['Branch', 'Online', 'MobileApp', 'DSA'], NULL),
  ('PERSONAL_LOAN_V1', 'Fixed', 13.00, '2024-01-01', 50000, 5000000, 12, 84, ARRAY['Branch', 'Online'], NULL),
  ('BUSINESS_LOAN_V1', 'Floating', 11.00, '2024-01-01', 100000, 20000000, 12, 120, ARRAY['Branch', 'Online'], NULL),
  ('EDUCATION_LOAN_V1', 'Floating', 9.50, '2024-01-01', 50000, 2000000, 12, 120, ARRAY['Branch', 'Online'], NULL),
  ('VEHICLE_LOAN_V1', 'Floating', 10.50, '2024-01-01', 100000, 5000000, 12, 84, ARRAY['Branch', 'Online', 'DSA'], NULL)
ON CONFLICT (product_code, rate_type, effective_from) DO NOTHING;

-- Charges
INSERT INTO charges (charge_code, charge_name, charge_type, calculation_method, fixed_amount, percentage_rate, min_charge, max_charge, applicable_to_products, applicable_channels, effective_from)
VALUES
  ('PROC_FEE_HOME', 'Processing Fee - Home Loan', 'ProcessingFee', 'Percentage', NULL, 0.50, 5000, 50000, ARRAY['HOME_LOAN_V1'], ARRAY['Branch', 'Online', 'MobileApp'], '2024-01-01'),
  ('PROC_FEE_PERSONAL', 'Processing Fee - Personal Loan', 'ProcessingFee', 'Fixed', 2500, NULL, 2500, 2500, ARRAY['PERSONAL_LOAN_V1'], NULL, '2024-01-01'),
  ('DOC_FEE_HOME', 'Documentation Fee - Home Loan', 'DocumentationFee', 'Fixed', 10000, NULL, 10000, 10000, ARRAY['HOME_LOAN_V1'], NULL, '2024-01-01'),
  ('STAMP_DUTY', 'Stamp Duty', 'StampDuty', 'Percentage', NULL, 0.10, 1000, NULL, ARRAY['HOME_LOAN_V1'], NULL, '2024-01-01'),
  ('LEGAL_FEE', 'Legal Fee', 'LegalFee', 'Fixed', 15000, NULL, 15000, 15000, ARRAY['HOME_LOAN_V1'], NULL, '2024-01-01')
ON CONFLICT (charge_code) DO NOTHING;

-- Branches
INSERT INTO branches (branch_code, branch_name, branch_type, address_line1, address_line2, city, state, pincode, contact_mobile, contact_email, manager_name, metadata)
VALUES
  ('HO_MUM', 'Head Office - Mumbai', 'HeadOffice', 'Nariman Point', 'Fort Area', 'Mumbai', 'Maharashtra', '400021', '022-12345678', 'ho.mumbai@los.com', 'Rajesh Kumar', '{"latitude": 18.9330, "longitude": 72.8350}'),
  ('BR_MUM_001', 'Mumbai - Andheri Branch', 'Branch', 'Andheri West', 'Near Metro Station', 'Mumbai', 'Maharashtra', '400053', '022-23456789', 'andheri@los.com', 'Priya Sharma', '{"latitude": 19.1136, "longitude": 72.8697}'),
  ('BR_DEL_001', 'Delhi - Connaught Place Branch', 'Branch', 'Connaught Place', 'Block A', 'New Delhi', 'Delhi', '110001', '011-34567890', 'cp@los.com', 'Amit Singh', '{"latitude": 28.6304, "longitude": 77.2177}'),
  ('RO_BLR', 'Regional Office - Bangalore', 'RegionalOffice', 'MG Road', 'Near Metro Station', 'Bangalore', 'Karnataka', '560001', '080-45678901', 'ro.bangalore@los.com', 'Suresh Reddy', '{"latitude": 12.9716, "longitude": 77.5946}'),
  ('BR_BLR_001', 'Bangalore - Whitefield Branch', 'Branch', 'Whitefield', 'ITPL Road', 'Bangalore', 'Karnataka', '560066', '080-56789012', 'whitefield@los.com', 'Kavitha Nair', '{"latitude": 12.9698, "longitude": 77.7499}'),
  ('BR_CHN_001', 'Chennai - T Nagar Branch', 'Branch', 'T Nagar', 'Thyagaraja Road', 'Chennai', 'Tamil Nadu', '600017', '044-67890123', 'tnagar@los.com', 'Vikram Iyer', '{"latitude": 13.0418, "longitude": 80.2341}')
ON CONFLICT (branch_code) DO NOTHING;

-- ============================================
-- PART 3: APPLICANTS (Rich Customer Data)
-- ============================================

-- Create 200 applicants with realistic Indian names and data
DO $$
DECLARE
  first_names TEXT[] := ARRAY['Raj', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Meera', 'Karan', 'Divya', 
                              'Ravi', 'Kavya', 'Arjun', 'Shreya', 'Rohan', 'Aditi', 'Nikhil', 'Pooja', 'Rahul', 'Neha',
                              'Suresh', 'Radha', 'Mohan', 'Kriti', 'Vivek', 'Sanaya', 'Abhishek', 'Richa', 'Ajay', 'Manisha',
                              'Varun', 'Shalini', 'Harsh', 'Ananya', 'Kunal', 'Riya', 'Deepak', 'Swati', 'Pradeep', 'Jyoti',
                              'Gaurav', 'Shweta', 'Manish', 'Preeti', 'Vinod', 'Nisha', 'Sachin', 'Pallavi', 'Anil', 'Tanvi',
                              'Kiran', 'Suman', 'Ramesh', 'Lakshmi', 'Suresh', 'Geeta', 'Mahesh', 'Sunita', 'Dinesh', 'Poonam',
                              'Naresh', 'Kamala', 'Rajesh', 'Sarita', 'Mukesh', 'Usha', 'Jitendra', 'Madhu', 'Ashok', 'Rekha'];
  surnames TEXT[] := ARRAY['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Jain', 'Agarwal', 'Mehta', 'Reddy',
                           'Chopra', 'Malhotra', 'Bansal', 'Saxena', 'Goyal', 'Kapoor', 'Khan', 'Ali', 'Yadav', 'Pandey',
                           'Shah', 'Rao', 'Nair', 'Menon', 'Narayan', 'Krishnan', 'Desai', 'Deshmukh', 'Joshi', 'Bhatt',
                           'Trivedi', 'Mishra', 'Dwivedi', 'Tiwari', 'Pathak', 'Dubey', 'Pandit', 'Thakur', 'Pawar', 'Patil',
                           'More', 'Gaikwad', 'Kulkarni', 'Deshpande', 'Wagh', 'Jadhav', 'Solanki', 'Chauhan', 'Tomar', 'Rathore'];
  cities TEXT[] := ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat',
                         'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad'];
  states TEXT[] := ARRAY['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'Maharashtra', 'West Bengal', 'Gujarat', 'Rajasthan', 'Gujarat',
                         'Uttar Pradesh', 'Uttar Pradesh', 'Maharashtra', 'Madhya Pradesh', 'Maharashtra', 'Madhya Pradesh', 'Andhra Pradesh', 'Bihar', 'Gujarat', 'Uttar Pradesh'];
  applicant_id UUID;
  i INT;
  first_name TEXT;
  last_name TEXT;
  city_idx INT;
  state_idx INT;
  age_years INT;
  dob DATE;
  gender TEXT;
  mobile TEXT;
  email TEXT;
  pan TEXT;
  income NUMERIC;
BEGIN
  FOR i IN 1..200 LOOP
    -- Generate names
    first_name := first_names[1 + (i - 1) % array_length(first_names, 1)];
    last_name := surnames[1 + (i - 1) % array_length(surnames, 1)];
    
    -- Generate location
    city_idx := 1 + (i - 1) % array_length(cities, 1);
    
    -- Generate age (25-55 years)
    age_years := 25 + (i % 31);
    dob := CURRENT_DATE - (age_years || ' years')::INTERVAL - (RANDOM() * 365)::INT * INTERVAL '1 day';
    
    -- Generate gender
    gender := CASE (i % 3) WHEN 0 THEN 'Male' WHEN 1 THEN 'Female' ELSE 'Other' END;
    
    -- Generate mobile (10 digits)
    mobile := '9' || LPAD((800000000 + i)::TEXT, 9, '0');
    
    -- Generate email
    email := LOWER(first_name || '.' || last_name || i::TEXT || '@demo.com');
    
    -- Generate PAN (format: ABCDE1234F)
    pan := CHR(65 + (i % 26)) || CHR(65 + ((i * 2) % 26)) || CHR(65 + ((i * 3) % 26)) || 
           CHR(65 + ((i * 4) % 26)) || CHR(65 + ((i * 5) % 26)) || 
           LPAD((1000 + (i % 9000))::TEXT, 4, '0') || 
           CHR(65 + ((i * 7) % 26));
    
    -- Generate income (50k - 500k per month)
    income := 50000 + ((i % 46) * 10000);
    
    applicant_id := gen_random_uuid();
    
    INSERT INTO applicants (
      applicant_id, first_name, last_name, date_of_birth, gender,
      mobile, email, pan, aadhaar_masked,
      address_line1, city, state, pincode, country,
      occupation, employment_type, monthly_income,
      bank_account_number, bank_ifsc, bank_account_holder_name,
      kyc_status, created_at, updated_at
    )
    VALUES (
      applicant_id,
      first_name,
      last_name,
      dob,
      gender,
      mobile,
      email,
      pan,
      'XXXX XXXX ' || LPAD((i % 10000)::TEXT, 4, '0'), -- Masked Aadhaar
      'Building ' || i::TEXT || ', Street ' || (i % 50)::TEXT,
      cities[city_idx],
      states[city_idx],
      LPAD((400000 + (i % 100000))::TEXT, 6, '0'),
      'India',
      CASE (i % 5) 
        WHEN 0 THEN 'Software Engineer' 
        WHEN 1 THEN 'Business Owner' 
        WHEN 2 THEN 'Doctor' 
        WHEN 3 THEN 'Teacher' 
        ELSE 'Manager' 
      END,
      CASE (i % 3) 
        WHEN 0 THEN 'Salaried' 
        WHEN 1 THEN 'SelfEmployed' 
        ELSE 'Business' 
      END,
      income,
      LPAD((1000000000 + i)::TEXT, 12, '0'),
      'HDFC0000123',
      first_name || ' ' || last_name,
      CASE (i % 4)
        WHEN 0 THEN 'PENDING'
        WHEN 1 THEN 'IN_PROGRESS'
        WHEN 2 THEN 'COMPLETED'
        ELSE 'VERIFIED'
      END,
      now() - (RANDOM() * INTERVAL '180 days'),
      now() - (RANDOM() * INTERVAL '180 days')
    )
    ON CONFLICT (applicant_id) DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Created 200 applicants';
END $$;

-- ============================================
-- PART 4: APPLICATIONS (Rich Application Data)
-- ============================================

-- Create 300 applications with various statuses, assigned to RMs
DO $$
DECLARE
  rm_ids UUID[];
  rm_count INT;
  applicant_ids UUID[];
  app_count INT;
  i INT;
  j INT;
  applicant_id UUID;
  app_id TEXT;
  rm_id UUID;
  statuses TEXT[] := ARRAY['Draft', 'Submitted', 'InProgress', 'UnderReview', 'PendingVerification', 
                            'Approved', 'Sanctioned', 'Disbursed', 'Rejected', 'Withdrawn'];
  products TEXT[] := ARRAY['HOME_LOAN_V1', 'PERSONAL_LOAN_V1', 'BUSINESS_LOAN_V1', 'EDUCATION_LOAN_V1', 'VEHICLE_LOAN_V1'];
  channels TEXT[] := ARRAY['Branch', 'Online', 'MobileApp', 'Website', 'CallCenter', 'DSA'];
  status_idx INT;
  product_idx INT;
  channel_idx INT;
  amount NUMERIC;
  tenure INT;
  created_date TIMESTAMPTZ;
  updated_date TIMESTAMPTZ;
BEGIN
  -- Get RM IDs
  SELECT ARRAY_AGG(u.user_id) INTO rm_ids
  FROM users u
  WHERE 'rm' = ANY(u.roles) AND u.user_id::text LIKE 'a0000002-%';
  
  rm_count := array_length(rm_ids, 1);
  
  -- Get applicant IDs
  SELECT ARRAY_AGG(a.applicant_id) INTO applicant_ids
  FROM applicants a
  ORDER BY a.created_at;
  
  app_count := 0;
  
  -- Create 300 applications
  FOR i IN 1..300 LOOP
    -- Select applicant (some applicants have multiple applications)
    applicant_id := applicant_ids[1 + ((i - 1) % array_length(applicant_ids, 1))];
    
    -- Assign to RM (round-robin)
    rm_id := rm_ids[1 + ((i - 1) % rm_count)];
    
    -- Select status (distribute evenly)
    status_idx := 1 + ((i - 1) % array_length(statuses, 1));
    
    -- Select product
    product_idx := 1 + ((i - 1) % array_length(products, 1));
    
    -- Select channel
    channel_idx := 1 + ((i - 1) % array_length(channels, 1));
    
    -- Generate application ID based on product
    CASE products[product_idx]
      WHEN 'HOME_LOAN_V1' THEN app_id := 'HL' || LPAD((1000 + i)::TEXT, 5, '0');
      WHEN 'PERSONAL_LOAN_V1' THEN app_id := 'PL' || LPAD((1000 + i)::TEXT, 5, '0');
      WHEN 'BUSINESS_LOAN_V1' THEN app_id := 'BL' || LPAD((1000 + i)::TEXT, 5, '0');
      WHEN 'EDUCATION_LOAN_V1' THEN app_id := 'EL' || LPAD((1000 + i)::TEXT, 5, '0');
      WHEN 'VEHICLE_LOAN_V1' THEN app_id := 'VL' || LPAD((1000 + i)::TEXT, 5, '0');
      ELSE app_id := 'AP' || LPAD((1000 + i)::TEXT, 5, '0');
    END CASE;
    
    -- Generate amount based on product
    CASE products[product_idx]
      WHEN 'HOME_LOAN_V1' THEN amount := 2000000 + ((i % 80) * 100000); -- 20L to 1Cr
      WHEN 'PERSONAL_LOAN_V1' THEN amount := 100000 + ((i % 49) * 100000); -- 1L to 50L
      WHEN 'BUSINESS_LOAN_V1' THEN amount := 500000 + ((i % 195) * 100000); -- 5L to 2Cr
      WHEN 'EDUCATION_LOAN_V1' THEN amount := 50000 + ((i % 195) * 10000); -- 50k to 20L
      WHEN 'VEHICLE_LOAN_V1' THEN amount := 300000 + ((i % 47) * 100000); -- 3L to 50L
      ELSE amount := 100000 + ((i % 49) * 100000);
    END CASE;
    
    -- Generate tenure
    CASE products[product_idx]
      WHEN 'HOME_LOAN_V1' THEN tenure := 120 + ((i % 241) * 12); -- 10-30 years
      WHEN 'PERSONAL_LOAN_V1' THEN tenure := 12 + ((i % 49) * 12); -- 1-5 years
      WHEN 'BUSINESS_LOAN_V1' THEN tenure := 12 + ((i % 109) * 12); -- 1-10 years
      WHEN 'EDUCATION_LOAN_V1' THEN tenure := 12 + ((i % 109) * 12); -- 1-10 years
      WHEN 'VEHICLE_LOAN_V1' THEN tenure := 12 + ((i % 73) * 12); -- 1-7 years
      ELSE tenure := 12 + ((i % 49) * 12);
    END CASE;
    
    -- Generate dates (spread over last 6 months)
    created_date := now() - (RANDOM() * INTERVAL '180 days');
    
    -- Update date based on status
    CASE statuses[status_idx]
      WHEN 'Disbursed' THEN updated_date := created_date + (RANDOM() * INTERVAL '60 days');
      WHEN 'Sanctioned' THEN updated_date := created_date + (RANDOM() * INTERVAL '45 days');
      WHEN 'Approved' THEN updated_date := created_date + (RANDOM() * INTERVAL '40 days');
      WHEN 'UnderReview' THEN updated_date := created_date + (RANDOM() * INTERVAL '30 days');
      WHEN 'PendingVerification' THEN updated_date := created_date + (RANDOM() * INTERVAL '20 days');
      WHEN 'InProgress' THEN updated_date := created_date + (RANDOM() * INTERVAL '15 days');
      WHEN 'Submitted' THEN updated_date := created_date + (RANDOM() * INTERVAL '7 days');
      WHEN 'Rejected' THEN updated_date := created_date + (RANDOM() * INTERVAL '25 days');
      WHEN 'Withdrawn' THEN updated_date := created_date + (RANDOM() * INTERVAL '10 days');
      ELSE updated_date := created_date;
    END CASE;
    
    INSERT INTO applications (
      application_id, applicant_id, channel, product_code,
      requested_amount, requested_tenure_months, status,
      assigned_to, created_at, updated_at
    )
    VALUES (
      app_id,
      applicant_id,
      channels[channel_idx],
      products[product_idx],
      amount,
      tenure,
      statuses[status_idx],
      rm_id,
      created_date,
      updated_date
    )
    ON CONFLICT (application_id) DO NOTHING;
    
    app_count := app_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Created % applications assigned to RMs', app_count;
END $$;

-- ============================================
-- PART 5: DOCUMENTS, HISTORY, NOTES, PROPERTY
-- ============================================

-- Create documents for applications
DO $$
DECLARE
  app_ids TEXT[];
  app_id TEXT;
  doc_types TEXT[] := ARRAY['PAN_CARD', 'AADHAAR', 'SALARY_SLIP', 'BANK_STATEMENT', 'ITR', 'PROPERTY_DOCS', 'FORM_16'];
  i INT;
  j INT;
  doc_id UUID;
BEGIN
  -- Get application IDs
  SELECT ARRAY_AGG(a.application_id ORDER BY a.created_at) INTO app_ids
  FROM (
    SELECT application_id FROM applications 
    WHERE status NOT IN ('Draft', 'Withdrawn')
    ORDER BY created_at LIMIT 200
  ) a;
  
  -- Create 2-5 documents per application
  IF app_ids IS NOT NULL THEN
    FOREACH app_id IN ARRAY app_ids
  LOOP
    FOR j IN 1..(2 + (i % 4)) LOOP
      doc_id := gen_random_uuid();
      
      INSERT INTO documents (
        doc_id, application_id, doc_type, file_name, file_type,
        size_bytes, status, object_key, version, created_at, updated_at
      )
      VALUES (
        doc_id,
        app_id,
        doc_types[1 + (j - 1) % array_length(doc_types, 1)],
        doc_types[1 + (j - 1) % array_length(doc_types, 1)] || '_' || app_id || '.pdf',
        'application/pdf',
        (500000 + (RANDOM() * 2000000))::BIGINT, -- 500KB to 2.5MB
        CASE (j % 3)
          WHEN 0 THEN 'Uploaded'
          WHEN 1 THEN 'Verified'
          ELSE 'Pending'
        END,
        'docs/' || app_id || '/' || doc_id || '.pdf',
        1,
        now() - (RANDOM() * INTERVAL '90 days'),
        now() - (RANDOM() * INTERVAL '90 days')
      )
      ON CONFLICT (doc_id) DO NOTHING;
    END LOOP;
    
      i := i + 1;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Created documents for applications';
END $$;

-- Create application history
DO $$
DECLARE
  app_ids TEXT[];
  app_id TEXT;
  events TEXT[] := ARRAY['ApplicationCreated', 'StatusChanged', 'DocumentUploaded', 'AssignedToRM', 
                         'UnderReview', 'VerificationPending', 'Approved', 'Sanctioned', 'Disbursed'];
  i INT;
  history_id UUID;
  event_date TIMESTAMPTZ;
BEGIN
  SELECT ARRAY_AGG(a.application_id ORDER BY a.created_at) INTO app_ids
  FROM (
    SELECT application_id FROM applications ORDER BY created_at LIMIT 250
  ) a;
  
  IF app_ids IS NOT NULL THEN
    FOREACH app_id IN ARRAY app_ids
  LOOP
    -- Create 3-6 history events per application
    FOR j IN 1..(3 + (i % 4)) LOOP
      history_id := gen_random_uuid();
      event_date := (SELECT created_at FROM applications WHERE application_id = app_id) + 
                    (j * INTERVAL '1 day') + (RANDOM() * INTERVAL '1 day');
      
      INSERT INTO application_history (
        history_id, application_id, event_type, event_source,
        event_data, actor_id, occurred_at, created_at
      )
      VALUES (
        history_id,
        app_id,
        events[1 + (j - 1) % array_length(events, 1)],
        CASE (j % 3)
          WHEN 0 THEN 'System'
          WHEN 1 THEN 'RM'
          ELSE 'Operations'
        END,
        jsonb_build_object(
          'status', (SELECT status FROM applications WHERE application_id = app_id),
          'note', 'Event ' || j || ' for application ' || app_id
        ),
        (SELECT assigned_to FROM applications WHERE application_id = app_id),
        event_date,
        event_date
      )
      ON CONFLICT (history_id) DO NOTHING;
    END LOOP;
    
      i := i + 1;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Created application history';
END $$;

-- Create application notes
DO $$
DECLARE
  app_ids TEXT[];
  app_id TEXT;
  rm_ids UUID[];
  rm_id UUID;
  i INT;
  note_id UUID;
BEGIN
  SELECT ARRAY_AGG(a.application_id ORDER BY a.created_at) INTO app_ids
  FROM applications a
  WHERE a.status NOT IN ('Draft')
  LIMIT 150;
  
  SELECT ARRAY_AGG(user_id) INTO rm_ids
  FROM users
  WHERE 'rm' = ANY(roles);
  
  FOREACH app_id IN ARRAY app_ids
  LOOP
    -- Get assigned RM
    SELECT assigned_to INTO rm_id FROM applications WHERE application_id = app_id;
    IF rm_id IS NULL THEN
      rm_id := rm_ids[1 + (i % array_length(rm_ids, 1))];
    END IF;
    
    -- Create 1-3 notes per application
    FOR j IN 1..(1 + (i % 3)) LOOP
      note_id := gen_random_uuid();
      
      INSERT INTO application_notes (
        note_id, application_id, note_text, created_by, created_at, updated_at
      )
      VALUES (
        note_id,
        app_id,
        CASE j
          WHEN 1 THEN 'Initial review completed. Documents verified.'
          WHEN 2 THEN 'Credit check passed. Income verified.'
          WHEN 3 THEN 'Property valuation completed. Ready for sanction.'
          ELSE 'Additional note: ' || j
        END,
        rm_id::TEXT,
        now() - (RANDOM() * INTERVAL '60 days'),
        now() - (RANDOM() * INTERVAL '60 days')
      )
      ON CONFLICT (note_id) DO NOTHING;
    END LOOP;
    
      i := i + 1;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Created application notes';
END $$;

-- Create property details for home loan applications
DO $$
DECLARE
  home_loan_apps TEXT[];
  app_id TEXT;
  property_id UUID;
  property_types TEXT[] := ARRAY['Flat', 'Plot', 'House', 'Under Construction'];
  i INT;
BEGIN
  SELECT ARRAY_AGG(a.application_id) INTO home_loan_apps
  FROM applications a
  WHERE a.product_code = 'HOME_LOAN_V1' AND a.status NOT IN ('Draft', 'Rejected', 'Withdrawn');
  
  i := 0;
  FOREACH app_id IN ARRAY home_loan_apps
  LOOP
    property_id := gen_random_uuid();
    
    INSERT INTO property_details (
      property_id, application_id, property_type, builder_name,
      project_name, property_value, property_address,
      property_pincode, property_city, property_state,
      created_at, updated_at
    )
    VALUES (
      property_id,
      app_id,
      property_types[1 + (i % array_length(property_types, 1))],
      CASE (i % 5)
        WHEN 0 THEN 'DLF Builders'
        WHEN 1 THEN 'Godrej Properties'
        WHEN 2 THEN 'Prestige Group'
        WHEN 3 THEN 'Sobha Developers'
        ELSE 'Lodha Group'
      END,
      'Project ' || (i % 20)::TEXT,
      (SELECT requested_amount * (0.8 + RANDOM() * 0.4) FROM applications WHERE application_id = app_id),
      'Property Address ' || i::TEXT || ', Sector ' || (i % 50)::TEXT,
      LPAD((400000 + (i % 100000))::TEXT, 6, '0'),
      CASE (i % 5)
        WHEN 0 THEN 'Mumbai'
        WHEN 1 THEN 'Delhi'
        WHEN 2 THEN 'Bangalore'
        WHEN 3 THEN 'Pune'
        ELSE 'Hyderabad'
      END,
      CASE (i % 5)
        WHEN 0 THEN 'Maharashtra'
        WHEN 1 THEN 'Delhi'
        WHEN 2 THEN 'Karnataka'
        WHEN 3 THEN 'Maharashtra'
        ELSE 'Telangana'
      END,
      now() - (RANDOM() * INTERVAL '90 days'),
      now() - (RANDOM() * INTERVAL '90 days')
    )
    ON CONFLICT (application_id) DO NOTHING;
    
    i := i + 1;
  END LOOP;
  
  RAISE NOTICE 'Created property details for home loans';
END $$;

-- ============================================
-- PART 6: KYC SESSIONS & BUSINESS CALENDAR
-- ============================================

-- Create KYC sessions
DO $$
DECLARE
  applicant_ids UUID[];
  app_id UUID;
  i INT;
  session_id UUID;
  kyc_types TEXT[] := ARRAY['VIDEO_KYC', 'IN_PERSON', 'AADHAAR_OTP', 'DIGITAL'];
BEGIN
  SELECT ARRAY_AGG(a.applicant_id) INTO applicant_ids
  FROM (
    SELECT applicant_id FROM applicants ORDER BY created_at LIMIT 150
  ) a;
  
  IF applicant_ids IS NOT NULL THEN
    FOREACH app_id IN ARRAY applicant_ids
    LOOP
      session_id := gen_random_uuid();
    
      INSERT INTO kyc_sessions (
        session_id, applicant_id, kyc_type, status,
        scheduled_at, completed_at, created_at, updated_at
      )
      VALUES (
        session_id,
        app_id,
      kyc_types[1 + (i % array_length(kyc_types, 1))],
      CASE (i % 4)
        WHEN 0 THEN 'SCHEDULED'
        WHEN 1 THEN 'IN_PROGRESS'
        WHEN 2 THEN 'COMPLETED'
        ELSE 'FAILED'
      END,
      now() - (RANDOM() * INTERVAL '30 days'),
      CASE (i % 2)
        WHEN 0 THEN now() - (RANDOM() * INTERVAL '25 days')
        ELSE NULL
      END,
      now() - (RANDOM() * INTERVAL '35 days'),
      now() - (RANDOM() * INTERVAL '30 days')
    )
    ON CONFLICT (session_id) DO NOTHING;
    
        i := i + 1;
      END LOOP;
    END IF;
  
  RAISE NOTICE 'Created KYC sessions';
END $$;

-- Create business calendar (holidays for 2024-2025)
INSERT INTO business_calendar (holiday_date, holiday_name, holiday_type, applicable_states, is_active, created_at)
VALUES
  -- National Holidays
  ('2024-01-26', 'Republic Day', 'NATIONAL', NULL, true, now()),
  ('2024-08-15', 'Independence Day', 'NATIONAL', NULL, true, now()),
  ('2024-10-02', 'Gandhi Jayanti', 'NATIONAL', NULL, true, now()),
  ('2024-11-01', 'Diwali', 'NATIONAL', NULL, true, now()),
  ('2025-01-26', 'Republic Day', 'NATIONAL', NULL, true, now()),
  ('2025-08-15', 'Independence Day', 'NATIONAL', NULL, true, now()),
  
  -- Bank Holidays
  ('2024-01-01', 'New Year', 'BANK', NULL, true, now()),
  ('2024-03-29', 'Good Friday', 'BANK', NULL, true, now()),
  ('2024-04-14', 'Ambedkar Jayanti', 'BANK', NULL, true, now()),
  ('2024-05-01', 'Labour Day', 'BANK', NULL, true, now()),
  ('2024-06-17', 'Eid ul-Fitr', 'BANK', NULL, true, now()),
  ('2024-08-26', 'Raksha Bandhan', 'BANK', NULL, true, now()),
  ('2024-09-17', 'Ganesh Chaturthi', 'BANK', ARRAY['Maharashtra', 'Goa'], true, now()),
  ('2024-10-31', 'Dussehra', 'BANK', NULL, true, now()),
  ('2024-12-25', 'Christmas', 'BANK', NULL, true, now()),
  ('2025-01-01', 'New Year', 'BANK', NULL, true, now()),
  ('2025-03-21', 'Holi', 'BANK', NULL, true, now()),
  ('2025-04-18', 'Good Friday', 'BANK', NULL, true, now()),
  ('2025-05-01', 'Labour Day', 'BANK', NULL, true, now())
ON CONFLICT DO NOTHING;

-- ============================================
-- SUMMARY & VERIFICATION
-- ============================================

DO $$
DECLARE
  user_count INT;
  applicant_count INT;
  app_count INT;
  doc_count INT;
  history_count INT;
  notes_count INT;
  property_count INT;
  kyc_count INT;
  holiday_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO applicant_count FROM applicants;
  SELECT COUNT(*) INTO app_count FROM applications;
  SELECT COUNT(*) INTO doc_count FROM documents;
  SELECT COUNT(*) INTO history_count FROM application_history;
  SELECT COUNT(*) INTO notes_count FROM application_notes;
  SELECT COUNT(*) INTO property_count FROM property_details;
  SELECT COUNT(*) INTO kyc_count FROM kyc_sessions;
  SELECT COUNT(*) INTO holiday_count FROM business_calendar;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Demo Data Population Complete!';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'Users: %', user_count;
  RAISE NOTICE 'Applicants: %', applicant_count;
  RAISE NOTICE 'Applications: %', app_count;
  RAISE NOTICE 'Documents: %', doc_count;
  RAISE NOTICE 'Application History: %', history_count;
  RAISE NOTICE 'Application Notes: %', notes_count;
  RAISE NOTICE 'Property Details: %', property_count;
  RAISE NOTICE 'KYC Sessions: %', kyc_count;
  RAISE NOTICE 'Business Calendar Holidays: %', holiday_count;
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

