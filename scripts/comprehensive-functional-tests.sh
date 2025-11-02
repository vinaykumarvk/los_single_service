#!/bin/bash

# Comprehensive Functional Test Suite for LoS Application
# Tests all functional features including hierarchical dashboards

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_URL="${APP_URL:-http://localhost:3001}"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"

PASSED=0
FAILED=0

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Comprehensive Functional Test Suite        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Get user IDs
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" 2>/dev/null | tr -d ' ')
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" 2>/dev/null | tr -d ' ')
RH_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'regional_head1';" 2>/dev/null | tr -d ' ')

if [ -z "$RM1_ID" ] || [ -z "$SRM1_ID" ] || [ -z "$RH_ID" ]; then
    echo -e "${RED}❌ Could not retrieve user IDs${NC}"
    exit 1
fi

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected=$3
    
    echo -n "Testing: $name... "
    RESPONSE=$(curl -s "$url" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "   Response: ${RESPONSE:0:100}..."
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# ============================================
# TEST GROUP 1: Health Checks
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 1: Service Health Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

test_endpoint "Application Service Health" "$APP_URL/health" "OK"
test_endpoint "Gateway Health" "$GATEWAY_URL/health" "OK" || echo "   (Gateway may require auth)"

# ============================================
# TEST GROUP 2: Hierarchical Dashboards
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 2: Hierarchical Dashboards${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 2.1: RM Dashboard
echo -n "Testing: RM Dashboard (Individual)... "
RESPONSE=$(curl -s "$APP_URL/api/dashboard/rm/${RM1_ID}")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') is not None else 1)" 2>/dev/null; then
    TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASSED${NC} (Total: $TOTAL apps)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.2: SRM Dashboard
echo -n "Testing: SRM Dashboard (Aggregated)... "
RESPONSE=$(curl -s "$APP_URL/api/dashboard/srm/${SRM1_ID}?includeReportees=true")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') is not None else 1)" 2>/dev/null; then
    TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")
    REPORTEES=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('reportees', [])))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASSED${NC} (Total: $TOTAL apps, Reportees: $REPORTEES)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.3: Regional Head Dashboard
echo -n "Testing: Regional Head Dashboard (Full Aggregation)... "
RESPONSE=$(curl -s "$APP_URL/api/dashboard/regional-head/${RH_ID}?includeReportees=true")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('totalApplications') is not None else 1)" 2>/dev/null; then
    TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")
    SRMS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('reportees', [])))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASSED${NC} (Total: $TOTAL apps, SRMs: $SRMS)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 2.4: Drill-Down API
echo -n "Testing: Drill-Down API (Hierarchy Navigation)... "
RESPONSE=$(curl -s "$APP_URL/api/hierarchy/reportees/${SRM1_ID}")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('reportees') is not None else 1)" 2>/dev/null; then
    COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('reportees', [])))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASSED${NC} (Reportees: $COUNT)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# ============================================
# TEST GROUP 3: Dynamic Mapping
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 3: Dynamic Mapping Changes${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SRM2_ID=$(psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm2';" 2>/dev/null | tr -d ' ')

echo "Testing: Dynamic Mapping (RM reassignment)... "
BEFORE_SRM1=$(curl -s "$APP_URL/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")
BEFORE_SRM2=$(curl -s "$APP_URL/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")

# Change mapping using psql (local database)
psql -U los -d los -c "UPDATE users SET reports_to = '${SRM2_ID}' WHERE user_id = '${RM1_ID}';" > /dev/null 2>&1
sleep 2

AFTER_SRM1=$(curl -s "$APP_URL/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")
AFTER_SRM2=$(curl -s "$APP_URL/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('totalApplications', 0))" 2>/dev/null || echo "0")

if [ "$AFTER_SRM1" != "$BEFORE_SRM1" ] || [ "$AFTER_SRM2" != "$BEFORE_SRM2" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (SRM1: $BEFORE_SRM1 → $AFTER_SRM1, SRM2: $BEFORE_SRM2 → $AFTER_SRM2)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (No change detected: SRM1=$BEFORE_SRM1→$AFTER_SRM1, SRM2=$BEFORE_SRM2→$AFTER_SRM2)"
    FAILED=$((FAILED + 1))
fi

# Restore
psql -U los -d los -c "UPDATE users SET reports_to = '${SRM1_ID}' WHERE user_id = '${RM1_ID}';" > /dev/null 2>&1

# ============================================
# TEST GROUP 4: Core Application Features
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 4: Core Application Features${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 4.1: List Applications
echo -n "Testing: List Applications API... "
RESPONSE=$(curl -s "$APP_URL/api/applications?limit=5")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('applications') is not None else 1)" 2>/dev/null; then
    COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('applications', [])))" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ PASSED${NC} (Returned $COUNT applications)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 4.2: Get Single Application
APPLICATION_ID=$(psql -U los -d los -t -c "SELECT application_id FROM applications LIMIT 1;" 2>/dev/null | tr -d ' ')
if [ -n "$APPLICATION_ID" ]; then
    echo -n "Testing: Get Application by ID... "
    RESPONSE=$(curl -s "$APP_URL/api/applications/${APPLICATION_ID}")
    if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('application_id') is not None else 1)" 2>/dev/null; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAILED${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "${YELLOW}⚠️  No applications found to test${NC}"
fi

# Test 4.3: Application Filters
echo -n "Testing: Application Filters... "
RESPONSE=$(curl -s "$APP_URL/api/applications?status=Draft&limit=5")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('applications') is not None else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# Test 4.4: Pagination
echo -n "Testing: Pagination... "
RESPONSE=$(curl -s "$APP_URL/api/applications?page=1&limit=10")
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); exit(0 if d.get('pagination') is not None else 1)" 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC}"
    FAILED=$((FAILED + 1))
fi

# ============================================
# TEST GROUP 5: Data Integrity
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST GROUP 5: Data Integrity${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test 5.1: Verify Hierarchy Structure
echo -n "Testing: Hierarchy Structure Integrity... "
HIERARCHY_COUNT=$(docker exec los-postgres psql -U los -d los -t -c "SELECT COUNT(*) FROM users WHERE designation IN ('Regional Head', 'Senior Relationship Manager', 'Relationship Manager');" 2>/dev/null | tr -d ' ')
if [ "$HIERARCHY_COUNT" = "14" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (14 hierarchy users)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (Found $HIERARCHY_COUNT, expected 14)"
    FAILED=$((FAILED + 1))
fi

# Test 5.2: Verify Application Distribution
echo -n "Testing: Application Distribution... "
APP_COUNT=$(psql -U los -d los -t -c "SELECT COUNT(*) FROM applications WHERE assigned_to IS NOT NULL;" 2>/dev/null | tr -d ' ')
if [ "$APP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ PASSED${NC} ($APP_COUNT applications assigned)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ FAILED${NC} (No assigned applications)"
    FAILED=$((FAILED + 1))
fi

# ============================================
# TEST SUMMARY
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    PERCENT=$((PASSED * 100 / TOTAL))
    echo -e "${BLUE}📊 Success Rate: ${PERCENT}%${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

