#!/bin/bash

# Comprehensive test script for file upload and download features

set -e

DOCUMENT_URL="${DOCUMENT_SERVICE_URL:-http://localhost:3004}"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
AUTH_URL="${AUTH_SERVICE_URL:-http://localhost:3016}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
TOTAL=0

print_test() {
    TOTAL=$((TOTAL + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED=$((FAILED + 1))
        if [ ! -z "$3" ]; then
            echo "  Error: $3"
        fi
    fi
}

# Check service health
check_service() {
    if curl -s -f "$1/health" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

echo "=========================================="
echo "Testing File Upload & Download Features"
echo "=========================================="
echo ""

# Check services
if ! check_service "$DOCUMENT_URL"; then
    echo -e "${RED}Document service not available at $DOCUMENT_URL${NC}"
    exit 1
fi

# Get auth token (using rm1 credentials)
echo "Getting authentication token..."
AUTH_RESPONSE=$(curl -s -X POST "$AUTH_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "rm1",
        "password": "rm1Rm@123456"
    }')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}Warning: Could not get auth token. Some tests may fail.${NC}"
    echo "  Response: $AUTH_RESPONSE"
    AUTH_HEADER=""
else
    echo "  Token obtained"
    AUTH_HEADER="Authorization: Bearer $TOKEN"
fi

# Create test application first (if needed)
echo ""
echo "Creating test application..."
# This would require application service - skip for now

# Create test files
TEST_PDF="/tmp/test_document.pdf"
TEST_JPG="/tmp/test_image.jpg"
TEST_PNG="/tmp/test_image.png"
TEST_TXT="/tmp/test_invalid.txt"

echo "Creating test files..."
echo "%PDF-1.4 Test PDF Content" > "$TEST_PDF"
echo -e "\xFF\xD8\xFF\xE0" > "$TEST_JPG"  # Minimal JPEG header
echo -e "\x89PNG\r\n\x1a\n" > "$TEST_PNG"  # Minimal PNG header
echo "Plain text file" > "$TEST_TXT"

# Test 1: Upload PDF file
echo ""
echo "=== Test 1: File Upload ==="
echo "Test 1.1: Upload PDF file"
UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER" \
    -F "file=@$TEST_PDF" \
    -F "documentCode=PAN_CARD")
HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPLOAD_RESPONSE" | head -n-1)

if echo "$RESPONSE_BODY" | grep -q '"docId"'; then
    print_test 0 "PDF upload returns docId"
    DOC_ID=$(echo "$RESPONSE_BODY" | grep -o '"docId":"[^"]*"' | cut -d'"' -f4)
elif [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "PDF upload returns 201"
    DOC_ID=$(echo "$RESPONSE_BODY" | grep -o '"doc_id":"[^"]*"' | cut -d'"' -f4 || echo "")
else
    print_test 1 "PDF upload returns docId" "HTTP $HTTP_CODE: $RESPONSE_BODY"
fi

# Test 1.2: Upload JPG file
echo "Test 1.2: Upload JPG file"
JPG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER" \
    -F "file=@$TEST_JPG" \
    -F "documentCode=AADHAAR")
HTTP_CODE=$(echo "$JPG_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "201" ] || echo "$JPG_RESPONSE" | grep -q '"docId"'; then
    print_test 0 "JPG upload succeeds"
else
    print_test 1 "JPG upload succeeds" "HTTP $HTTP_CODE"
fi

# Test 1.3: Upload PNG file
echo "Test 1.3: Upload PNG file"
PNG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER" \
    -F "file=@$TEST_PNG" \
    -F "documentCode=INCOME_PROOF")
HTTP_CODE=$(echo "$PNG_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "201" ] || echo "$PNG_RESPONSE" | grep -q '"docId"'; then
    print_test 0 "PNG upload succeeds"
else
    print_test 1 "PNG upload succeeds" "HTTP $HTTP_CODE"
fi

# Test 1.4: Invalid file type
echo "Test 1.4: Reject invalid file type"
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER" \
    -F "file=@$TEST_TXT" \
    -F "documentCode=PAN_CARD")
HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Invalid file type rejected (400)"
else
    print_test 1 "Invalid file type rejected" "HTTP $HTTP_CODE"
fi

# Test 1.5: Missing file
echo "Test 1.5: Missing file validation"
NO_FILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER" \
    -F "documentCode=PAN_CARD")
HTTP_CODE=$(echo "$NO_FILE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Missing file returns 400"
else
    print_test 1 "Missing file returns 400" "HTTP $HTTP_CODE"
fi

# Test 1.6: Missing documentCode
echo "Test 1.6: Missing documentCode validation"
NO_CODE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER" \
    -F "file=@$TEST_PDF")
HTTP_CODE=$(echo "$NO_CODE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Missing documentCode returns 400"
else
    print_test 1 "Missing documentCode returns 400" "HTTP $HTTP_CODE"
fi

# Test 2: List documents
echo ""
echo "=== Test 2: List Documents ==="
echo "Test 2.1: List documents for application"
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$DOCUMENT_URL/api/applications/TEST123/documents" \
    -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$LIST_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "List documents returns 200"
    if echo "$RESPONSE_BODY" | grep -q '"documents"'; then
        print_test 0 "List response contains documents array"
    else
        print_test 1 "List response contains documents array"
    fi
else
    print_test 1 "List documents returns 200" "HTTP $HTTP_CODE"
fi

# Test 3: Download document
echo ""
echo "=== Test 3: File Download ==="
if [ ! -z "$DOC_ID" ]; then
    echo "Test 3.1: Download document (docId: $DOC_ID)"
    DOWNLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$DOCUMENT_URL/api/documents/$DOC_ID/download" \
        -H "$AUTH_HEADER")
    HTTP_CODE=$(echo "$DOWNLOAD_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$DOWNLOAD_RESPONSE" | head -n-1)
    
    if echo "$RESPONSE_BODY" | grep -q '"url"'; then
        print_test 0 "Download returns presigned URL"
        DOWNLOAD_URL=$(echo "$RESPONSE_BODY" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
        if [ ! -z "$DOWNLOAD_URL" ]; then
            print_test 0 "Download URL is valid"
        fi
    elif [ "$HTTP_CODE" = "404" ]; then
        print_test 1 "Download document" "Document not found (may need valid application)"
    else
        print_test 1 "Download returns presigned URL" "HTTP $HTTP_CODE: $RESPONSE_BODY"
    fi
else
    echo "Test 3.1: Skipped (no docId from upload)"
    print_test 1 "Download document" "No document ID available"
fi

# Test 3.2: Invalid document ID
echo "Test 3.2: Invalid document ID"
INVALID_DOWNLOAD=$(curl -s -w "\n%{http_code}" -X GET "$DOCUMENT_URL/api/documents/invalid-doc-id/download" \
    -H "$AUTH_HEADER")
HTTP_CODE=$(echo "$INVALID_DOWNLOAD" | tail -n1)
if [ "$HTTP_CODE" = "404" ]; then
    print_test 0 "Invalid document ID returns 404"
else
    print_test 1 "Invalid document ID returns 404" "HTTP $HTTP_CODE"
fi

# Cleanup
rm -f "$TEST_PDF" "$TEST_JPG" "$TEST_PNG" "$TEST_TXT"

# Summary
echo ""
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

