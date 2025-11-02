#!/bin/bash

# Complete script to assign 25-30 applications to each RM
# and leave 25-30 unassigned for admin

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Complete RM Application Assignment          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get RM IDs from Keycloak
KEYCLOAK_URL="http://localhost:8080"
REALM="los"

echo -e "${BLUE}Step 1: Getting Keycloak admin token...${NC}"
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get admin token${NC}"
  echo -e "${YELLOW}Please ensure Keycloak is running and realm 'los' exists${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Got token${NC}"
echo ""

# Get RM user IDs
echo -e "${BLUE}Step 2: Getting RM user IDs...${NC}"
get_rm_id() {
  local username=$1
  USER_DATA=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  echo "$USER_DATA" | python3 -c "
import sys, json
try:
    users = json.load(sys.stdin)
    if isinstance(users, list) and len(users) > 0 and 'id' in users[0]:
        print(users[0]['id'])
    else:
        print('')
except:
    print('')
" 2>/dev/null
}

RM1_ID=$(get_rm_id "rm1")
RM2_ID=$(get_rm_id "rm2")
RM3_ID=$(get_rm_id "rm3")

if [ -z "$RM1_ID" ] || [ -z "$RM2_ID" ] || [ -z "$RM3_ID" ]; then
  echo -e "${YELLOW}⚠️  Some RM users not found. Creating them...${NC}"
  
  # Create rm2 and rm3 if they don't exist
  if [ -z "$RM2_ID" ]; then
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"username":"rm2","email":"rm2@los.test","firstName":"John","lastName":"Smith","enabled":true,"credentials":[{"type":"password","value":"rm2","temporary":false}]}' > /dev/null 2>&1
    sleep 1
    RM2_ID=$(get_rm_id "rm2")
  fi
  
  if [ -z "$RM3_ID" ]; then
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"username":"rm3","email":"rm3@los.test","firstName":"Sarah","lastName":"Johnson","enabled":true,"credentials":[{"type":"password","value":"rm3","temporary":false}]}' > /dev/null 2>&1
    sleep 1
    RM3_ID=$(get_rm_id "rm3")
  fi
  
  # Assign roles
  for user_id in "$RM2_ID" "$RM3_ID"; do
    if [ -n "$user_id" ]; then
      ROLE_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${REALM}/roles/rm" \
        -H "Authorization: Bearer ${TOKEN}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)
      if [ -n "$ROLE_ID" ]; then
        curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user_id}/role-mappings/realm" \
          -H "Authorization: Bearer ${TOKEN}" \
          -H "Content-Type: application/json" \
          -d "[{\"id\":\"${ROLE_ID}\",\"name\":\"rm\"}]" > /dev/null 2>&1
      fi
    fi
  done
fi

if [ -z "$RM1_ID" ] || [ -z "$RM2_ID" ] || [ -z "$RM3_ID" ]; then
  echo -e "${RED}❌ Could not get/create all RM users${NC}"
  echo -e "${YELLOW}Please check Keycloak configuration${NC}"
  exit 1
fi

echo -e "${GREEN}✅ RM1 ID: ${RM1_ID:0:36}...${NC}"
echo -e "${GREEN}✅ RM2 ID: ${RM2_ID:0:36}...${NC}"
echo -e "${GREEN}✅ RM3 ID: ${RM3_ID:0:36}...${NC}"
echo ""

# Check total applications
echo -e "${BLUE}Step 3: Checking applications...${NC}"
TOTAL=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM applications;" 2>/dev/null | tr -d ' ')

if [ -z "$TOTAL" ] || [ "$TOTAL" = "0" ]; then
  echo -e "${YELLOW}⚠️  No applications found. Creating 100 test applications...${NC}"
  docker exec los-postgres psql -U los -d los << 'EOF' > /dev/null 2>&1
DO $$
DECLARE
  i INTEGER;
  app_id UUID;
  customer_id UUID;
BEGIN
  FOR i IN 1..100 LOOP
    app_id := gen_random_uuid();
    customer_id := gen_random_uuid();
    INSERT INTO applications (
      application_id, applicant_id, channel, product_code,
      requested_amount, requested_tenure_months, status, created_at, updated_at
    ) VALUES (
      app_id, customer_id,
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
  TOTAL=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM applications;" 2>/dev/null | tr -d ' ')
  echo -e "${GREEN}✅ Created ${TOTAL} applications${NC}"
else
  echo -e "${GREEN}✅ Found ${TOTAL} existing applications${NC}"
fi

echo ""

# Assign applications (27 per RM, leaving rest unassigned)
echo -e "${BLUE}Step 4: Assigning 27 applications to each RM...${NC}"
docker exec los-postgres psql -U los -d los -c "UPDATE applications SET assigned_to = NULL;" > /dev/null 2>&1

# Assign to RM1
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM1_ID}' WHERE application_id IN (SELECT application_id FROM applications ORDER BY created_at LIMIT 27);" > /dev/null 2>&1
echo -e "${GREEN}✅ RM1: 27 applications${NC}"

# Assign to RM2
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM2_ID}' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 27);" > /dev/null 2>&1
echo -e "${GREEN}✅ RM2: 27 applications${NC}"

# Assign to RM3
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM3_ID}' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 27);" > /dev/null 2>&1
echo -e "${GREEN}✅ RM3: 27 applications${NC}"

echo ""

# Show summary
echo -e "${BLUE}📊 Assignment Summary:${NC}"
docker exec los-postgres psql -U los -d los -c \
  "SELECT 
    CASE 
      WHEN assigned_to = '${RM1_ID}' THEN 'RM1 (rm1)'
      WHEN assigned_to = '${RM2_ID}' THEN 'RM2 (rm2)'
      WHEN assigned_to = '${RM3_ID}' THEN 'RM3 (rm3)'
      ELSE 'Unassigned (Pending Admin)'
    END as assigned_to, 
    COUNT(*) as count 
  FROM applications 
  GROUP BY assigned_to 
  ORDER BY assigned_to;" 2>/dev/null | head -10

echo ""
echo -e "${GREEN}✅ ASSIGNMENT COMPLETE!${NC}"
echo ""
echo -e "${BLUE}📋 Status:${NC}"
echo "  • RM1: 27 applications"
echo "  • RM2: 27 applications"
echo "  • RM3: 27 applications"
echo "  • Unassigned: ~19 applications (for admin to assign)"
echo ""
echo -e "${BLUE}🧪 Ready for testing!${NC}"

