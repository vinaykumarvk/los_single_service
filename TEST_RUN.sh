#!/bin/bash

# Test Run Script for LOS Application
# This script runs the application and performs basic smoke tests

set -e

echo "🧪 LOS Application Test Runner"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if services are running
echo "🔍 Checking if services are running..."

check_service() {
    local name=$1
    local port=$2
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name is running on port $port${NC}"
        return 0
    else
        echo -e "${RED}✗ $name is NOT running on port $port${NC}"
        return 1
    fi
}

# Check gateway
check_service "API Gateway" 3000

# Check frontend
if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 5000${NC}"
else
    echo -e "${YELLOW}⚠ Frontend not running on port 5000${NC}"
fi

echo ""
echo "📋 Manual Testing Checklist:"
echo ""
echo "1. Frontend Access:"
echo "   - Open http://localhost:5000 in browser"
echo "   - For RM persona: http://localhost:5000/rm (or set VITE_PERSONA=rm)"
echo ""
echo "2. RM Module Tests:"
echo "   a. Navigate to Dashboard (/rm)"
echo "   b. Create new application"
echo "   c. Fill Personal Information form"
echo "   d. Fill Employment Details"
echo "   e. Fill Loan & Property Details"
echo "   f. Upload documents"
echo "   g. Verify bank account"
echo "   h. Check CIBIL"
echo "   i. Review and submit application"
echo ""
echo "3. Check Browser Console:"
echo "   - Open DevTools (F12)"
echo "   - Check for errors in Console tab"
echo "   - Check Network tab for API calls"
echo ""
echo "4. Test Fallback Integrations:"
echo "   - PAN validation (should work with fallback if API key missing)"
echo "   - Aadhaar eKYC (should work with fallback)"
echo "   - Bank verification (should work with fallback)"
echo "   - CIBIL check (should work with fallback)"
echo ""
echo "✅ For detailed checklist, see TESTING_CHECKLIST.md"

