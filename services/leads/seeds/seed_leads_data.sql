-- Seed data for Leads Service
-- Creates sample agencies, agents, and leads for testing

-- Seed Agencies
INSERT INTO agencies (agency_code, agency_name, contact_person, contact_mobile, contact_email, address_line1, city, state, pincode, validation_status, commission_rate, metadata)
VALUES
  ('DSA_001', 'Prime Financial Services', 'Ramesh Patel', '9876543210', 'contact@primefinancial.com', '123 Business Park', 'Mumbai', 'Maharashtra', '400053', 'Approved', 1.50, '{"established_year": 2015, "total_leads": 500}'::jsonb),
  ('DSA_002', 'FastTrack Loans', 'Sunita Desai', '9876543211', 'info@fasttrackloans.com', '456 Commercial Street', 'Bangalore', 'Karnataka', '560001', 'Approved', 1.75, '{"established_year": 2018, "total_leads": 300}'::jsonb),
  ('DSA_003', 'Credit Connect', 'Amit Verma', '9876543212', 'hello@creditconnect.in', '789 Finance Hub', 'Delhi', 'Delhi', '110001', 'Pending', 1.25, '{"established_year": 2020, "total_leads": 100}'::jsonb)
ON CONFLICT (agency_code) DO NOTHING;

-- Seed Agents (linked to approved agencies)
INSERT INTO agents (agent_code, agency_id, first_name, last_name, mobile, email, pan, validation_status, metadata)
SELECT 
  'AGENT_' || LPAD(ROW_NUMBER() OVER ()::text, 3, '0'),
  agency_id,
  CASE (ROW_NUMBER() OVER () % 3)
    WHEN 1 THEN 'Vikram'
    WHEN 2 THEN 'Priya'
    ELSE 'Raj'
  END,
  CASE (ROW_NUMBER() OVER () % 3)
    WHEN 1 THEN 'Kumar'
    WHEN 2 THEN 'Sharma'
    ELSE 'Singh'
  END,
  '98765' || LPAD((ROW_NUMBER() OVER ())::text, 5, '0'),
  'agent' || ROW_NUMBER() OVER () || '@los.local',
  'ABCDE' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0') || 'F',
  CASE WHEN agency_id IN (SELECT agency_id FROM agencies WHERE validation_status = 'Approved') THEN 'Approved' ELSE 'Pending' END,
  '{}'::jsonb
FROM agencies
WHERE validation_status = 'Approved'
LIMIT 6
ON CONFLICT (agent_code) DO NOTHING;

-- Seed Sample Leads
INSERT INTO leads (source_channel, source_reference, first_name, last_name, mobile, email, pan, requested_product_code, requested_amount, lead_status, assigned_agent_id, agency_id, notes, metadata)
SELECT 
  source_channel,
  'REF_' || LPAD(ROW_NUMBER() OVER ()::text, 6, '0'),
  CASE (ROW_NUMBER() OVER () % 5)
    WHEN 1 THEN 'Rahul'
    WHEN 2 THEN 'Sneha'
    WHEN 3 THEN 'Arjun'
    WHEN 4 THEN 'Kavita'
    ELSE 'Mohit'
  END,
  CASE (ROW_NUMBER() OVER () % 5)
    WHEN 1 THEN 'Gupta'
    WHEN 2 THEN 'Patel'
    WHEN 3 THEN 'Sharma'
    WHEN 4 THEN 'Kumar'
    ELSE 'Singh'
  END,
  '98765' || LPAD((10 + ROW_NUMBER() OVER ())::text, 5, '0'),
  'lead' || ROW_NUMBER() OVER () || '@example.com',
  'PAN' || LPAD((ROW_NUMBER() OVER ())::text, 5, '0') || 'A',
  CASE (ROW_NUMBER() OVER () % 2)
    WHEN 0 THEN 'HOME_LOAN_V1'
    ELSE 'PERSONAL_LOAN_V1'
  END,
  CASE (ROW_NUMBER() OVER () % 2)
    WHEN 0 THEN 5000000 + (ROW_NUMBER() OVER () * 500000)
    ELSE 500000 + (ROW_NUMBER() OVER () * 50000)
  END,
  CASE (ROW_NUMBER() OVER () % 6)
    WHEN 0 THEN 'New'
    WHEN 1 THEN 'Contacted'
    WHEN 2 THEN 'Qualified'
    WHEN 3 THEN 'Converted'
    WHEN 4 THEN 'Rejected'
    ELSE 'Lost'
  END,
  CASE WHEN ROW_NUMBER() OVER () % 3 = 0 THEN (SELECT agent_id FROM agents WHERE validation_status = 'Approved' LIMIT 1) ELSE NULL END,
  CASE WHEN ROW_NUMBER() OVER () % 3 = 0 THEN (SELECT agency_id FROM agencies WHERE validation_status = 'Approved' LIMIT 1) ELSE NULL END,
  CASE (ROW_NUMBER() OVER () % 3)
    WHEN 0 THEN 'Assigned to agent'
    WHEN 1 THEN 'Follow up required'
    ELSE NULL
  END,
  jsonb_build_object(
    'source_url', 'https://website.com/lead/' || ROW_NUMBER() OVER (),
    'campaign_id', 'CAMP_' || LPAD((ROW_NUMBER() OVER () % 5)::text, 3, '0')
  )
FROM (
  SELECT 'Website' as source_channel UNION ALL
  SELECT 'MobileApp' UNION ALL
  SELECT 'DSA' UNION ALL
  SELECT 'Branch' UNION ALL
  SELECT 'CallCenter'
) channels
CROSS JOIN generate_series(1, 15) as series
ON CONFLICT DO NOTHING;

