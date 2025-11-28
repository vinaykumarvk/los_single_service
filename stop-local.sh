#!/bin/bash

# Stop Local Development Services

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping LOS services...${NC}"

# Kill processes from PID file
if [ -f .runtime/pids.txt ]; then
    PIDS=$(cat .runtime/pids.txt)
    for PID in $PIDS; do
        if kill -0 $PID 2>/dev/null; then
            echo -e "${YELLOW}  Stopping process $PID...${NC}"
            kill $PID 2>/dev/null || true
        fi
    done
    rm -f .runtime/pids.txt
fi

# Kill any remaining node/ts-node processes (be careful with this)
echo -e "${YELLOW}  Cleaning up any remaining processes...${NC}"
pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true

echo -e "${GREEN}✅ Services stopped${NC}"

