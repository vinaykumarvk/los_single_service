#!/bin/bash

# Stop Full Stack LOS Application

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Stopping Loan Origination System...${NC}"
echo ""

# Stop services
if [ -f .runtime/services-pid.txt ]; then
    PID=$(cat .runtime/services-pid.txt)
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${BLUE}Stopping backend services (PID: $PID)...${NC}"
        kill $PID 2>/dev/null || true
        echo -e "${GREEN}✅ Services stopped${NC}"
    fi
fi

# Kill any remaining pnpm dev processes
echo -e "${BLUE}Cleaning up remaining processes...${NC}"
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "ts-node-dev" 2>/dev/null || true

# Stop infrastructure
echo -e "${BLUE}Stopping infrastructure...${NC}"
cd infra
docker compose down
cd ..

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
echo -e "${BLUE}💡 To remove all data (including database):${NC}"
echo -e "   ${YELLOW}cd infra && docker compose down -v${NC}"

