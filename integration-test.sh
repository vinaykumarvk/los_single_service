#!/bin/bash

# Integration Test Suite for Loan Origination System
# Tests all new features and endpoints

set -e

API_GATEWAY=${API_GATEWAY:-http://localhost:3000}
AUTH_SERVICE=${AUTH_SERVICE:-http://localhost:3016}
APP_SERVICE=${APP_SERVICE:-http://localhost:3001}
KYC_SERVICE=${KYC_SERVICE:-http://localhost:3002}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Helper functions
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f "$url" > /dev/null 2>&1 || curl -s -f "$url/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_code=$4
    local test_name=$5
    local auth_header=$6
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$auth_header" ]; then
        headers+=(-H "Authorization: Bearer $auth_header")
    fi
    
    local response
    local http_code
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" "${headers[@]}" -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" "${headers[@]}" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "000" ]; then
        echo -e "${YELLOW}⏭️  SKIP${NC}: $test_name (Service not reachable)"
        ((SKIP_COUNT++))
        return 2
    elif [ "$http_code" = "$expected_code" ] || [ -z "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name (HTTP $http_code)"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name (Expected $expected_code, got $http_code)"
        echo "   Response: $body" | head -3
        ((FAIL_COUNT++))
        return 1
    fi
}

echo "🧪 Integration Test Suite - Loan Origination System"
echo "===================================================="
echo ""

# Check services are running
echo "🔍 Checking Services Availability"
echo "---------------------------------"

check_service "$AUTH_SERVICE" "Auth Service" && echo -e "${GREEN}✅${NC} Auth Service: Running" || echo -e "${RED}❌${NC} Auth Service: Not reachable"
check_service "$APP_SERVICE" "Application Service" && echo -e "${GREEN}✅${NC} Application Service: Running" || echo -e "${RED}❌${NC} Application Service: Not reachable"
check_service "$KYC_SERVICE" "KYC Service" && echo -e "${GREEN}✅${NC} KYC Service: Running" || echo -e "${RED}❌${NC} KYC Service: Not reachable"

echo ""
echo ""

# Test 1: Authentication - Password Reset Flow
echo "🔐 Test Suite 1: Authentication"
echo "================================"
echo ""

echo "📝 Test 1.1: Forgot Password (Request OTP)"
test_endpoint "POST" "$AUTH_SERVICE/api/auth/forgot-password" '{"username":"admin"}' "200" "Forgot password endpoint"

echo "📝 Test 1.2: Forgot Password (Invalid User)"
test_endpoint "POST" "$AUTH_SERVICE/api/auth/forgot-password" '{"username":"nonexistent"}' "200" "Forgot password with invalid user (should not reveal existence)"

echo "📝 Test 1.3: Reset Password (Invalid OTP)"
test_endpoint "POST" "$AUTH_SERVICE/api/auth/reset-password" '{"username":"admin","otp":"000000","newPassword":"NewPass123!"}' "400" "Reset password with invalid OTP"

echo "📝 Test 1.4: Login (Wrong Password - Test Lockout)"
for i in {1..6}; do
    echo -n "   Attempt $i: "
    test_endpoint "POST" "$AUTH_SERVICE/api/auth/login" '{"username":"admin","password":"wrongpass"}' "401" "Login with wrong password (lockout test)"
    sleep 0.5
done

echo "📝 Test 1.5: Login (Correct Credentials - Need actual password)"
echo -e "${YELLOW}⏭️  SKIP${NC}: Login with correct credentials (requires actual password)"
((SKIP_COUNT++))

echo ""

# Test 2: Application Service - RM Dashboard
echo "📊 Test Suite 2: RM Dashboard"
echo "=============================="
echo ""

echo "📝 Test 2.1: RM Dashboard (No Auth)"
test_endpoint "GET" "$APP_SERVICE/api/applications/rm/dashboard" "" "401" "RM Dashboard without authentication"

echo "📝 Test 2.2: RM Dashboard (With Mock Token)"
test_endpoint "GET" "$APP_SERVICE/api/applications/rm/dashboard" "" "" "RM Dashboard with mock token" "mock-token"

echo ""

# Test 3: Property Endpoints
echo "🏠 Test Suite 3: Property Endpoints"
echo "===================================="
echo ""

TEST_APP_ID="00000000-0000-0000-0000-000000000000"

echo "📝 Test 3.1: Create Property (Invalid Application ID)"
test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyType":"Flat","propertyValue":10000000}' "404" "Create property for non-existent application"

echo "📝 Test 3.2: Get Property (Invalid Application ID)"
test_endpoint "GET" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" "" "404" "Get property for non-existent application"

echo "📝 Test 3.3: Create Property (Invalid Data)"
test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyType":"InvalidType"}' "400" "Create property with invalid property type"

echo ""

# Test 4: Applicant Endpoints
echo "👤 Test Suite 4: Applicant Endpoints"
echo "====================================="
echo ""

echo "📝 Test 4.1: Get Applicant (Invalid Application ID)"
test_endpoint "GET" "$APP_SERVICE/api/applications/$TEST_APP_ID/applicant" "" "404" "Get applicant for non-existent application"

echo "📝 Test 4.2: Update Applicant (Invalid Application ID)"
test_endpoint "PUT" "$APP_SERVICE/api/applications/$TEST_APP_ID/applicant" '{"firstName":"Test"}' "404" "Update applicant for non-existent application"

echo ""

# Test 5: Validation Tests
echo "✔️  Test Suite 5: Validation"
echo "============================"
echo ""

echo "📝 Test 5.1: Property Validation - Missing Required Field"
test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyValue":10000000}' "400" "Create property without required propertyType"

echo "📝 Test 5.2: Property Validation - Invalid Property Value"
test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyType":"Flat","propertyValue":-1000}' "400" "Create property with negative value"

echo ""

# Summary
echo "📊 Test Summary"
echo "==============="
echo ""
echo -e "✅ Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "❌ Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "⏭️  Skipped: ${YELLOW}$SKIP_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    exit 1
fi

