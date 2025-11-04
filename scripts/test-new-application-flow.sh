#!/bin/bash

# Test script for new application creation and submission flow
# This tests the complete application capture process

set -e

echo "🧪 Testing New Application Creation Flow"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
AUTH_URL="${AUTH_URL:-http://localhost:3002}"
RM_USERNAME="${RM_USERNAME:-rm1}"
RM_PASSWORD="${RM_PASSWORD:-rm1Rm@123456}"

echo "Configuration:"
echo "  Gateway: $GATEWAY_URL"
echo "  Auth: $AUTH_URL"
echo "  RM User: $RM_USERNAME"
echo ""

# Step 1: Login and get token
echo "Step 1: Login as RM..."
LOGIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$RM_USERNAME\",\"password\":\"$RM_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('accessToken', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo ""

# Step 2: Create a new application
echo "Step 2: Creating new application..."
APPLICANT_ID=$(python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "$(date +%s)")

CREATE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/applications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"applicantId\": \"$APPLICANT_ID\",
    \"channel\": \"Mobile\",
    \"productCode\": \"HOME_LOAN_V1\",
    \"requestedAmount\": 5000000,
    \"requestedTenureMonths\": 120
  }")

APPLICATION_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('applicationId', ''))" 2>/dev/null || echo "")

if [ -z "$APPLICATION_ID" ]; then
  echo -e "${RED}❌ Application creation failed${NC}"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Application created: $APPLICATION_ID${NC}"
echo ""

# Step 3: Update personal information
echo "Step 3: Updating personal information..."
PERSONAL_RESPONSE=$(curl -s -X PUT "$GATEWAY_URL/api/applications/$APPLICATION_ID/applicant" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"Applicant\",
    \"dateOfBirth\": \"1990-01-15\",
    \"gender\": \"Male\",
    \"maritalStatus\": \"Single\",
    \"mobile\": \"9876543210\",
    \"email\": \"test@example.com\",
    \"addressLine1\": \"123 Test Street\",
    \"pincode\": \"400001\",
    \"city\": \"Mumbai\",
    \"state\": \"Maharashtra\",
    \"pan\": \"ABCDE1234F\"
  }")

if echo "$PERSONAL_RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Personal information update failed${NC}"
  echo "Response: $PERSONAL_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Personal information saved${NC}"
echo ""

# Step 4: Update employment details
echo "Step 4: Updating employment details..."
EMPLOYMENT_RESPONSE=$(curl -s -X PUT "$GATEWAY_URL/api/applications/$APPLICATION_ID/applicant" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"employmentType\": \"Salaried\",
    \"employerName\": \"Test Company\",
    \"monthlyIncome\": 100000,
    \"yearsInJob\": 5
  }")

if echo "$EMPLOYMENT_RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Employment details update failed${NC}"
  echo "Response: $EMPLOYMENT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Employment details saved${NC}"
echo ""

# Step 5: Update loan/property details
echo "Step 5: Updating loan and property details..."
LOAN_RESPONSE=$(curl -s -X PUT "$GATEWAY_URL/api/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productCode\": \"HOME_LOAN_V1\",
    \"requestedAmount\": 5000000,
    \"requestedTenureMonths\": 120
  }")

if echo "$LOAN_RESPONSE" | grep -q "error"; then
  echo -e "${YELLOW}⚠️  Loan details update returned error (might be expected)${NC}"
else
  echo -e "${GREEN}✅ Loan details saved${NC}"
fi
echo ""

# Step 6: Check application status
echo "Step 6: Checking application status..."
STATUS_RESPONSE=$(curl -s -X GET "$GATEWAY_URL/api/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $TOKEN")

APPLICATION_STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', ''))" 2>/dev/null || echo "")

echo "Application Status: $APPLICATION_STATUS"
if [ "$APPLICATION_STATUS" = "Draft" ]; then
  echo -e "${GREEN}✅ Application is in Draft status${NC}"
else
  echo -e "${YELLOW}⚠️  Application status: $APPLICATION_STATUS${NC}"
fi
echo ""

# Step 7: Submit application
echo "Step 7: Submitting application for verification..."
SUBMIT_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/applications/$APPLICATION_ID/submit-for-verification" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$SUBMIT_RESPONSE" | grep -q "error"; then
  echo -e "${YELLOW}⚠️  Submission returned error (might be expected if completeness < 80%)${NC}"
  echo "Response: $SUBMIT_RESPONSE"
else
  echo -e "${GREEN}✅ Application submitted successfully${NC}"
fi
echo ""

# Step 8: Verify final status
echo "Step 8: Verifying final application status..."
FINAL_STATUS_RESPONSE=$(curl -s -X GET "$GATEWAY_URL/api/applications/$APPLICATION_ID" \
  -H "Authorization: Bearer $TOKEN")

FINAL_STATUS=$(echo "$FINAL_STATUS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', ''))" 2>/dev/null || echo "")

echo "Final Application Status: $FINAL_STATUS"
if [ "$FINAL_STATUS" = "Submitted" ]; then
  echo -e "${GREEN}✅ Application successfully submitted!${NC}"
elif [ "$FINAL_STATUS" = "Draft" ]; then
  echo -e "${YELLOW}⚠️  Application still in Draft (may need more completeness)${NC}"
else
  echo -e "${YELLOW}⚠️  Application status: $FINAL_STATUS${NC}"
fi
echo ""

# Step 9: Check dashboard
echo "Step 9: Checking RM dashboard..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$GATEWAY_URL/api/applications/rm/dashboard" \
  -H "Authorization: Bearer $TOKEN")

DASHBOARD_TOTAL=$(echo "$DASHBOARD_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); stats=data.get('stats', {}); print(stats.get('total', 0))" 2>/dev/null || echo "0")

echo "Dashboard Total Applications: $DASHBOARD_TOTAL"
if [ "$DASHBOARD_TOTAL" -gt 0 ]; then
  echo -e "${GREEN}✅ Dashboard showing applications${NC}"
else
  echo -e "${YELLOW}⚠️  Dashboard shows 0 applications${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}✅ Test Flow Completed!${NC}"
echo ""
echo "Application ID: $APPLICATION_ID"
echo "Application Status: $FINAL_STATUS"
echo ""

