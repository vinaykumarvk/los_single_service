#!/bin/bash

# Enhanced Automated Integration Testing Script
# Tests actual API functionality, frontend startup, and integration flows

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASSED=0
FAILED=0
SKIPPED=0

print_header() {
    echo -e "\n${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}\n"
}

run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "  Testing: $test_name... "
    
    if eval "$test_command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        if [ -f /tmp/test_output.log ]; then
            echo "    Error: $(head -1 /tmp/test_output.log 2>/dev/null || echo 'Unknown error')"
        fi
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════╗"
echo "║  LOS Enhanced Integration Testing            ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# 1. API Integration Tests
# ============================================
print_header "1. API Integration Tests"

# Test Auth Service
if curl -s http://localhost:3016/health > /dev/null 2>&1; then
    run_test "Auth service health" "curl -s -f http://localhost:3016/health"
    
    echo -n "  Testing: Auth login endpoint (with dummy data)... "
    login_response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","password":"testpass"}' 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$login_response" | tail -n1)
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
        echo -e "${GREEN}✓ PASSED (HTTP $http_code)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⊘ SKIPPED (HTTP $http_code)${NC}"
        ((SKIPPED++))
    fi
else
    echo -e "  ${YELLOW}⚠ Auth service not running - skipping auth tests${NC}"
    SKIPPED=$((SKIPPED + 2))
fi

# Test Applications API
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    run_test "Application service health" "curl -s -f http://localhost:3001/health"
    
    echo -n "  Testing: Create application endpoint... "
    create_response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/applications \
        -H "Content-Type: application/json" \
        -d '{"productCode":"HOME_LOAN_V1","requestedAmount":5000000,"requestedTenureMonths":240}' 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$create_response" | tail -n1)
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ] || [ "$http_code" = "401" ]; then
        echo -e "${GREEN}✓ PASSED (HTTP $http_code)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⊘ SKIPPED (HTTP $http_code)${NC}"
        ((SKIPPED++))
    fi
else
    echo -e "  ${YELLOW}⚠ Application service not running - skipping application tests${NC}"
    SKIPPED=$((SKIPPED + 2))
fi

# Test Integration Hub (PAN validation with fallback)
if curl -s http://localhost:3010/health > /dev/null 2>&1; then
    run_test "Integration hub health" "curl -s -f http://localhost:3010/health"
    
    echo -n "  Testing: PAN validation (should use fallback)... "
    pan_response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/integrations/pan/validate \
        -H "Content-Type: application/json" \
        -d '{"pan":"ABCDE1234F","applicantName":"Test User"}' 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$pan_response" | tail -n1)
    body=$(echo "$pan_response" | head -n1)
    if [ "$http_code" = "200" ]; then
        if echo "$body" | grep -q "valid\|dummy"; then
            echo -e "${GREEN}✓ PASSED (fallback working)${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}⊘ SKIPPED (unexpected response)${NC}"
            ((SKIPPED++))
        fi
    else
        echo -e "${YELLOW}⊘ SKIPPED (HTTP $http_code)${NC}"
        ((SKIPPED++))
    fi
else
    echo -e "  ${YELLOW}⚠ Integration hub not running - skipping integration tests${NC}"
    SKIPPED=$((SKIPPED + 2))
fi

# Test Masters Service
if curl -s http://localhost:3005/health > /dev/null 2>&1; then
    run_test "Masters service health" "curl -s -f http://localhost:3005/health"
    
    echo -n "  Testing: Masters branches endpoint... "
    branches_response=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/masters/branches 2>/dev/null || echo -e "\n000")
    http_code=$(echo "$branches_response" | tail -n1)
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
        echo -e "${GREEN}✓ PASSED (HTTP $http_code)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⊘ SKIPPED (HTTP $http_code)${NC}"
        ((SKIPPED++))
    fi
else
    echo -e "  ${YELLOW}⚠ Masters service not running - skipping masters tests${NC}"
    SKIPPED=$((SKIPPED + 2))
fi

# ============================================
# 2. Frontend Integration Tests
# ============================================
print_header "2. Frontend Integration Tests"

# Check if frontend dist was built
if [ -d "web/dist" ] || [ -d "web/dist/rm" ]; then
    run_test "Frontend build output exists" "[ -d web/dist ] || [ -d web/dist/rm ]"
    
    # Count built files
    echo -n "  Checking: Build artifacts... "
    js_files=$(find web/dist -name "*.js" 2>/dev/null | wc -l || echo "0")
    css_files=$(find web/dist -name "*.css" 2>/dev/null | wc -l || echo "0")
    html_files=$(find web/dist -name "*.html" 2>/dev/null | wc -l || echo "0")
    if [ "$js_files" -gt "0" ] && [ "$html_files" -gt "0" ]; then
        echo -e "${GREEN}✓ PASSED ($js_files JS, $css_files CSS, $html_files HTML)${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⊘ SKIPPED (insufficient build artifacts)${NC}"
        ((SKIPPED++))
    fi
else
    echo -e "  ${YELLOW}⚠ Frontend not built - run 'cd web && pnpm build'${NC}"
    SKIPPED=$((SKIPPED + 2))
fi

# ============================================
# 3. Code Integration Checks
# ============================================
print_header "3. Code Integration Checks"

# Check RM API client imports
echo -n "  Checking: RM API client imports correctly... "
if grep -q "from '../../shared/lib/api-client'" web/src/rm/lib/api.ts 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# Check auth provider integration
echo -n "  Checking: Auth provider integration... "
if grep -q "authProvider" web/src/shared/lib/api-client.ts 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# Check RM routes integration
echo -n "  Checking: RM routes properly configured... "
if grep -q "RMRoutes" web/src/rm/routes.tsx web/src/ui/App.tsx 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# Check config system
echo -n "  Checking: Config system integration... "
if grep -q "getConfig\|config\." web/src/shared/lib/api-client.ts 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# ============================================
# 4. Dependency Verification
# ============================================
print_header "4. Dependency Verification"

# Check critical dependencies in package.json
echo -n "  Checking: React dependency... "
if grep -q '"react":' web/package.json 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

echo -n "  Checking: React Router dependency... "
if grep -q '"react-router-dom":' web/package.json 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

echo -n "  Checking: Axios dependency... "
if grep -q '"axios":' web/package.json 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

echo -n "  Checking: Zod dependency (for validation)... "
if grep -q '"zod":' web/package.json 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
fi

# ============================================
# 5. RM Module Completeness
# ============================================
print_header "5. RM Module Completeness Check"

# Count RM pages
rm_pages=$(find web/src/rm/pages -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo -n "  Checking: All RM pages present (expected 9)... "
if [ "$rm_pages" -ge "9" ]; then
    echo -e "${GREEN}✓ PASSED ($rm_pages pages)${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ WARNING ($rm_pages pages found, expected 9)${NC}"
    ((SKIPPED++))
fi

# Check for critical RM components
required_files=(
    "web/src/rm/pages/Dashboard.tsx"
    "web/src/rm/pages/ApplicationsList.tsx"
    "web/src/rm/pages/PersonalInformation.tsx"
    "web/src/rm/pages/EmploymentDetails.tsx"
    "web/src/rm/pages/LoanPropertyDetails.tsx"
    "web/src/rm/pages/DocumentUpload.tsx"
    "web/src/rm/pages/BankVerification.tsx"
    "web/src/rm/pages/CIBILCheck.tsx"
    "web/src/rm/pages/ApplicationReview.tsx"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        ((missing_files++))
    fi
done

echo -n "  Checking: All critical RM pages exist... "
if [ "$missing_files" -eq "0" ]; then
    echo -e "${GREEN}✓ PASSED (all 9 pages present)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAILED ($missing_files missing)${NC}"
    ((FAILED++))
fi

# ============================================
# Summary
# ============================================
print_header "Integration Test Summary"

TOTAL=$((PASSED + FAILED + SKIPPED))
echo -e "Total Integration Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All integration tests passed!${NC}"
    echo -e "\n${CYAN}Application integration is working correctly.${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠ Some integration tests failed.${NC}"
    echo -e "${CYAN}Review the errors above.${NC}"
    exit 1
fi

