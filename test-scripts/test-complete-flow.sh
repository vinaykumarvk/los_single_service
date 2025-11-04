#!/bin/bash

# Complete End-to-End Test for New Application Creation Flow
# Tests all steps: Create → Personal → Employment → Property → Submit

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GATEWAY_URL="http://localhost:3000"
AUTH_URL="http://localhost:3016"
TEST_USER="rm1"
TEST_PASSWORD="rm1Rm@123456"

PASSED=0
FAILED=0
TOTAL=0

print_result() {
    local test_name=$1
    local status=$2
    local message=$3
    
    TOTAL=$((TOTAL + 1))
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        if [ -n "$message" ]; then
            echo -e "   $message"
        fi
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        if [ -n "$message" ]; then
            echo -e "   $message"
        fi
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

get_auth_token() {
    curl -s -X POST "$AUTH_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASSWORD\"}" | \
        grep -o '"accessToken":"[^"]*' | cut -d'"' -f4
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -n "$data" ]; then
        curl -s -X "$method" "$GATEWAY_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token" \
            -d "$data"
    else
        curl -s -X "$method" "$GATEWAY_URL$endpoint" \
            -H "Authorization: Bearer $token"
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Complete Application Creation Flow Test     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

TOKEN=$(get_auth_token)
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get auth token${NC}"
    exit 1
fi

APPLICANT_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "00000000-0000-0000-0000-000000000001")

# Step 1: Create Application
echo -e "${BLUE}Step 1: Create Application${NC}"
RESPONSE=$(api_call "POST" "/api/applications" \
    "{\"productCode\":\"HOME_LOAN_V1\",\"requestedAmount\":500000,\"requestedTenureMonths\":240,\"channel\":\"Mobile\",\"applicantId\":\"$APPLICANT_ID\"}" \
    "$TOKEN")

APP_ID=$(echo "$RESPONSE" | grep -o '"applicationId":"[^"]*' | cut -d'"' -f4)
if [[ "$APP_ID" =~ ^HL[0-9]{5}$ ]]; then
    print_result "TC-001: Create Application" "PASS" "Application ID: $APP_ID"
else
    print_result "TC-001: Create Application" "FAIL" "Response: $RESPONSE"
    exit 1
fi

# Step 2: Update Personal Information
echo -e "${BLUE}Step 2: Update Personal Information${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$GATEWAY_URL/api/applicants/$APPLICANT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"firstName\":\"John\",\"lastName\":\"Doe\",\"dateOfBirth\":\"1990-01-15\",\"gender\":\"Male\",\"maritalStatus\":\"Single\",\"mobile\":\"9876543210\",\"email\":\"john.doe@example.com\",\"addressLine1\":\"123 Main St\",\"pincode\":\"400001\",\"city\":\"Mumbai\",\"state\":\"Maharashtra\",\"pan\":\"ABCDE1234F\"}")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    print_result "TC-011: Update Personal Information" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-011: Update Personal Information" "FAIL" "HTTP $HTTP_CODE"
fi

# Step 3: Update Employment Details
echo -e "${BLUE}Step 3: Update Employment Details${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$GATEWAY_URL/api/applicants/$APPLICANT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"employmentType\":\"Salaried\",\"employerName\":\"ABC Corp\",\"monthlyIncome\":50000,\"yearsInJob\":5}")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    print_result "TC-022: Update Employment Details" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-022: Update Employment Details" "FAIL" "HTTP $HTTP_CODE"
fi

# Step 4: Save Property Details
echo -e "${BLUE}Step 4: Save Property Details${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/api/applications/$APP_ID/property" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"propertyType\":\"Flat\",\"builderName\":\"XYZ Builders\",\"projectName\":\"Green Valley\",\"propertyValue\":8000000,\"propertyAddress\":\"456 Property St\",\"propertyPincode\":\"400002\",\"propertyCity\":\"Mumbai\",\"propertyState\":\"Maharashtra\"}")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    print_result "TC-027: Save Property Details" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-027: Save Property Details" "FAIL" "HTTP $HTTP_CODE"
fi

# Step 5: Get Completeness
echo -e "${BLUE}Step 5: Check Completeness${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/api/applications/$APP_ID/completeness" \
    -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" = "200" ]; then
    print_result "TC-035: Get Completeness" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-035: Get Completeness" "FAIL" "HTTP $HTTP_CODE"
fi

# Step 6: Submit Application
echo -e "${BLUE}Step 6: Submit Application${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/api/applications/$APP_ID/submit-for-verification" \
    -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    # Verify status changed
    RESPONSE=$(api_call "GET" "/api/applications/$APP_ID" "" "$TOKEN")
    STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    if [ "$STATUS" = "Submitted" ]; then
        print_result "TC-033: Submit Application" "PASS" "Status: $STATUS"
    else
        print_result "TC-033: Submit Application" "FAIL" "Expected Submitted, got: $STATUS"
    fi
else
    print_result "TC-033: Submit Application" "FAIL" "HTTP $HTTP_CODE"
fi

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Summary                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}📊 Total:  $TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed.${NC}"
    exit 1
fi

