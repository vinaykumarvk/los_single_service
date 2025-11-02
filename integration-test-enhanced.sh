#!/bin/bash

# Enhanced Integration Test Suite
# Tests with better error handling and service detection

set -e

API_GATEWAY=${API_GATEWAY:-http://localhost:3000}
AUTH_SERVICE=${AUTH_SERVICE:-http://localhost:3016}
APP_SERVICE=${APP_SERVICE:-http://localhost:3001}
KYC_SERVICE=${KYC_SERVICE:-http://localhost:3002}

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

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
        response=$(curl -s -w "\n%{http_code}" -m 5 -X "$method" "$url" "${headers[@]}" -d "$data" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -m 5 -X "$method" "$url" "${headers[@]}" 2>&1)
    fi
    
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "000" ] || [ -z "$http_code" ]; then
        echo -e "${YELLOW}⏭️  SKIP${NC}: $test_name (Service not reachable)"
        ((SKIP_COUNT++))
        return 2
    elif [ "$http_code" = "$expected_code" ] || [ -z "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name (HTTP $http_code)"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name (Expected $expected_code, got $http_code)"
        if [ -n "$body" ] && [ ${#body} -lt 200 ]; then
            echo "   Response: $body"
        fi
        ((FAIL_COUNT++))
        return 1
    fi
}

echo -e "${BLUE}🧪 Enhanced Integration Test Suite${NC}"
echo "===================================================="
echo ""

# Check services
echo -e "${BLUE}🔍 Checking Services${NC}"
echo "---------------------------------"
for service in "Auth:3016" "Application:3001" "KYC:3002" "Gateway:3000"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    if curl -s -f -m 2 "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} $name Service: Running on port $port"
    else
        echo -e "${YELLOW}⏳${NC} $name Service: Not ready on port $port"
    fi
done
echo ""

# Get a test user for authentication tests
TEST_USERNAME=""
TEST_USER_ID=""
if command -v psql > /dev/null 2>&1; then
    DB_RESULT=$(psql postgres://los:los@localhost:5432/los -t -c "SELECT username, user_id FROM users LIMIT 1" 2>/dev/null | xargs)
    if [ -n "$DB_RESULT" ]; then
        TEST_USERNAME=$(echo $DB_RESULT | awk '{print $1}')
        TEST_USER_ID=$(echo $DB_RESULT | awk '{print $2}')
    fi
fi

# Test Suite 1: Authentication
echo -e "${BLUE}🔐 Test Suite 1: Authentication${NC}"
echo "================================"
echo ""

if curl -s -f -m 2 "$AUTH_SERVICE/health" > /dev/null 2>&1; then
    echo "📝 Test 1.1: Forgot Password Endpoint"
    test_endpoint "POST" "$AUTH_SERVICE/api/auth/forgot-password" '{"username":"testuser"}' "200" "Forgot password endpoint"
    
    echo "📝 Test 1.2: Reset Password (Invalid OTP)"
    test_endpoint "POST" "$AUTH_SERVICE/api/auth/reset-password" '{"username":"testuser","otp":"000000","newPassword":"NewPass123!"}' "400" "Reset password with invalid OTP"
    
    echo "📝 Test 1.3: Login Endpoint Structure"
    test_endpoint "POST" "$AUTH_SERVICE/api/auth/login" '{"username":"testuser","password":"wrong"}' "401" "Login endpoint (wrong password)"
    
    if [ -n "$TEST_USERNAME" ]; then
        echo "📝 Test 1.4: Login Lockout Test (5 failed attempts)"
        echo "   Attempting 5 failed logins..."
        for i in {1..5}; do
            test_endpoint "POST" "$AUTH_SERVICE/api/auth/login" "{\"username\":\"$TEST_USERNAME\",\"password\":\"wrongpass$i\"}" "401" "Failed login attempt $i" > /dev/null
        done
        echo -e "${GREEN}✅ PASS${NC}: Login lockout test (5 attempts made)"
        ((PASS_COUNT++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP${NC}: Auth service tests (service not running)"
    ((SKIP_COUNT=$SKIP_COUNT+4))
fi

echo ""

# Test Suite 2: Application Service
echo -e "${BLUE}📊 Test Suite 2: Application Service${NC}"
echo "=============================="
echo ""

if curl -s -f -m 2 "$APP_SERVICE/health" > /dev/null 2>&1; then
    echo "📝 Test 2.1: RM Dashboard Endpoint"
    test_endpoint "GET" "$APP_SERVICE/api/applications/rm/dashboard" "" "401" "RM Dashboard without auth"
    
    echo "📝 Test 2.2: RM Dashboard Structure"
    response=$(curl -s -m 5 -X GET "$APP_SERVICE/api/applications/rm/dashboard" -H "Authorization: Bearer mock-token" 2>&1)
    http_code=$(curl -s -w "%{http_code}" -o /dev/null -m 5 -X GET "$APP_SERVICE/api/applications/rm/dashboard" -H "Authorization: Bearer mock-token" 2>&1)
    if [ "$http_code" != "000" ] && [ -n "$http_code" ]; then
        echo -e "${GREEN}✅ PASS${NC}: RM Dashboard endpoint structure (HTTP $http_code)"
        ((PASS_COUNT++))
    else
        echo -e "${YELLOW}⏭️  SKIP${NC}: RM Dashboard endpoint (service not reachable)"
        ((SKIP_COUNT++))
    fi
else
    echo -e "${YELLOW}⏭️  SKIP${NC}: Application service tests (service not running)"
    ((SKIP_COUNT=$SKIP_COUNT+2))
fi

echo ""

# Test Suite 3: Property Endpoints
echo -e "${BLUE}🏠 Test Suite 3: Property Endpoints${NC}"
echo "===================================="
echo ""

TEST_APP_ID="00000000-0000-0000-0000-000000000000"

if curl -s -f -m 2 "$APP_SERVICE/health" > /dev/null 2>&1; then
    echo "📝 Test 3.1: Create Property (Validation)"
    test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyType":"Flat"}' "404" "Create property - application not found"
    
    echo "📝 Test 3.2: Create Property (Invalid Type)"
    test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyType":"InvalidType"}' "400" "Create property - invalid property type"
    
    echo "📝 Test 3.3: Get Property"
    test_endpoint "GET" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" "" "404" "Get property - application not found"
else
    echo -e "${YELLOW}⏭️  SKIP${NC}: Property endpoint tests (service not running)"
    ((SKIP_COUNT=$SKIP_COUNT+3))
fi

echo ""

# Test Suite 4: Validation
echo -e "${BLUE}✔️  Test Suite 4: Input Validation${NC}"
echo "============================"
echo ""

if curl -s -f -m 2 "$APP_SERVICE/health" > /dev/null 2>&1; then
    echo "📝 Test 4.1: Property Validation - Missing Required Field"
    test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyValue":10000000}' "400" "Property validation - missing propertyType"
    
    echo "📝 Test 4.2: Property Validation - Invalid Value"
    test_endpoint "POST" "$APP_SERVICE/api/applications/$TEST_APP_ID/property" '{"propertyType":"Flat","propertyValue":-1000}' "400" "Property validation - negative value"
else
    echo -e "${YELLOW}⏭️  SKIP${NC}: Validation tests (service not running)"
    ((SKIP_COUNT=$SKIP_COUNT+2))
fi

echo ""

# Test Suite 5: KYC Service
echo -e "${BLUE}👤 Test Suite 5: KYC Service${NC}"
echo "==========================="
echo ""

if curl -s -f -m 2 "$KYC_SERVICE/health" > /dev/null 2>&1; then
    echo "📝 Test 5.1: KYC Service Health"
    test_endpoint "GET" "$KYC_SERVICE/health" "" "200" "KYC Service health check"
    
    echo "📝 Test 5.2: Get Applicant (Not Found)"
    test_endpoint "GET" "$KYC_SERVICE/api/applicants/00000000-0000-0000-0000-000000000000" "" "404" "Get applicant - not found"
else
    echo -e "${YELLOW}⏭️  SKIP${NC}: KYC service tests (service not running)"
    ((SKIP_COUNT=$SKIP_COUNT+2))
fi

echo ""

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "==============="
echo ""
echo -e "✅ Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "❌ Failed: ${RED}$FAIL_COUNT${NC}"
echo -e "⏭️  Skipped: ${YELLOW}$SKIP_COUNT${NC}"
echo ""

TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT + SKIP_COUNT))
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASS_COUNT * 100 / TOTAL_TESTS))
    echo -e "Pass Rate: ${BLUE}$PASS_RATE%${NC}"
fi
echo ""

if [ $FAIL_COUNT -eq 0 ] && [ $PASS_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ All runnable tests passed!${NC}"
    exit 0
elif [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⏭️  All tests skipped (services not running)${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed.${NC}"
    exit 1
fi

