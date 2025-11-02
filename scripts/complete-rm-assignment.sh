#!/bin/bash

# Complete RM Assignment Script
# Creates users if needed, gets IDs, and assigns applications

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

KEYCLOAK_URL="http://localhost:8080"
REALM="los"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Complete RM Assignment Setup                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Get admin token
echo -e "${BLUE}Step 1: Getting Keycloak admin token...${NC}"
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get admin token${NC}"
  echo -e "${YELLOW}Please check:"${NC}
  echo "  1. Keycloak is running: docker ps | grep keycloak"
  echo "  2. Admin credentials: admin/admin"
  exit 1
fi

echo -e "${GREEN}✅ Got token${NC}"
echo ""

# Step 2: Ensure roles exist
echo -e "${BLUE}Step 2: Ensuring RM roles exist...${NC}"
for role in "rm" "relationship_manager"; do
  curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/roles" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${role}\",\"description\":\"${role}\"}" > /dev/null 2>&1 || true
done
echo -e "${GREEN}✅ Roles ready${NC}"
echo ""

# Step 3: Create or get RM users
echo -e "${BLUE}Step 3: Creating/getting RM users...${NC}"

create_or_get_user() {
  local username=$1
  local password=$2
  local email=$3
  local firstName=$4
  local lastName=$5
  
  # Check if exists
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "
import sys, json
try:
    users = json.load(sys.stdin)
    if isinstance(users, list) and len(users) > 0:
        print(users[0].get('id', ''))
    else:
        print('')
except:
    print('')
" 2>/dev/null)
  
  if [ -n "$USER_ID" ]; then
    echo -e "${GREEN}  ✅ ${username} exists (ID: ${USER_ID:0:8}...)${NC}"
    echo "$USER_ID"
    return
  fi
  
  # Create user
  echo -e "${BLUE}  Creating ${username}...${NC}"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"${username}\",
      \"email\": \"${email}\",
      \"firstName\": \"${firstName}\",
      \"lastName\": \"${lastName}\",
      \"enabled\": true,
      \"credentials\": [{\"type\": \"password\", \"value\": \"${password}\", \"temporary\": false}]
    }")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "409" ]; then
    echo -e "${YELLOW}  ⚠️  Failed to create ${username} (HTTP $HTTP_CODE)${NC}"
    echo ""
    return
  fi
  
  # Get user ID
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  
  USER_ID=$(echo "$USER_DATA" | python3 -c "
import sys, json
try:
    users = json.load(sys.stdin)
    if isinstance(users, list) and len(users) > 0:
        print(users[0].get('id', ''))
    else:
        print('')
except:
    print('')
" 2>/dev/null)
  
  if [ -n "$USER_ID" ]; then
    echo -e "${GREEN}  ✅ Created (ID: ${USER_ID:0:8}...)${NC}"
    echo "$USER_ID"
  else
    echo ""
  fi
}

RM1_ID=$(create_or_get_user "rm1" "rm1" "rm1@los.test" "Relationship" "Manager")
RM2_ID=$(create_or_get_user "rm2" "rm2" "rm2@los.test" "John" "Smith")
RM3_ID=$(create_or_get_user "rm3" "rm3" "rm3@los.test" "Sarah" "Johnson")

echo ""

# Assign roles
echo -e "${BLUE}Step 4: Assigning roles...${NC}"
assign_roles() {
  local user_id=$1
  local username=$2
  
  # Get role IDs
  RM_ROLE_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/rm" \
    -H "Authorization: Bearer ${TOKEN}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
  
  if [ -n "$RM_ROLE_ID" ]; then
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user_id}/role-mappings/realm" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "[{\"id\":\"${RM_ROLE_ID}\",\"name\":\"rm\"}]" > /dev/null 2>&1
    echo -e "${GREEN}  ✅ ${username} roles assigned${NC}"
  fi
}

if [ -n "$RM1_ID" ]; then assign_roles "$RM1_ID" "rm1"; fi
if [ -n "$RM2_ID" ]; then assign_roles "$RM2_ID" "rm2"; fi
if [ -n "$RM3_ID" ]; then assign_roles "$RM3_ID" "rm3"; fi

echo ""

# Step 5: Create test applications if none exist
echo -e "${BLUE}Step 5: Checking applications...${NC}"
APP_COUNT=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM applications;" 2>/dev/null | tr -d ' ')

if [ -z "$APP_COUNT" ] || [ "$APP_COUNT" = "0" ]; then
  echo -e "${YELLOW}  No applications found. Creating 30 test applications...${NC}"
  docker exec los-postgres psql -U los -d los << 'EOF' > /dev/null 2>&1
DO $$
DECLARE
  i INTEGER;
  app_id UUID;
  customer_id UUID;
BEGIN
  FOR i IN 1..30 LOOP
    app_id := gen_random_uuid();
    customer_id := gen_random_uuid();
    
    INSERT INTO applications (
      application_id, applicant_id, channel, product_code,
      requested_amount, requested_tenure_months, status, created_at, updated_at
    ) VALUES (
      app_id, 
      customer_id, 
      CASE (i % 4) WHEN 0 THEN 'Website' WHEN 1 THEN 'MobileApp' WHEN 2 THEN 'CallCenter' ELSE 'Branch' END,
      'HOME_LOAN_V1',
      500000 + (i * 50000),
      60 + (i % 20),
      CASE (i % 6) WHEN 0 THEN 'Draft' WHEN 1 THEN 'Submitted' WHEN 2 THEN 'InProgress' WHEN 3 THEN 'PendingVerification' WHEN 4 THEN 'UnderReview' ELSE 'Approved' END,
      NOW() - (i || ' days')::INTERVAL,
      NOW() - (i || ' days')::INTERVAL
    ) ON CONFLICT (application_id) DO NOTHING;
  END LOOP;
END $$;
EOF
  APP_COUNT=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM applications;" 2>/dev/null | tr -d ' ')
  echo -e "${GREEN}  ✅ Created ${APP_COUNT} applications${NC}"
else
  echo -e "${GREEN}  ✅ Found ${APP_COUNT} existing applications${NC}"
fi

echo ""

# Step 6: Assign applications
if [ -n "$RM1_ID" ] && [ -n "$RM2_ID" ] && [ -n "$RM3_ID" ]; then
  echo -e "${BLUE}Step 6: Assigning applications to RMs...${NC}"
  
  # Clear existing
  docker exec los-postgres psql -U los -d los -c "UPDATE applications SET assigned_to = NULL;" > /dev/null 2>&1
  
  # Assign to RM1
  docker exec los-postgres psql -U los -d los -c \
    "UPDATE applications SET assigned_to = '${RM1_ID}' WHERE application_id IN (SELECT application_id FROM applications ORDER BY created_at LIMIT 10);" > /dev/null 2>&1
  echo -e "${GREEN}  ✅ RM1: 10 applications${NC}"
  
  # Assign to RM2
  docker exec los-postgres psql -U los -d los -c \
    "UPDATE applications SET assigned_to = '${RM2_ID}' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 10);" > /dev/null 2>&1
  echo -e "${GREEN}  ✅ RM2: 10 applications${NC}"
  
  # Assign to RM3
  docker exec los-postgres psql -U los -d los -c \
    "UPDATE applications SET assigned_to = '${RM3_ID}' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 10);" > /dev/null 2>&1
  echo -e "${GREEN}  ✅ RM3: 10 applications${NC}"
  
  echo ""
  echo -e "${BLUE}📊 Assignment Summary:${NC}"
  docker exec los-postgres psql -U los -d los -c \
    "SELECT 
      CASE 
        WHEN assigned_to = '${RM1_ID}' THEN 'RM1 (rm1)'
        WHEN assigned_to = '${RM2_ID}' THEN 'RM2 (rm2)'
        WHEN assigned_to = '${RM3_ID}' THEN 'RM3 (rm3)'
        ELSE 'Unassigned'
      END as assigned_to, 
      COUNT(*) as count 
    FROM applications 
    GROUP BY assigned_to 
    ORDER BY assigned_to;" 2>/dev/null | head -10
  
  echo ""
  echo -e "${GREEN}✅ ASSIGNMENT COMPLETE!${NC}"
  echo ""
  echo -e "${BLUE}🧪 Testing:${NC}"
  echo "  1. Login as rm1 → See 10 applications"
  echo "  2. Login as rm2 → See 10 different applications"
  echo "  3. Login as rm3 → See 10 different applications"
  echo "  4. Login as admin1 → See all applications"
  echo ""
  echo -e "${BLUE}🌐 Access: http://localhost:5173${NC}"
  
else
  echo -e "${RED}❌ Could not get all RM user IDs${NC}"
  echo -e "${YELLOW}Please check Keycloak is running and realm 'los' exists${NC}"
  exit 1
fi

