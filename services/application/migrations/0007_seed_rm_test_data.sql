-- Seed data for RM access control testing
-- Creates RM users, customers, and applications mapped to RMs

-- Create 4 RM users
-- Password for all: RM@123456 (bcrypt hash)
INSERT INTO users (user_id, username, email, password_hash, roles, is_active, created_at, updated_at)
VALUES
  -- RM 1
  ('00000001-0000-0000-0000-000000000001', 'rm1', 'rm1@los.local', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, now(), now()),
  -- RM 2
  ('00000001-0000-0000-0000-000000000002', 'rm2', 'rm2@los.local', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, now(), now()),
  -- RM 3
  ('00000001-0000-0000-0000-000000000003', 'rm3', 'rm3@los.local', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, now(), now()),
  -- RM 4
  ('00000001-0000-0000-0000-000000000004', 'rm4', 'rm4@los.local', 
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', 
   ARRAY['rm', 'relationship_manager'], true, now(), now())
ON CONFLICT (username) DO UPDATE SET
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active;

-- Create test customers (applicants)
-- We'll create 50 applicants and distribute them across 4 RMs (12-13 each)

DO $$
DECLARE
  rm1_id UUID := '00000001-0000-0000-0000-000000000001';
  rm2_id UUID := '00000001-0000-0000-0000-000000000002';
  rm3_id UUID := '00000001-0000-0000-0000-000000000003';
  rm4_id UUID := '00000001-0000-0000-0000-000000000004';
  applicant_id UUID;
  app_id UUID;
  i INT;
  names TEXT[] := ARRAY['Raj', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Meera', 'Karan', 'Divya', 
                        'Ravi', 'Kavya', 'Arjun', 'Shreya', 'Rohan', 'Aditi', 'Nikhil', 'Pooja', 'Rahul', 'Neha',
                        'Suresh', 'Radha', 'Mohan', 'Kriti', 'Vivek', 'Sanaya', 'Abhishek', 'Richa', 'Ajay', 'Manisha',
                        'Varun', 'Shalini', 'Harsh', 'Ananya', 'Kunal', 'Riya', 'Deepak', 'Swati', 'Pradeep', 'Jyoti',
                        'Gaurav', 'Shweta', 'Manish', 'Preeti', 'Vinod', 'Nisha', 'Sachin', 'Pallavi', 'Anil', 'Tanvi'];
  surnames TEXT[] := ARRAY['Sharma', 'Patel', 'Kumar', 'Singh', 'Gupta', 'Verma', 'Jain', 'Agarwal', 'Mehta', 'Reddy',
                           'Chopra', 'Malhotra', 'Bansal', 'Saxena', 'Goyal', 'Kapoor', 'Khan', 'Ali', 'Yadav', 'Pandey',
                           'Shah', 'Rao', 'Nair', 'Menon', 'Narayan', 'Krishnan', 'Desai', 'Deshmukh', 'Joshi', 'Bhatt',
                           'Trivedi', 'Mishra', 'Dwivedi', 'Tiwari', 'Pathak', 'Dubey', 'Pandit', 'Thakur', 'Pawar', 'Patil',
                           'More', 'Gaikwad', 'Kulkarni', 'Deshpande', 'Wagh', 'Jadhav', 'Solanki', 'Chauhan', 'Tomar', 'Rathore'];
  first_names TEXT;
  last_names TEXT;
  rm_assigned UUID;
  rm_counter INT := 0;
BEGIN
  -- Create 50 applicants
  FOR i IN 1..50 LOOP
    -- Generate names from arrays
    first_names := names[1 + (i - 1) % array_length(names, 1)];
    last_names := surnames[1 + (i - 1) % array_length(surnames, 1)];
    
    applicant_id := gen_random_uuid();
    
    -- Determine which RM this customer belongs to (distribute evenly)
    rm_counter := rm_counter + 1;
    IF rm_counter <= 13 THEN
      rm_assigned := rm1_id;
    ELSIF rm_counter <= 26 THEN
      rm_assigned := rm2_id;
    ELSIF rm_counter <= 38 THEN
      rm_assigned := rm3_id;
    ELSE
      rm_assigned := rm4_id;
    END IF;
    
    -- Insert applicant
    INSERT INTO applicants (
      applicant_id, first_name, last_name, 
      date_of_birth, gender, mobile, email,
      address_line1, city, state, pincode, country,
      employment_type, monthly_income,
      created_at, updated_at
    )
    VALUES (
      applicant_id,
      first_names,
      last_names,
      (CURRENT_DATE - INTERVAL '25 years' - INTERVAL '1 day' * (i % 1825))::DATE, -- Age between 20-45
      CASE (i % 3) WHEN 0 THEN 'Male' WHEN 1 THEN 'Female' ELSE 'Other' END,
      '987654' || LPAD(i::TEXT, 4, '0'), -- 10-digit mobile
      LOWER(first_names || '.' || last_names || i::TEXT || '@test.com'),
      'Address Line 1, Building ' || i::TEXT,
      CASE (i % 10) 
        WHEN 0 THEN 'Mumbai' WHEN 1 THEN 'Delhi' WHEN 2 THEN 'Bangalore' 
        WHEN 3 THEN 'Hyderabad' WHEN 4 THEN 'Chennai' WHEN 5 THEN 'Pune'
        WHEN 6 THEN 'Kolkata' WHEN 7 THEN 'Ahmedabad' WHEN 8 THEN 'Jaipur' ELSE 'Surat' END,
      CASE (i % 5) 
        WHEN 0 THEN 'Maharashtra' WHEN 1 THEN 'Delhi' WHEN 2 THEN 'Karnataka'
        WHEN 3 THEN 'Tamil Nadu' ELSE 'Gujarat' END,
      LPAD((300000 + (i % 100000))::TEXT, 6, '0'), -- PIN codes
      'India',
      CASE (i % 4) 
        WHEN 0 THEN 'Salaried' WHEN 1 THEN 'SelfEmployed' 
        WHEN 2 THEN 'Business' ELSE 'Retired' END,
      (20000 + (i % 50) * 2000)::NUMERIC, -- Income between 20k-120k
      now(),
      now()
    );
    
    -- Create 1-3 applications per applicant and assign to the same RM
    FOR j IN 1..(1 + (i % 3)) LOOP
      app_id := gen_random_uuid();
      
      INSERT INTO applications (
        application_id, applicant_id, channel, product_code,
        requested_amount, requested_tenure_months, status,
        assigned_to, assigned_at,
        created_at, updated_at
      )
      VALUES (
        app_id,
        applicant_id,
        CASE (i % 4) WHEN 0 THEN 'Branch' WHEN 1 THEN 'MobileApp' WHEN 2 THEN 'Website' ELSE 'CallCenter' END,
        'HOME_LOAN_V1',
        (500000 + (i % 50) * 50000)::NUMERIC, -- Loan amounts between 5L-30L
        (60 + (i % 240)), -- Tenure 5-25 years
        CASE (i % 7)
          WHEN 0 THEN 'Draft'
          WHEN 1 THEN 'Submitted'
          WHEN 2 THEN 'InProgress'
          WHEN 3 THEN 'Approved'
          WHEN 4 THEN 'Rejected'
          WHEN 5 THEN 'PendingVerification'
          ELSE 'UnderReview'
        END,
        rm_assigned, -- Assign to RM
        now(),
        now(),
        now()
      );
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created 50 applicants and applications distributed across 4 RMs';
END $$;

-- Verify the data
DO $$
DECLARE
  rm1_count INT;
  rm2_count INT;
  rm3_count INT;
  rm4_count INT;
BEGIN
  SELECT COUNT(*) INTO rm1_count FROM applications WHERE assigned_to = '00000001-0000-0000-0000-000000000001';
  SELECT COUNT(*) INTO rm2_count FROM applications WHERE assigned_to = '00000001-0000-0000-0000-000000000002';
  SELECT COUNT(*) INTO rm3_count FROM applications WHERE assigned_to = '00000001-0000-0000-0000-000000000003';
  SELECT COUNT(*) INTO rm4_count FROM applications WHERE assigned_to = '00000001-0000-0000-0000-000000000004';
  
  RAISE NOTICE 'RM1 (rm1): % applications', rm1_count;
  RAISE NOTICE 'RM2 (rm2): % applications', rm2_count;
  RAISE NOTICE 'RM3 (rm3): % applications', rm3_count;
  RAISE NOTICE 'RM4 (rm4): % applications', rm4_count;
END $$;

