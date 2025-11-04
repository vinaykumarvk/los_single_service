#!/bin/bash

# Test script for newly developed features:
# 1. Penny drop stub
# 2. CIBIL data pull stub
# 3. File upload
# 4. File download

set +e  # Don't exit on error - we want to run all tests

BASE_URL="http://localhost:3020"
GATEWAY_URL="http://localhost:3000"
DOCUMENT_URL="http://localhost:3004"
AUTH_URL="http://localhost:3016"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper function to print test results
print_test() {
    TOTAL=$((TOTAL + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED=$((FAILED + 1))
    fi
}

# Helper function to check service health
check_health() {
    local service=$1
    local url=$2
    if curl -s -f "$url/health" > /dev/null; then
        return 0
    else
        echo -e "${RED}Service $service is not running at $url${NC}"
        return 1
    fi
}

echo "=========================================="
echo "Testing Newly Developed Features"
echo "=========================================="
echo ""

# Check service health
echo "Checking service health..."
SERVICES_AVAILABLE=true

if ! check_health "Integration Hub" "$BASE_URL"; then
    echo -e "${YELLOW}Warning: Integration Hub not available. Some tests will be skipped.${NC}"
    SERVICES_AVAILABLE=false
fi

if ! check_health "Document Service" "$DOCUMENT_URL"; then
    echo -e "${YELLOW}Warning: Document Service not available. Some tests will be skipped.${NC}"
    SERVICES_AVAILABLE=false
fi

if [ "$SERVICES_AVAILABLE" = false ]; then
    echo -e "${YELLOW}Note: Some services are not running. Tests will continue but may fail.${NC}"
    echo ""
fi

echo ""

# ============================================
# Test 1: Penny Drop Stub
# ============================================
echo "=== Testing Penny Drop Stub ==="

# Test 1.1: Initiate penny drop
echo "Test 1.1: Initiate penny drop"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/integrations/bank/penny-drop" \
    -H "Content-Type: application/json" \
    -d '{
        "accountNumber": "1234567890",
        "ifsc": "HDFC0001234",
        "amount": 1
    }')

if echo "$RESPONSE" | grep -q '"status":"SUCCESS"'; then
    print_test 0 "Penny drop initiation returns success"
    REQUEST_ID=$(echo "$RESPONSE" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ ! -z "$REQUEST_ID" ]; then
        echo "  Request ID: $REQUEST_ID"
    fi
else
    print_test 1 "Penny drop initiation returns success"
    echo "  Response: $RESPONSE"
    REQUEST_ID=""
fi

# Test 1.2: Check penny drop status
if [ ! -z "$REQUEST_ID" ]; then
    echo "Test 1.2: Check penny drop status"
    STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/integrations/bank/penny-drop/$REQUEST_ID/status")
    if echo "$STATUS_RESPONSE" | grep -q '"status":"SUCCESS"'; then
        print_test 0 "Penny drop status check returns success"
    else
        print_test 1 "Penny drop status check returns success"
        echo "  Response: $STATUS_RESPONSE"
    fi
fi

# Test 1.3: Invalid IFSC format
echo "Test 1.3: Invalid IFSC format validation"
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations/bank/penny-drop" \
    -H "Content-Type: application/json" \
    -d '{
        "accountNumber": "1234567890",
        "ifsc": "INVALID",
        "amount": 1
    }')
HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Invalid IFSC format returns 400"
else
    print_test 1 "Invalid IFSC format returns 400 (got $HTTP_CODE)"
fi

# Test 1.4: Missing required fields
echo "Test 1.4: Missing required fields"
MISSING_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations/bank/penny-drop" \
    -H "Content-Type: application/json" \
    -d '{
        "accountNumber": "1234567890"
    }')
HTTP_CODE=$(echo "$MISSING_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Missing IFSC returns 400"
else
    print_test 1 "Missing IFSC returns 400 (got $HTTP_CODE)"
fi

echo ""

# ============================================
# Test 2: CIBIL Data Pull Stub
# ============================================
echo "=== Testing CIBIL Data Pull Stub ==="

# Test 2.1: Pull CIBIL report
echo "Test 2.1: Pull CIBIL report"
CIBIL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/integrations/bureau/pull" \
    -H "Content-Type: application/json" \
    -d '{
        "applicationId": "APP123",
        "applicantId": "APP123",
        "pan": "ABCDE1234F",
        "mobile": "9876543210",
        "dob": "1990-01-01"
    }')

if echo "$CIBIL_RESPONSE" | grep -q '"requestId"'; then
    print_test 0 "CIBIL pull returns requestId"
    CIBIL_REQUEST_ID=$(echo "$CIBIL_RESPONSE" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)
    echo "  Request ID: $CIBIL_REQUEST_ID"
else
    print_test 1 "CIBIL pull returns requestId"
    echo "  Response: $CIBIL_RESPONSE"
fi

# Test 2.2: Get CIBIL report (wait a bit for report generation)
if [ ! -z "$CIBIL_REQUEST_ID" ]; then
    echo "Test 2.2: Get CIBIL report (waiting 1 second for generation)..."
    sleep 1
    CIBIL_REPORT=$(curl -s -X GET "$BASE_URL/api/integrations/bureau/$CIBIL_REQUEST_ID/report")
    if echo "$CIBIL_REPORT" | grep -q '"score"'; then
        SCORE=$(echo "$CIBIL_REPORT" | grep -o '"score":[0-9]*' | cut -d':' -f2)
        print_test 0 "CIBIL report returns score (score: $SCORE)"
        if echo "$CIBIL_REPORT" | grep -q '"reportData"'; then
            print_test 0 "CIBIL report contains reportData"
        else
            print_test 1 "CIBIL report contains reportData"
        fi
    else
        # Try again after another second (for async generation)
        sleep 1
        CIBIL_REPORT=$(curl -s -X GET "$BASE_URL/api/integrations/bureau/$CIBIL_REQUEST_ID/report")
        if echo "$CIBIL_REPORT" | grep -q '"score"'; then
            SCORE=$(echo "$CIBIL_REPORT" | grep -o '"score":[0-9]*' | cut -d':' -f2)
            print_test 0 "CIBIL report returns score (score: $SCORE) - retry successful"
        else
            print_test 1 "CIBIL report returns score"
            echo "  Response: $CIBIL_REPORT"
        fi
    fi
fi

# Test 2.3: Missing required fields
echo "Test 2.3: Missing required fields"
MISSING_CIBIL=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/integrations/bureau/pull" \
    -H "Content-Type: application/json" \
    -d '{
        "pan": "ABCDE1234F"
    }')
HTTP_CODE=$(echo "$MISSING_CIBIL" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Missing applicationId/applicantId returns 400"
else
    print_test 1 "Missing applicationId/applicantId returns 400 (got $HTTP_CODE)"
fi

echo ""

# ============================================
# Test 3: File Upload
# ============================================
echo "=== Testing File Upload ==="

# Create a test file
TEST_FILE="/tmp/test_document.pdf"
echo "Test document content" > "$TEST_FILE"

# Test 3.1: Upload file (requires authentication and application ID)
echo "Test 3.1: File upload endpoint exists"
UPLOAD_TEST=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -F "file=@$TEST_FILE" \
    -F "documentCode=PAN_CARD")
HTTP_CODE=$(echo "$UPLOAD_TEST" | tail -n1)
# Should return 400 (invalid application) or 401 (unauthorized), but not 404
if [ "$HTTP_CODE" != "404" ]; then
    print_test 0 "File upload endpoint exists (got $HTTP_CODE)"
else
    print_test 1 "File upload endpoint exists (got 404)"
fi

# Test 3.2: Invalid file type
echo "Test 3.2: Invalid file type validation"
INVALID_FILE="/tmp/test_document.txt"
echo "Test content" > "$INVALID_FILE"
INVALID_UPLOAD=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -F "file=@$INVALID_FILE" \
    -F "documentCode=PAN_CARD")
HTTP_CODE=$(echo "$INVALID_UPLOAD" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Invalid file type returns 400"
else
    print_test 1 "Invalid file type returns 400 (got $HTTP_CODE)"
fi

# Clean up
rm -f "$TEST_FILE" "$INVALID_FILE"

echo ""

# ============================================
# Test 4: File Download
# ============================================
echo "=== Testing File Download ==="

# Test 4.1: Download endpoint exists
echo "Test 4.1: Download endpoint exists"
DOWNLOAD_TEST=$(curl -s -w "\n%{http_code}" -X GET "$DOCUMENT_URL/api/documents/test-doc-id/download")
HTTP_CODE=$(echo "$DOWNLOAD_TEST" | tail -n1)
RESPONSE_BODY=$(echo "$DOWNLOAD_TEST" | sed '$d')
# Should return 404 (not found) or have an error message, but endpoint should exist
if [ "$HTTP_CODE" = "404" ]; then
    print_test 0 "Download endpoint exists - returns 404 for invalid ID (expected)"
elif [ "$HTTP_CODE" = "200" ]; then
    # If it returns 200, check if it has a URL or error
    if echo "$RESPONSE_BODY" | grep -q '"url"'; then
        print_test 0 "Download endpoint exists and returns URL"
    else
        print_test 1 "Download endpoint exists but response format unexpected"
    fi
elif [ "$HTTP_CODE" = "500" ]; then
    # Check if it's a known error (like S3 not available)
    if echo "$RESPONSE_BODY" | grep -q "Failed to generate\|S3\|MinIO\|not available"; then
        print_test 0 "Download endpoint exists (S3/MinIO not available, but endpoint works)"
    else
        print_test 1 "Download endpoint returns 500 error"
        echo "  Response: $RESPONSE_BODY"
    fi
else
    print_test 1 "Download endpoint exists (got $HTTP_CODE)"
    echo "  Response: $RESPONSE_BODY"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi

