#!/bin/bash

# Script to test RM services one by one
# Usage: ./scripts/test-rm-services.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Testing RM Services One by One             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to test service health
test_service() {
    local port=$1
    local name=$2
    local endpoint=${3:-"/health"}
    
    echo -e "${BLUE}Testing: $name (port $port)${NC}"
    
    # Check if port is listening
    if ! lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${RED}   ❌ Service not running on port $port${NC}"
        return 1
    fi
    
    # Try to hit health endpoint
    local url="http://localhost:$port$endpoint"
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "404" ] || [ "$response" = "401" ]; then
        echo -e "${GREEN}   ✅ Service responding (HTTP $response)${NC}"
        return 0
    elif [ "$response" = "000" ]; then
        echo -e "${YELLOW}   ⚠️  Service running but endpoint not responding${NC}"
        echo -e "${YELLOW}      (This might be OK if service is still starting)${NC}"
        return 1
    else
        echo -e "${RED}   ❌ Service returned HTTP $response${NC}"
        return 1
    fi
}

# Test services in order
PASSED=0
FAILED=0

echo -e "${BLUE}Testing Essential RM Services...${NC}"
echo ""

# 1. Gateway
echo -e "${BLUE}[1/6] Gateway Service${NC}"
if test_service 3000 "Gateway" "/health"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

# 2. Auth Service
echo -e "${BLUE}[2/6] Auth Service${NC}"
if test_service 3016 "Auth Service" "/health"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

# 3. Masters Service
echo -e "${BLUE}[3/6] Masters Service${NC}"
if test_service 3005 "Masters Service" "/health"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

# 4. Customer KYC Service
echo -e "${BLUE}[4/6] Customer KYC Service${NC}"
if test_service 3003 "Customer KYC Service" "/health"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

# 5. Application Service
echo -e "${BLUE}[5/6] Application Service${NC}"
if test_service 3001 "Application Service" "/health"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

# 6. Document Service
echo -e "${BLUE}[6/6] Document Service${NC}"
if test_service 3004 "Document Service" "/health"; then
    PASSED=$((PASSED + 1))
else
    FAILED=$((FAILED + 1))
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Test Summary                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED/6${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAILED/6${NC}"
fi
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All essential services are running!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test login: http://localhost:5173/login"
    echo "2. Test dashboard: http://localhost:5173/rm"
    echo "3. Test new application: http://localhost:5173/rm/applications/new"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some services are not responding correctly${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check service logs in /tmp/los-services/"
    echo "2. Verify services started: ./scripts/start-rm-services.sh"
    echo "3. Wait a few seconds and run this test again"
    exit 1
fi

