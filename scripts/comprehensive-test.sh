#!/bin/bash

# Comprehensive Test Suite for All Recent Fixes
# Tests all critical RM workflows

echo "=========================================="
echo "COMPREHENSIVE TEST SUITE"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Test helper function
test_case() {
    TOTAL=$((TOTAL + 1))
    echo -n "TEST $TOTAL: $1 ... "
    if eval "$2" > /tmp/test_output.txt 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        echo "   Error: $(cat /tmp/test_output.txt | tail -3)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Service health checks
echo "=== SERVICE HEALTH CHECKS ==="
test_case "Application Service Health" "curl -s http://localhost:3001/health | grep -q OK"
test_case "KYC Service Health" "curl -s http://localhost:3003/health | grep -q OK"
test_case "Auth Service Health" "curl -s http://localhost:3016/health | grep -q OK"
test_case "Frontend Health" "curl -s http://localhost:5173 > /dev/null"

echo ""
echo "=== AUTHENTICATION TESTS ==="
# Test login
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3016/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"rm1","password":"rm1Rm@123456"}' 2>&1)
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('token', ''))" 2>/dev/null)

test_case "RM Login" "[ -n '$TOKEN' ] && [ '$TOKEN' != 'None' ]"
USER_ID="00000001-0000-0000-0000-000000000001"

echo ""
echo "=== APPLICATION CREATION & MANAGEMENT ==="

# Create test application
APP_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/applications" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{"productCode":"HOME_LOAN_V1","requestedAmount":5000000,"requestedTenureMonths":240,"channel":"Branch","applicantId":"'$USER_ID'"}' 2>&1)
APP_ID=$(echo "$APP_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('applicationId', ''))" 2>/dev/null)

test_case "Create Application" "[ -n '$APP_ID' ] && [ '$APP_ID' != 'None' ] && [ -n '$APP_ID' ]"

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    echo "$APP_ID" > /tmp/test_app_id.txt
    
    # Test application retrieval
    test_case "Get Application" "curl -s 'http://localhost:3001/api/applications/$APP_ID' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"application_id\") else 1)'"
    
    # Test applicant endpoint
    test_case "Get Applicant Data" "curl -s 'http://localhost:3001/api/applications/$APP_ID/applicant' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"data\") is not None else 1)'"
    
    # Test completeness endpoint
    test_case "Get Completeness" "curl -s 'http://localhost:3001/api/applications/$APP_ID/completeness' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"completeness\") is not None else 1)'"
fi

echo ""
echo "=== PERSONAL INFORMATION TESTS ==="

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    # Save personal information
    PERSONAL_RESPONSE=$(curl -s -X PUT "http://localhost:3003/api/applicants/$USER_ID" \
      -H "Content-Type: application/json" \
      -H "X-User-Id: $USER_ID" \
      -d '{"firstName":"Test","lastName":"User","mobile":"9876543210","email":"test@example.com","addressLine1":"123 Test St","city":"Mumbai","state":"Maharashtra","pincode":"400001","pan":"ABCDE1234F","dateOfBirth":"1990-01-01","gender":"Male","maritalStatus":"Single"}' 2>&1)
    
    test_case "Save Personal Information" "echo '$PERSONAL_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"applicantId\") or d.get(\"updated\") or \"error\" not in str(d).lower() else 1)'"
    
    # Verify personal info saved
    test_case "Retrieve Personal Information" "curl -s 'http://localhost:3003/api/applicants/$USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"first_name\") or d.get(\"firstName\") else 1)'"
fi

echo ""
echo "=== DRAFT APPLICATIONS LIST TESTS ==="

# Test draft applications list
test_case "List Draft Applications" "curl -s 'http://localhost:3001/api/applications?status=Draft&limit=10' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); apps=d.get(\"applications\", []); exit(0 if isinstance(apps, list) else 1)'"

# Test array status format
test_case "List Applications with Array Status" "curl -s 'http://localhost:3001/api/applications?status[]=Draft&limit=5' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if isinstance(d.get(\"applications\", []), list) else 1)'"

echo ""
echo "=== DOCUMENT UPLOAD TESTS ==="

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    # Create test document
    echo "test document content" > /tmp/test_doc.pdf
    
    # Upload document
    UPLOAD_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/applications/$APP_ID/documents" \
      -H "X-User-Id: $USER_ID" \
      -F "file=@/tmp/test_doc.pdf" \
      -F "documentCode=PAN" 2>&1)
    
    DOC_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('docId', ''))" 2>/dev/null)
    
    test_case "Upload Document" "[ -n '$DOC_ID' ] && [ '$DOC_ID' != 'None' ]"
    
    if [ -n "$DOC_ID" ] && [ "$DOC_ID" != "None" ]; then
        # List documents
        test_case "List Documents" "curl -s 'http://localhost:3001/api/applications/$APP_ID/documents' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); docs=d.get(\"documents\", []); exit(0 if len(docs) > 0 else 1)'"
        
        # Test download endpoint
        test_case "Get Download URL" "curl -s 'http://localhost:3001/api/documents/$DOC_ID/download' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"url\") or d.get(\"fileName\") else 1)'"
    fi
fi

echo ""
echo "=== APPLICATION SUBMISSION TESTS ==="

if [ -n "$APP_ID" ] && [ "$APP_ID" != "None" ]; then
    # Submit application
    SUBMIT_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/applications/$APP_ID/submit" \
      -H "Content-Type: application/json" \
      -H "X-User-Id: $USER_ID" \
      -d '{}' 2>&1)
    
    test_case "Submit Application" "echo '$SUBMIT_RESPONSE' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"status\") == \"Submitted\" or \"error\" not in str(d).lower() else 1)'"
    
    # Verify status changed
    test_case "Verify Submission Status" "curl -s 'http://localhost:3001/api/applications/$APP_ID' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); exit(0 if d.get(\"status\") == \"Submitted\" else 1)'"
fi

echo ""
echo "=== DASHBOARD TESTS ==="

test_case "Get Dashboard Stats" "curl -s 'http://localhost:3001/api/applications/rm/dashboard?userId=$USER_ID' -H 'X-User-Id: $USER_ID' | python3 -c 'import sys, json; d=json.load(sys.stdin); stats=d.get(\"stats\", {}); exit(0 if stats.get(\"total\") is not None else 1)'"

echo ""
echo "=========================================="
echo "TEST RESULTS SUMMARY"
echo "=========================================="
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi

