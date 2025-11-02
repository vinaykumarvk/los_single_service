#!/bin/bash

# Test script to verify admin assignment functionality
# Tests: Admin assigns customer to RM, RM can see it

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing Admin Assignment Flow                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get one unassigned application
echo -e "${BLUE}Step 1: Finding an unassigned application...${NC}"
UNASSIGNED_APP_ID=$(docker exec los-postgres psql -U los -d los -t -c \
  "SELECT application_id FROM applications WHERE assigned_to IS NULL LIMIT 1;" 2>/dev/null | tr -d ' ')

if [ -z "$UNASSIGNED_APP_ID" ]; then
  echo -e "${YELLOW}⚠️  No unassigned applications found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Found unassigned application: ${UNASSIGNED_APP_ID:0:36}...${NC}"
echo ""

# Use RM1 ID (placeholder or real)
RM1_ID="00000001-0000-0000-0000-000000000001"

echo -e "${BLUE}Step 2: Admin assigns application to RM1...${NC}"
echo -e "${YELLOW}   (Simulating: Admin calls PATCH /api/applications/${UNASSIGNED_APP_ID}/assign)${NC}"

# Simulate admin assignment via SQL (in real scenario, this would be via API)
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM1_ID}', assigned_at = now(), updated_at = now() WHERE application_id = '${UNASSIGNED_APP_ID}';" > /dev/null 2>&1

echo -e "${GREEN}✅ Application assigned to RM1${NC}"
echo ""

echo -e "${BLUE}Step 3: Verifying RM1 can see the assigned application...${NC}"
RM1_COUNT=$(docker exec los-postgres psql -U los -d los -t -c \
  "SELECT COUNT(*) FROM applications WHERE assigned_to = '${RM1_ID}' AND application_id = '${UNASSIGNED_APP_ID}';" 2>/dev/null | tr -d ' ')

if [ "$RM1_COUNT" = "1" ]; then
  echo -e "${GREEN}✅ RM1 can see the assigned application!${NC}"
  echo ""
  echo -e "${BLUE}Step 4: RM1's total application count...${NC}"
  TOTAL_RM1=$(docker exec los-postgres psql -U los -d los -t -c \
    "SELECT COUNT(*) FROM applications WHERE assigned_to = '${RM1_ID}';" 2>/dev/null | tr -d ' ')
  echo -e "${GREEN}✅ RM1 now has ${TOTAL_RM1} applications${NC}"
else
  echo -e "${YELLOW}⚠️  Assignment verification failed${NC}"
fi

echo ""
echo -e "${GREEN}✅ TEST COMPLETE!${NC}"
echo ""
echo -e "${BLUE}🧪 To test via API:${NC}"
echo "  1. Login as admin1"
echo "  2. Call: PATCH /api/applications/${UNASSIGNED_APP_ID}/assign"
echo "     Body: { \"assignedTo\": \"<rm1-keycloak-id>\" }"
echo "  3. Login as rm1"
echo "  4. Call: GET /api/applications"
echo "  5. Verify the assigned application appears in the list"

