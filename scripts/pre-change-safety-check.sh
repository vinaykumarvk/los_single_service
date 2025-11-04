#!/bin/bash

# Pre-Change Safety Check
# Run this BEFORE making any changes to ensure current state is working

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔍 Pre-Change Safety Check${NC}"
echo ""

FAILED=0

# Check if services are running
echo -e "${BLUE}Checking services...${NC}"
if ./scripts/verify-service-ports.sh > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Services are running${NC}"
else
    echo -e "${RED}❌ Services are not running correctly${NC}"
    FAILED=1
fi

# Check gateway routes
echo -e "${BLUE}Checking gateway routes...${NC}"
if ./scripts/audit-gateway-routes.sh > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Gateway routes are correct${NC}"
else
    echo -e "${YELLOW}⚠️  Gateway route check had warnings (may be OK)${NC}"
fi

# Check frontend build
echo -e "${BLUE}Checking frontend build...${NC}"
cd web && npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend builds successfully${NC}"
else
    echo -e "${RED}❌ Frontend has build errors${NC}"
    FAILED=1
fi
cd ..

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed - safe to proceed${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed - fix issues before proceeding${NC}"
    exit 1
fi

