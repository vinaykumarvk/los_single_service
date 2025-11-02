-- Assign first 10 applications to RM1
-- This script will be executed with the RM1 user ID as a parameter

UPDATE applications 
SET assigned_to = $1
WHERE application_id IN (
  SELECT application_id FROM applications 
  ORDER BY created_at 
  LIMIT 10
);

-- Show summary
SELECT 
  COUNT(*) FILTER (WHERE assigned_to = $1) as rm1_assigned,
  COUNT(*) FILTER (WHERE assigned_to IS NULL) as unassigned,
  COUNT(*) as total
FROM applications;

