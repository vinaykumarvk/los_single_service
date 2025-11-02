-- Seed hierarchical reporting structure
-- 10 RMs → 3 SRMs → 1 Regional Head
-- All aggregates computed dynamically at runtime based on reports_to mappings

-- Regional Head
INSERT INTO users (user_id, username, email, password_hash, roles, designation, employee_id, reports_to, is_active, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'regional_head1', 'regional.head1@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i', -- password: rm1
   ARRAY['regional_head', 'admin'], 'Regional Head', 'RH001', NULL, true, now(), now())
ON CONFLICT (username) DO UPDATE SET
  roles = EXCLUDED.roles,
  designation = EXCLUDED.designation,
  employee_id = EXCLUDED.employee_id,
  reports_to = EXCLUDED.reports_to;

-- 3 Senior Relationship Managers (SRMs)
INSERT INTO users (user_id, username, email, password_hash, roles, designation, employee_id, reports_to, is_active, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000010', 'srm1', 'srm1@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['srm', 'senior_relationship_manager'], 'Senior Relationship Manager', 'SRM001',
   '00000000-0000-0000-0000-000000000001', true, now(), now()),
  
  ('00000000-0000-0000-0000-000000000020', 'srm2', 'srm2@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['srm', 'senior_relationship_manager'], 'Senior Relationship Manager', 'SRM002',
   '00000000-0000-0000-0000-000000000001', true, now(), now()),
  
  ('00000000-0000-0000-0000-000000000030', 'srm3', 'srm3@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['srm', 'senior_relationship_manager'], 'Senior Relationship Manager', 'SRM003',
   '00000000-0000-0000-0000-000000000001', true, now(), now())
ON CONFLICT (username) DO UPDATE SET
  roles = EXCLUDED.roles,
  designation = EXCLUDED.designation,
  employee_id = EXCLUDED.employee_id,
  reports_to = EXCLUDED.reports_to;

-- 10 Relationship Managers (RMs)
-- SRM1 manages: RM1, RM2, RM3, RM4
INSERT INTO users (user_id, username, email, password_hash, roles, designation, employee_id, reports_to, is_active, created_at, updated_at)
VALUES 
  ('00000001-0000-0000-0000-000000000001', 'rm1', 'rm1@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM001',
   '00000000-0000-0000-0000-000000000010', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000002', 'rm2', 'rm2@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM002',
   '00000000-0000-0000-0000-000000000010', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000003', 'rm3', 'rm3@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM003',
   '00000000-0000-0000-0000-000000000010', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000004', 'rm4', 'rm4@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM004',
   '00000000-0000-0000-0000-000000000010', true, now(), now()),

-- SRM2 manages: RM5, RM6, RM7, RM8
  ('00000001-0000-0000-0000-000000000005', 'rm5', 'rm5@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM005',
   '00000000-0000-0000-0000-000000000020', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000006', 'rm6', 'rm6@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM006',
   '00000000-0000-0000-0000-000000000020', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000007', 'rm7', 'rm7@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM007',
   '00000000-0000-0000-0000-000000000020', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000008', 'rm8', 'rm8@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM008',
   '00000000-0000-0000-0000-000000000020', true, now(), now()),

-- SRM3 manages: RM9, RM10
  ('00000001-0000-0000-0000-000000000009', 'rm9', 'rm9@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM009',
   '00000000-0000-0000-0000-000000000030', true, now(), now()),
  
  ('00000001-0000-0000-0000-000000000010', 'rm10', 'rm10@los.local',
   '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i',
   ARRAY['rm', 'relationship_manager'], 'Relationship Manager', 'RM010',
   '00000000-0000-0000-0000-000000000030', true, now(), now())
ON CONFLICT (username) DO UPDATE SET
  roles = EXCLUDED.roles,
  designation = EXCLUDED.designation,
  employee_id = EXCLUDED.employee_id,
  reports_to = EXCLUDED.reports_to;

-- Verify hierarchy
SELECT 
  u.username,
  u.designation,
  u.employee_id,
  m.username as reports_to_username,
  m.designation as reports_to_designation
FROM users u
LEFT JOIN users m ON u.reports_to = m.user_id
WHERE u.username IN ('regional_head1', 'srm1', 'srm2', 'srm3', 'rm1', 'rm2', 'rm3', 'rm4', 'rm5', 'rm6', 'rm7', 'rm8', 'rm9', 'rm10')
ORDER BY 
  CASE 
    WHEN u.designation = 'Regional Head' THEN 1
    WHEN u.designation = 'Senior Relationship Manager' THEN 2
    WHEN u.designation = 'Relationship Manager' THEN 3
  END,
  u.username;

