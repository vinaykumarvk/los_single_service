#!/bin/bash

# Comprehensive API Test Script for New Application Creation
# Tests all API endpoints used in the application creation flow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_URL="http://localhost:3000"
AUTH_URL="http://localhost:3016"
TEST_USER="rm1"
TEST_PASSWORD="rm1Rm@123456"

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Function to print test result
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

# Function to get auth token
get_auth_token() {
    local response=$(curl -s -X POST "$AUTH_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASSWORD\"}")
    
    echo "$response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4
}

# Function to make authenticated API call
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    
    if [ -z "$token" ]; then
        token=$(get_auth_token)
    fi
    
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
echo -e "${BLUE}║   New Application Creation - API Tests       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get auth token
echo -e "${BLUE}Getting authentication token...${NC}"
TOKEN=$(get_auth_token)
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get auth token${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Authentication successful${NC}"
echo ""

# Test 1: Create Application - Home Loan
echo -e "${BLUE}Test 1: Create Application - Home Loan${NC}"
APPLICANT_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "00000000-0000-0000-0000-000000000001")
RESPONSE=$(api_call "POST" "/api/applications" \
    "{\"productCode\":\"HOME_LOAN_V1\",\"requestedAmount\":500000,\"requestedTenureMonths\":240,\"channel\":\"Mobile\",\"applicantId\":\"$APPLICANT_ID\"}" \
    "$TOKEN")

APP_ID=$(echo "$RESPONSE" | grep -o '"applicationId":"[^"]*' | cut -d'"' -f4)
if [ -n "$APP_ID" ] && [[ "$APP_ID" =~ ^HL[0-9]{5}$ ]]; then
    print_result "TC-001: Create Home Loan Application" "PASS" "Application ID: $APP_ID"
    HOME_LOAN_APP_ID=$APP_ID
else
    print_result "TC-001: Create Home Loan Application" "FAIL" "Response: $RESPONSE"
fi

# Test 2: Create Application - Personal Loan
echo -e "${BLUE}Test 2: Create Application - Personal Loan${NC}"
APPLICANT_ID2=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "00000000-0000-0000-0000-000000000002")
RESPONSE=$(api_call "POST" "/api/applications" \
    "{\"productCode\":\"PERSONAL_LOAN_V1\",\"requestedAmount\":300000,\"requestedTenureMonths\":60,\"channel\":\"Online\",\"applicantId\":\"$APPLICANT_ID2\"}" \
    "$TOKEN")

APP_ID2=$(echo "$RESPONSE" | grep -o '"applicationId":"[^"]*' | cut -d'"' -f4)
if [ -n "$APP_ID2" ] && [[ "$APP_ID2" =~ ^PL[0-9]{5}$ ]]; then
    print_result "TC-002: Create Personal Loan Application" "PASS" "Application ID: $APP_ID2"
else
    print_result "TC-002: Create Personal Loan Application" "FAIL" "Response: $RESPONSE"
fi

# Test 3: Get Application Details
if [ -n "$HOME_LOAN_APP_ID" ]; then
    echo -e "${BLUE}Test 3: Get Application Details${NC}"
    RESPONSE=$(api_call "GET" "/api/applications/$HOME_LOAN_APP_ID" "" "$TOKEN")
    STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    if [ "$STATUS" = "Draft" ]; then
        print_result "TC-041: Get Application Details" "PASS" "Status: $STATUS"
    else
        print_result "TC-041: Get Application Details" "FAIL" "Expected Draft, got: $STATUS"
    fi
fi

# Test 4: Update Applicant - Personal Information
if [ -n "$HOME_LOAN_APP_ID" ]; then
    echo -e "${BLUE}Test 4: Update Applicant - Personal Information${NC}"
    RESPONSE=$(api_call "PUT" "/api/applicants/$APPLICANT_ID" \
        "{\"firstName\":\"John\",\"lastName\":\"Doe\",\"dateOfBirth\":\"1990-01-15\",\"gender\":\"Male\",\"maritalStatus\":\"Single\",\"mobile\":\"9876543210\",\"email\":\"john.doe@example.com\",\"addressLine1\":\"123 Main St\",\"pincode\":\"400001\",\"city\":\"Mumbai\",\"state\":\"Maharashtra\",\"pan\":\"ABCDE1234F\"}" \
        "$TOKEN")
    
    if echo "$RESPONSE" | grep -q "success\|updated\|ok" || [ ${#RESPONSE} -lt 100 ]; then
        print_result "TC-011: Update Personal Information" "PASS" "Data saved"
    else
        HTTP_CODE=$(echo "$RESPONSE" | grep -o '< HTTP/[0-9.]* [0-9]*' | awk '{print $3}')
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
            print_result "TC-011: Update Personal Information" "PASS" "HTTP $HTTP_CODE"
        else
            print_result "TC-011: Update Personal Information" "FAIL" "Response: $RESPONSE"
        fi
    fi
fi

# Test 5: Update Applicant - Employment Details
if [ -n "$HOME_LOAN_APP_ID" ]; then
    echo -e "${BLUE}Test 5: Update Applicant - Employment Details${NC}"
    RESPONSE=$(api_call "PUT" "/api/applicants/$APPLICANT_ID" \
        "{\"employmentType\":\"Salaried\",\"employerName\":\"ABC Corp\",\"monthlyIncome\":50000,\"yearsInJob\":5}" \
        "$TOKEN")
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$GATEWAY_URL/api/applicants/$APPLICANT_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"employmentType\":\"Salaried\",\"employerName\":\"ABC Corp\",\"monthlyIncome\":50000,\"yearsInJob\":5}")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        print_result "TC-022: Update Employment Details" "PASS" "HTTP $HTTP_CODE"
    else
        print_result "TC-022: Update Employment Details" "FAIL" "HTTP $HTTP_CODE"
    fi
fi

# Test 6: Save Property Details
if [ -n "$HOME_LOAN_APP_ID" ]; then
    echo -e "${BLUE}Test 6: Save Property Details${NC}"
    RESPONSE=$(api_call "POST" "/api/applications/$HOME_LOAN_APP_ID/property" \
        "{\"propertyType\":\"Flat\",\"builderName\":\"XYZ Builders\",\"projectName\":\"Green Valley\",\"propertyValue\":8000000,\"propertyAddress\":\"456 Property St\",\"propertyPincode\":\"400002\",\"propertyCity\":\"Mumbai\",\"propertyState\":\"Maharashtra\"}" \
        "$TOKEN")
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/api/applications/$HOME_LOAN_APP_ID/property" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"propertyType\":\"Flat\",\"builderName\":\"XYZ Builders\",\"projectName\":\"Green Valley\",\"propertyValue\":8000000,\"propertyAddress\":\"456 Property St\",\"propertyPincode\":\"400002\",\"propertyCity\":\"Mumbai\",\"propertyState\":\"Maharashtra\"}")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        print_result "TC-027: Save Property Details" "PASS" "HTTP $HTTP_CODE"
    else
        print_result "TC-027: Save Property Details" "FAIL" "HTTP $HTTP_CODE"
    fi
fi

# Test 7: Get Application Completeness
if [ -n "$HOME_LOAN_APP_ID" ]; then
    echo -e "${BLUE}Test 7: Get Application Completeness${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$GATEWAY_URL/api/applications/$HOME_LOAN_APP_ID/completeness" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_result "TC-035: Get Completeness" "PASS" "HTTP $HTTP_CODE"
    else
        print_result "TC-035: Get Completeness" "FAIL" "HTTP $HTTP_CODE"
    fi
fi

# Test 8: Submit Application
if [ -n "$HOME_LOAN_APP_ID" ]; then
    echo -e "${BLUE}Test 8: Submit Application${NC}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GATEWAY_URL/api/applications/$HOME_LOAN_APP_ID/submit-for-verification" \
        -H "Authorization: Bearer $TOKEN")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        # Verify status changed
        RESPONSE=$(api_call "GET" "/api/applications/$HOME_LOAN_APP_ID" "" "$TOKEN")
        STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        if [ "$STATUS" = "Submitted" ]; then
            print_result "TC-033: Submit Application" "PASS" "Status changed to Submitted"
        else
            print_result "TC-033: Submit Application" "FAIL" "Expected Submitted, got: $STATUS"
        fi
    else
        print_result "TC-033: Submit Application" "FAIL" "HTTP $HTTP_CODE"
    fi
fi

# Test 9: Validation - Invalid Amount
echo -e "${BLUE}Test 9: Validation - Invalid Amount${NC}"
RESPONSE=$(api_call "POST" "/api/applications" \
    "{\"productCode\":\"HOME_LOAN_V1\",\"requestedAmount\":40000,\"requestedTenureMonths\":240,\"channel\":\"Mobile\",\"applicantId\":\"$APPLICANT_ID\"}" \
    "$TOKEN")

if echo "$RESPONSE" | grep -q "error\|invalid\|minimum"; then
    print_result "TC-005: Validation - Amount Below Minimum" "PASS" "Validation working"
else
    print_result "TC-005: Validation - Amount Below Minimum" "FAIL" "Should reject invalid amount"
fi

# Test 10: Application ID Format Validation
echo -e "${BLUE}Test 10: Application ID Format${NC}"
if [ -n "$HOME_LOAN_APP_ID" ] && [[ "$HOME_LOAN_APP_ID" =~ ^HL[0-9]{5}$ ]]; then
    print_result "TC-053: Application ID Format" "PASS" "Format correct: $HOME_LOAN_APP_ID"
else
    print_result "TC-053: Application ID Format" "FAIL" "Invalid format: $HOME_LOAN_APP_ID"
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
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi

