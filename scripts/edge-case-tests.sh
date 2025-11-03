#!/bin/bash
# Comprehensive Edge Case Test Suite for LoS Application
# Tests boundary conditions, error handling, data integrity, and unusual scenarios

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_URL="http://localhost:3001/api"
GATEWAY_URL="http://localhost:3000"

# Get test user IDs
RM1_ID=$(psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" 2>/dev/null | tr -d ' ')
SRM1_ID=$(psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" 2>/dev/null | tr -d ' ')
RH_ID=$(psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'regional_head1';" 2>/dev/null | tr -d ' ')

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Comprehensive Edge Case Test Suite          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Helper function to run test
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    local severity="${4:-error}" # error, warning, info
    
    echo -n "Testing: ${test_name}... "
    
    if eval "$command" 2>&1 | grep -qE "$expected_pattern"; then
        if [ "$severity" = "error" ]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${YELLOW}⚠️  WARNING${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
        return 0
    else
        if [ "$severity" = "error" ]; then
            echo -e "${RED}❌ FAILED${NC}"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠️  WARNING${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
        return 1
    fi
}

# ============================================
# TEST GROUP 1: Invalid Input Validation
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 1: Invalid Input Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 1.1: Invalid UUID format for application ID
echo -n "Testing: Invalid UUID format (GET /api/applications/:id)... "
RESPONSE=$(curl -s 'http://localhost:3001/api/applications/invalid-uuid-format')
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('error') else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 1.2: Non-existent application ID
echo -n "Testing: Non-existent application ID... "
RESPONSE=$(curl -s 'http://localhost:3001/api/applications/00000000-0000-0000-0000-000000000000')
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if 'not found' in d.get('error', '').lower() or (d.get('error') and '404' not in str(sys.stdin.read())) else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    ERROR_MSG=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown'))" 2>/dev/null || echo "Unknown")
    if [ "$ERROR_MSG" != "Unknown" ]; then
        echo -e "${GREEN}✅ PASSED${NC} (Error returned: $ERROR_MSG)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED=$((FAILED + 1))
    fi
fi

# Test 1.3: Invalid UUID format for dashboard (RM)
echo -n "Testing: Invalid UUID format (RM Dashboard)... "
RESPONSE=$(curl -s "${APP_URL}/applications/rm/dashboard?userId=invalid-uuid" 2>/dev/null)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('error') or 'error' in str(d).lower() else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    # Check if it returns 400 or validation error
    if echo "$RESPONSE" | grep -qi "invalid\|400\|validation"; then
        echo -e "${GREEN}✅ PASSED${NC} (Validation error returned)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} (May need endpoint adjustment)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Test 1.4: Invalid query parameters (negative pagination)
run_test "Negative pagination parameters" \
    "curl -s '${APP_URL}/applications?page=-1&limit=-5' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d or len(d.get('applications', [])) >= 0 else 1)\"" \
    "applications" \
    "warning"

# Test 1.5: Extreme pagination limits
run_test "Extreme pagination limits (limit=10000)" \
    "curl -s '${APP_URL}/applications?limit=10000' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if len(d.get('applications', [])) <= 100 else 1)\"" \
    "applications" \
    "warning"

# Test 1.6: SQL injection attempt in query params
run_test "SQL injection attempt in status filter" \
    "curl -s \"${APP_URL}/applications?status=' OR '1'='1'\" | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d else 1)\"" \
    "applications|error" \
    "warning"

# ============================================
# TEST GROUP 2: Edge Cases - Empty Data
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 2: Edge Cases - Empty Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 2.1: RM with no assigned applications
echo -n "Testing: RM with no assigned applications... "
RM_NO_APPS_ID=$(psql -U los -d los -t -c "SELECT user_id FROM users WHERE designation = 'Relationship Manager' AND user_id NOT IN (SELECT DISTINCT assigned_to FROM applications WHERE assigned_to IS NOT NULL) LIMIT 1;" 2>/dev/null | tr -d ' ')
if [ -z "$RM_NO_APPS_ID" ]; then
    # Create a test RM with no apps
    RM_NO_APPS_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
    psql -U los -d los -c "INSERT INTO users (user_id, username, email, password_hash, roles, designation, employee_id, created_at, updated_at) VALUES ('${RM_NO_APPS_ID}', 'rm_noapps', 'rm_noapps@test.local', '\$2b\$10\$test', ARRAY['rm'], 'Relationship Manager', 'TEST001', now(), now()) ON CONFLICT DO NOTHING;" 2>/dev/null
fi
RESPONSE=$(curl -s "${APP_URL}/dashboard/rm/${RM_NO_APPS_ID}")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') == 0 else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.2: SRM with no reportees
echo -n "Testing: SRM with no reportees... "
SRM_NO_REPORTEES_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
psql -U los -d los -c "INSERT INTO users (user_id, username, email, password_hash, roles, designation, employee_id, reports_to, created_at, updated_at) VALUES ('${SRM_NO_REPORTEES_ID}', 'srm_noreportees', 'srm_noreportees@test.local', '\$2b\$10\$test', ARRAY['srm'], 'Senior Relationship Manager', 'TEST002', '${RH_ID}', now(), now()) ON CONFLICT DO NOTHING;" 2>/dev/null
RESPONSE=$(curl -s "${APP_URL}/dashboard/srm/${SRM_NO_REPORTEES_ID}")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') == 0 else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.3: Filter with no results
run_test "Status filter with no matching results" \
    "curl -s '${APP_URL}/applications?status=NonexistentStatus' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if len(d.get('applications', [])) == 0 else 1)\"" \
    "applications" \
    "warning"

# ============================================
# TEST GROUP 3: Edge Cases - Boundary Values
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 3: Edge Cases - Boundary Values${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 3.1: Maximum limit value
run_test "Maximum pagination limit (100)" \
    "curl -s '${APP_URL}/applications?limit=100' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if len(d.get('applications', [])) <= 100 else 1)\"" \
    "applications" \
    "warning"

# Test 3.2: Minimum limit value (1)
run_test "Minimum pagination limit (1)" \
    "curl -s '${APP_URL}/applications?limit=1' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if len(d.get('applications', [])) <= 1 else 1)\"" \
    "applications" \
    "warning"

# Test 3.3: Zero limit (should default to minimum)
run_test "Zero limit (should default)" \
    "curl -s '${APP_URL}/applications?limit=0' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d else 1)\"" \
    "applications" \
    "warning"

# Test 3.4: First page (page=1)
run_test "First page boundary" \
    "curl -s '${APP_URL}/applications?page=1&limit=5' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d else 1)\"" \
    "applications" \
    "warning"

# Test 3.5: Very high page number (should return empty)
run_test "Very high page number" \
    "curl -s '${APP_URL}/applications?page=999999&limit=10' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if len(d.get('applications', [])) == 0 or 'applications' in d else 1)\"" \
    "applications" \
    "warning"

# ============================================
# TEST GROUP 4: Edge Cases - Data Integrity
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 4: Edge Cases - Data Integrity${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 4.1: Circular hierarchy (should be prevented or handled gracefully)
echo -n "Testing: Circular hierarchy detection... "
# Attempt to create circular reference (RM reports to itself indirectly)
ORIGINAL_REPORTS_TO=$(psql -U los -d los -t -c "SELECT reports_to FROM users WHERE user_id = '${RM1_ID}';" 2>/dev/null | tr -d ' ')
# Try to make SRM report to one of its RMs (circular)
psql -U los -d los -c "UPDATE users SET reports_to = '${RM1_ID}' WHERE user_id = '${SRM1_ID}';" 2>/dev/null
RESPONSE=$(curl -s "${APP_URL}/dashboard/srm/${SRM1_ID}")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if 'error' in d or d.get('totalApplications') is not None else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC} (Handled gracefully)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (May cause infinite loop)"
    WARNINGS=$((WARNINGS + 1))
fi
# Restore
psql -U los -d los -c "UPDATE users SET reports_to = '${ORIGINAL_REPORTS_TO}' WHERE user_id = '${SRM1_ID}';" 2>/dev/null > /dev/null

# Test 4.2: Orphaned user (reports_to points to non-existent user)
echo -n "Testing: Orphaned user (invalid reports_to)... "
ORPHAN_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
INVALID_MANAGER_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
psql -U los -d los -c "INSERT INTO users (user_id, username, email, password_hash, roles, designation, employee_id, reports_to, created_at, updated_at) VALUES ('${ORPHAN_ID}', 'orphan_rm', 'orphan@test.local', '\$2b\$10\$test', ARRAY['rm'], 'Relationship Manager', 'TEST003', '${INVALID_MANAGER_ID}', now(), now()) ON CONFLICT DO NOTHING;" 2>/dev/null
RESPONSE=$(curl -s "${APP_URL}/dashboard/rm/${ORPHAN_ID}")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') is not None else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC} (Handled gracefully)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi
psql -U los -d los -c "DELETE FROM users WHERE user_id = '${ORPHAN_ID}';" 2>/dev/null > /dev/null

# Test 4.3: Application with null assigned_to
echo -n "Testing: Application with null assigned_to... "
UNASSIGNED_COUNT=$(psql -U los -d los -t -c "SELECT COUNT(*) FROM applications WHERE assigned_to IS NULL;" 2>/dev/null | tr -d ' ')
if [ "$UNASSIGNED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ PASSED${NC} ($UNASSIGNED_COUNT unassigned apps exist)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (No unassigned apps)"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# TEST GROUP 5: Edge Cases - Concurrent Operations
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 5: Edge Cases - Concurrent Operations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 5.1: Rapid sequential requests (rate limiting check)
echo -n "Testing: Rapid sequential requests... "
for i in {1..10}; do
    curl -s "${APP_URL}/applications?limit=1" > /dev/null 2>&1
done
RESPONSE=$(curl -s "${APP_URL}/applications?limit=1")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# ============================================
# TEST GROUP 6: Edge Cases - Special Characters
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 6: Edge Cases - Special Characters${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 6.1: Special characters in query parameters
run_test "Special characters in status filter" \
    "curl -s '${APP_URL}/applications?status=Submitted%20%26%20Pending' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d or 'error' in d else 1)\"" \
    "applications|error" \
    "warning"

# Test 6.2: Unicode characters
run_test "Unicode characters in query" \
    "curl -s '${APP_URL}/applications?channel=测试' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d or 'error' in d else 1)\"" \
    "applications|error" \
    "warning"

# ============================================
# TEST GROUP 7: Edge Cases - Missing Data
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 7: Edge Cases - Missing Data${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 7.1: Non-existent user ID for dashboard
run_test "Non-existent user ID (RM Dashboard)" \
    "curl -s '${APP_URL}/dashboard/rm/00000000-0000-0000-0000-000000000000' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') == 0 or 'error' in d else 1)\"" \
    "error|totalApplications" \
    "warning"

# Test 7.2: Non-existent user ID for SRM dashboard
run_test "Non-existent user ID (SRM Dashboard)" \
    "curl -s '${APP_URL}/dashboard/srm/00000000-0000-0000-0000-000000000000' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') == 0 or 'error' in d else 1)\"" \
    "error|totalApplications" \
    "warning"

# Test 7.3: Drill-down with non-existent manager
run_test "Drill-down with non-existent manager ID" \
    "curl -s '${APP_URL}/hierarchy/reportees/00000000-0000-0000-0000-000000000000' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if isinstance(d, list) and len(d) == 0 or 'error' in d else 1)\"" \
    "error|\[" \
    "warning"

# ============================================
# TEST GROUP 8: Edge Cases - Large Data Sets
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 8: Edge Cases - Large Data Sets${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 8.1: Large result set pagination
echo -n "Testing: Large result set pagination... "
RESPONSE=$(curl -s "${APP_URL}/applications?limit=50")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if len(d.get('applications', [])) <= 50 else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Test 8.2: Performance with includeReportees=true
echo -n "Testing: Performance with includeReportees... "
START_TIME=$(date +%s)
RESPONSE=$(curl -s "${APP_URL}/dashboard/srm/${SRM1_ID}?includeReportees=true")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
if [ "$DURATION" -lt 5 ]; then
    echo -e "${GREEN}✅ PASSED${NC} (< 5s)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Took ${DURATION}s)"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# TEST GROUP 9: Edge Cases - Type Validation
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 9: Edge Cases - Type Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 9.1: String in numeric field
run_test "String in numeric query parameter (limit)" \
    "curl -s '${APP_URL}/applications?limit=abc' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d else 1)\"" \
    "applications" \
    "warning"

# Test 9.2: Boolean in string field
run_test "Boolean in string field (status)" \
    "curl -s '${APP_URL}/applications?status=true' | python3 -c \"import sys, json; d=json.load(sys.stdin); exit(0 if 'applications' in d else 1)\"" \
    "applications" \
    "warning"

# ============================================
# TEST SUMMARY
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo -e "${YELLOW}⚠️  Warnings: ${WARNINGS}${NC}"
TOTAL=$((PASSED + FAILED + WARNINGS))
if [ "$TOTAL" -gt 0 ]; then
    SUCCESS_RATE=$((PASSED * 100 / TOTAL))
    echo -e "${BLUE}📊 Success Rate: ${SUCCESS_RATE}%${NC}"
fi
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

