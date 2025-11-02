#!/bin/bash

# Script to stop the Application Service
# Usage: ./scripts/stop-application-service.sh

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Stopping Application Service...${NC}"

# Find and kill the process
pkill -f "ts-node-dev.*application.*server.ts" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No running service found${NC}"
fi

# Also check port 3001
if lsof -ti:3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3001 still in use. Killing process...${NC}"
    kill $(lsof -ti:3001) 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ Port 3001 freed${NC}"
fi

echo ""
echo "✅ Done"

