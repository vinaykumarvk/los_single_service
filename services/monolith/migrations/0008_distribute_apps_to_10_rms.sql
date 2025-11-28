-- Distribute existing applications to 10 RMs
-- Approximately 13 applications per RM (130 total / 10 = 13 each)

UPDATE applications SET assigned_to = NULL;

-- Assign to RM1 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000001'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications ORDER BY created_at LIMIT 13
);

-- Assign to RM2 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000002'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM3 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000003'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM4 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000004'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM5 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000005'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM6 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000006'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM7 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000007'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM8 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000008'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM9 (13 apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000009'::uuid
WHERE application_id IN (
  SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 13
);

-- Assign to RM10 (remaining apps)
UPDATE applications SET assigned_to = '00000001-0000-0000-0000-000000000010'::uuid
WHERE assigned_to IS NULL;

-- Verify distribution
SELECT 
  u.username,
  u.employee_id,
  COUNT(a.application_id) as application_count
FROM users u
LEFT JOIN applications a ON u.user_id = a.assigned_to
WHERE u.username IN ('rm1', 'rm2', 'rm3', 'rm4', 'rm5', 'rm6', 'rm7', 'rm8', 'rm9', 'rm10')
GROUP BY u.username, u.employee_id
ORDER BY u.username;

