#!/bin/bash

# Stop Monolith Service

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping LOS Monolith service...${NC}"

# Kill process from PID file
if [ -f .runtime/monolith-pid.txt ]; then
    PID=$(cat .runtime/monolith-pid.txt)
    if kill -0 $PID 2>/dev/null; then
        echo -e "${YELLOW}  Stopping process $PID...${NC}"
        kill $PID 2>/dev/null || true
    fi
    rm -f .runtime/monolith-pid.txt
fi

# Kill any remaining node/ts-node processes
echo -e "${YELLOW}  Cleaning up any remaining processes...${NC}"
pkill -f "ts-node-dev.*monolith.*server.ts" 2>/dev/null || true

echo -e "${GREEN}✅ Service stopped${NC}"

