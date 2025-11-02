#!/bin/bash

# Script to stop all LoS services
# Usage: ./scripts/stop-all-services.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Stopping All LoS Services                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Services to stop (process patterns)
SERVICES=(
    "ts-node-dev.*application.*server.ts"
    "ts-node-dev.*gateway.*server.ts"
    "ts-node-dev.*auth.*server.ts"
    "ts-node-dev.*kyc.*server.ts"
    "ts-node-dev.*document.*server.ts"
    "ts-node-dev.*underwriting.*server.ts"
    "ts-node-dev.*sanction.*server.ts"
    "ts-node-dev.*payments.*server.ts"
    "ts-node-dev.*disbursement.*server.ts"
    "ts-node-dev.*reporting.*server.ts"
    "ts-node-dev.*scoring.*server.ts"
    "ts-node-dev.*analytics.*server.ts"
    "ts-node-dev.*masters.*server.ts"
    "node.*server.js"
    "tsx.*server.ts"
)

# Ports to check
PORTS=(3000 3001 3002 3003 3004 3006 3007 3008 3009 3015 3018 3019)

STOPPED=0

# Stop processes by pattern
for pattern in "${SERVICES[@]}"; do
    if pgrep -f "$pattern" > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping: $pattern${NC}"
        pkill -f "$pattern" 2>/dev/null || true
        STOPPED=$((STOPPED + 1))
    fi
done

# Stop processes on specific ports
for port in "${PORTS[@]}"; do
    PID=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "${YELLOW}Stopping process on port $port (PID: $PID)${NC}"
        kill "$PID" 2>/dev/null || true
        STOPPED=$((STOPPED + 1))
    fi
done

# Wait for processes to terminate
sleep 2

# Force kill if still running
for port in "${PORTS[@]}"; do
    PID=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$PID" ]; then
        echo -e "${RED}Force killing process on port $port (PID: $PID)${NC}"
        kill -9 "$PID" 2>/dev/null || true
    fi
done

if [ $STOPPED -eq 0 ]; then
    echo -e "${GREEN}✅ No running services found${NC}"
else
    echo -e "${GREEN}✅ Stopped $STOPPED service(s)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All services stopped${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

