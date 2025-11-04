#!/bin/bash

# End-to-End Test Script for New Application Creation
# Tests the complete user flow through the web interface

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

WEB_URL="http://localhost:5173"
GATEWAY_URL="http://localhost:3000"
AUTH_URL="http://localhost:3016"

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

# Check if services are running
check_service() {
    local service=$1
    local url=$2
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        return 0
    else
        return 1
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   New Application Creation - E2E Tests        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check services
echo -e "${BLUE}Checking services...${NC}"
if check_service "Web" "$WEB_URL"; then
    echo -e "${GREEN}✅ Web server running${NC}"
else
    echo -e "${RED}❌ Web server not accessible${NC}"
    exit 1
fi

if check_service "Gateway" "$GATEWAY_URL/health"; then
    echo -e "${GREEN}✅ Gateway running${NC}"
else
    echo -e "${RED}❌ Gateway not accessible${NC}"
    exit 1
fi

if check_service "Auth" "$AUTH_URL/health"; then
    echo -e "${GREEN}✅ Auth service running${NC}"
else
    echo -e "${RED}❌ Auth service not accessible${NC}"
    exit 1
fi
echo ""

# Note: Full E2E testing requires browser automation (Playwright/Selenium)
# This script tests what can be tested via API/curl

echo -e "${YELLOW}Note: Full E2E testing requires browser automation.${NC}"
echo -e "${YELLOW}This script verifies service availability and basic API functionality.${NC}"
echo -e "${YELLOW}For complete E2E testing, use Playwright tests.${NC}"
echo ""

# Test 1: Web server accessible
echo -e "${BLUE}Test 1: Web Server Accessibility${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL")
if [ "$HTTP_CODE" = "200" ]; then
    print_result "TC-E2E-001: Web Server Accessible" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-E2E-001: Web Server Accessible" "FAIL" "HTTP $HTTP_CODE"
fi

# Test 2: Login endpoint accessible
echo -e "${BLUE}Test 2: Login Endpoint${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$AUTH_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"rm1","password":"test"}')
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    print_result "TC-E2E-002: Login Endpoint Accessible" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-E2E-002: Login Endpoint Accessible" "FAIL" "HTTP $HTTP_CODE"
fi

# Test 3: New Application route exists
echo -e "${BLUE}Test 3: New Application Route${NC}"
# Check if route exists by checking if we get a 200 or redirect (not 404)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/rm/applications/new" -L)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    print_result "TC-E2E-003: New Application Route" "PASS" "HTTP $HTTP_CODE"
else
    print_result "TC-E2E-003: New Application Route" "FAIL" "HTTP $HTTP_CODE"
fi

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   E2E Test Summary                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${BLUE}📊 Total:  $TOTAL${NC}"
echo ""
echo -e "${YELLOW}⚠️  For complete E2E testing, run Playwright tests:${NC}"
echo -e "   npm run test:e2e"
echo ""

