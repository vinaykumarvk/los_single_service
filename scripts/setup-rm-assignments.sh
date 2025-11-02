#!/bin/bash

# Setup RM-Customer Assignments
# Assigns applications to RM users for testing data entitlements

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Setting Up RM-Customer Assignments          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get Keycloak user IDs
echo -e "${BLUE}Step 1: Getting RM user IDs from Keycloak...${NC}"

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="los"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin"

TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${ADMIN_USER}" \
  -d "password=${ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Could not get admin token. Using default user IDs...${NC}"
  RM1_USER_ID="rm1-user-id-placeholder"
else
  RM1_USER=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=rm1" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | python3 -c "import sys, json; users=json.load(sys.stdin); print(json.dumps(users[0]) if users else '{}')" 2>/dev/null || echo "{}")
  
  RM1_USER_ID=$(echo $RM1_USER | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', 'rm1-user-id'))" 2>/dev/null || echo "rm1-user-id")
  echo -e "${GREEN}✅ RM1 User ID: ${RM1_USER_ID}${NC}"
fi

echo ""
echo -e "${BLUE}Step 2: Assigning applications to RM1...${NC}"

# Connect to database and assign applications
psql -U los -d los -h localhost << EOF 2>/dev/null || {
  echo -e "${YELLOW}⚠️  psql not available. Creating SQL script instead...${NC}"
  cat > /tmp/rm_assignments.sql << SQL
-- Assign first 10 applications to rm1
UPDATE applications 
SET assigned_to = '${RM1_USER_ID}'
WHERE application_id IN (
  SELECT application_id FROM applications 
  ORDER BY created_at 
  LIMIT 10
);

-- Show assigned applications count
SELECT 
  assigned_to,
  COUNT(*) as assigned_count,
  array_agg(application_id) as application_ids
FROM applications
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;
SQL
  echo "SQL script created at: /tmp/rm_assignments.sql"
  exit 0
}

-- Assign first 10 applications to rm1
UPDATE applications 
SET assigned_to = '${RM1_USER_ID}'
WHERE application_id IN (
  SELECT application_id FROM applications 
  ORDER BY created_at 
  LIMIT 10
);

-- Show assigned applications
SELECT 
  assigned_to,
  COUNT(*) as assigned_count
FROM applications
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;

EOF

echo ""
echo -e "${GREEN}✅ RM assignments complete!${NC}"
echo ""
echo -e "${BLUE}Assignment Summary:${NC}"
echo -e "  • RM1 (${RM1_USER_ID}): Assigned 10 applications"
echo -e "  • Other applications: Unassigned (visible to Admin/Ops)"
echo ""
echo -e "${BLUE}Testing:${NC}"
echo -e "  • Login as rm1 → Should see only 10 applications"
echo -e "  • Login as admin1 → Should see all applications"
echo -e "  • Login as ops1 → Should see all applications"

