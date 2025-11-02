#!/bin/bash

# Assign Applications to Different RMs
# Assigns different sets of applications to rm1, rm2, rm3

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Assigning Applications to RMs                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get RM IDs from Keycloak
echo "🔐 Getting RM user IDs from Keycloak..."
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi

get_rm_id() {
  local username=$1
  USER_DATA=$(curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=${username}" \
    -H "Authorization: Bearer ${TOKEN}")
  echo "$USER_DATA" | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users and len(users) > 0 else '')" 2>/dev/null
}

RM1_ID=$(get_rm_id "rm1")
RM2_ID=$(get_rm_id "rm2")
RM3_ID=$(get_rm_id "rm3")

if [ -z "$RM1_ID" ] || [ -z "$RM2_ID" ] || [ -z "$RM3_ID" ]; then
  echo "❌ Could not get all RM IDs. Run ./scripts/create-multiple-rms.sh first"
  exit 1
fi

echo -e "${GREEN}✅ Got RM IDs:${NC}"
echo "  RM1: ${RM1_ID}"
echo "  RM2: ${RM2_ID}"
echo "  RM3: ${RM3_ID}"
echo ""

echo -e "${BLUE}📋 Assigning applications...${NC}"

# Check total applications
TOTAL_APPS=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM applications;" 2>/dev/null | tr -d ' ')

if [ -z "$TOTAL_APPS" ] || [ "$TOTAL_APPS" = "0" ]; then
  echo -e "${YELLOW}⚠️  No applications found in database${NC}"
  echo "   Creating test applications first..."
  
  # Create some test applications
  docker exec los-postgres psql -U los -d los << 'EOF' 2>/dev/null || true
-- Create test applications if none exist
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
      app_id, customer_id, 
      CASE (i % 4) WHEN 0 THEN 'Website' WHEN 1 THEN 'MobileApp' WHEN 2 THEN 'CallCenter' ELSE 'Branch' END,
      'HOME_LOAN_V1',
      500000 + (i * 50000),
      60 + (i % 20),
      CASE (i % 6) 
        WHEN 0 THEN 'Draft'
        WHEN 1 THEN 'Submitted'
        WHEN 2 THEN 'InProgress'
        WHEN 3 THEN 'PendingVerification'
        WHEN 4 THEN 'UnderReview'
        ELSE 'Approved'
      END,
      NOW() - (i || ' days')::INTERVAL,
      NOW() - (i || ' days')::INTERVAL
    ) ON CONFLICT (application_id) DO NOTHING;
  END LOOP;
END $$;
EOF
  TOTAL_APPS=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM applications;" 2>/dev/null | tr -d ' ')
  echo -e "${GREEN}✅ Created ${TOTAL_APPS} test applications${NC}"
fi

echo -e "${BLUE}Total applications: ${TOTAL_APPS}${NC}"
echo ""

# Clear existing assignments
echo "🧹 Clearing existing assignments..."
docker exec los-postgres psql -U los -d los -c "UPDATE applications SET assigned_to = NULL;" > /dev/null 2>&1

# Assign applications to different RMs
echo "📝 Assigning applications..."

# RM1: First 10 applications
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM1_ID}' 
   WHERE application_id IN (
     SELECT application_id FROM applications 
     ORDER BY created_at 
     LIMIT 10
   );" > /dev/null 2>&1

# RM2: Next 10 applications
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM2_ID}' 
   WHERE application_id IN (
     SELECT application_id FROM applications 
     WHERE assigned_to IS NULL
     ORDER BY created_at 
     LIMIT 10
   );" > /dev/null 2>&1

# RM3: Next 10 applications
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM3_ID}' 
   WHERE application_id IN (
     SELECT application_id FROM applications 
     WHERE assigned_to IS NULL
     ORDER BY created_at 
     LIMIT 10
   );" > /dev/null 2>&1

echo -e "${GREEN}✅ Applications assigned!${NC}"
echo ""

# Show summary
echo -e "${BLUE}📊 Assignment Summary:${NC}"
docker exec los-postgres psql -U los -d los << EOF
SELECT 
  CASE 
    WHEN assigned_to = '${RM1_ID}' THEN 'RM1 (rm1)'
    WHEN assigned_to = '${RM2_ID}' THEN 'RM2 (rm2)'
    WHEN assigned_to = '${RM3_ID}' THEN 'RM3 (rm3)'
    ELSE 'Unassigned'
  END as assigned_to,
  COUNT(*) as count
FROM applications
GROUP BY assigned_to
ORDER BY assigned_to;
EOF

echo ""
echo -e "${GREEN}✅ Assignment complete!${NC}"
echo ""
echo -e "${BLUE}🧪 Testing Guide:${NC}"
echo ""
echo "1. Login as rm1 → Should see 10 applications"
echo "2. Login as rm2 → Should see 10 DIFFERENT applications"
echo "3. Login as rm3 → Should see 10 DIFFERENT applications"
echo "4. Login as admin1 → Should see ALL applications"
echo ""
echo -e "${BLUE}📋 RM User Credentials:${NC}"
echo "  RM1: rm1 / rm1"
echo "  RM2: rm2 / rm2"
echo "  RM3: rm3 / rm3"
echo ""
echo -e "${BLUE}🔍 Verify Assignment:${NC}"
echo "  docker exec los-postgres psql -U los -d los -c \"SELECT assigned_to, COUNT(*) FROM applications WHERE assigned_to IS NOT NULL GROUP BY assigned_to;\""

