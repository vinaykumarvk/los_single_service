#!/bin/bash

# Comprehensive Test Runner for New Application Creation
# Runs all test suites and reports results

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_TESTS=0

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Comprehensive Test Suite                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Application ID Format
echo -e "${BLUE}Test 1: Application ID Format${NC}"
TOKEN=$(curl -s -X POST http://localhost:3016/api/auth/login -H "Content-Type: application/json" -d '{"username":"rm1","password":"rm1Rm@123456"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get token${NC}"
    exit 1
fi

APPLICANT_ID=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
RESPONSE=$(curl -s -X POST http://localhost:3001/api/applications \
    -H "Content-Type: application/json" \
    -H "X-User-Id: 00000001-0000-0000-0000-000000000001" \
    -d "{\"productCode\":\"HOME_LOAN_V1\",\"requestedAmount\":500000,\"requestedTenureMonths\":240,\"channel\":\"Mobile\",\"applicantId\":\"$APPLICANT_ID\"}")

APP_ID=$(echo "$RESPONSE" | grep -o '"applicationId":"[^"]*' | cut -d'"' -f4)
if [[ "$APP_ID" =~ ^HL[0-9]{5}$ ]]; then
    echo -e "${GREEN}✅ PASS${NC}: Application ID format correct: $APP_ID"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Invalid format: $APP_ID"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Test 2: Personal Loan
echo -e "${BLUE}Test 2: Personal Loan ID Format${NC}"
APPLICANT_ID2=$(uuidgen 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
RESPONSE=$(curl -s -X POST http://localhost:3001/api/applications \
    -H "Content-Type: application/json" \
    -H "X-User-Id: 00000001-0000-0000-0000-000000000001" \
    -d "{\"productCode\":\"PERSONAL_LOAN_V1\",\"requestedAmount\":300000,\"requestedTenureMonths\":60,\"channel\":\"Online\",\"applicantId\":\"$APPLICANT_ID2\"}")

APP_ID2=$(echo "$RESPONSE" | grep -o '"applicationId":"[^"]*' | cut -d'"' -f4)
if [[ "$APP_ID2" =~ ^PL[0-9]{5}$ ]]; then
    echo -e "${GREEN}✅ PASS${NC}: Personal Loan ID: $APP_ID2"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Invalid format: $APP_ID2"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Test 3: Update Applicant
echo -e "${BLUE}Test 3: Update Applicant (Personal Info)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "http://localhost:3000/api/applicants/$APPLICANT_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"firstName\":\"John\",\"lastName\":\"Doe\",\"dateOfBirth\":\"1990-01-15\",\"mobile\":\"9876543210\"}")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Update applicant (HTTP $HTTP_CODE)"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: HTTP $HTTP_CODE"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Test 4: Get Application
echo -e "${BLUE}Test 4: Get Application Details${NC}"
RESPONSE=$(curl -s -X GET "http://localhost:3000/api/applications/$APP_ID" \
    -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$STATUS" = "Draft" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Get application (Status: $STATUS)"
    TOTAL_PASSED=$((TOTAL_PASSED + 1))
else
    echo -e "${RED}❌ FAIL${NC}: Status is $STATUS (expected Draft)"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Summary                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $TOTAL_PASSED${NC}"
echo -e "${RED}❌ Failed: $TOTAL_FAILED${NC}"
echo -e "${BLUE}📊 Total:  $TOTAL_TESTS${NC}"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! (100% pass rate)${NC}"
    exit 0
else
    PASS_RATE=$((TOTAL_PASSED * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}⚠️  Pass rate: ${PASS_RATE}%${NC}"
    exit 1
fi

