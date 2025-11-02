#!/bin/bash

# Script to start the Application Service for hierarchical dashboard testing
# Usage: ./scripts/start-application-service.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVICE_DIR="services/application"
LOG_FILE="/tmp/application-service.log"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Starting Application Service              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if already running
if lsof -ti:3001 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo "   Stopping existing process..."
    pkill -f "ts-node-dev.*application.*server.ts" 2>/dev/null || true
    sleep 2
fi

# Check if service directory exists
if [ ! -d "$SERVICE_DIR" ]; then
    echo -e "${RED}❌ Error: $SERVICE_DIR not found${NC}"
    exit 1
fi

# Navigate to service directory
cd "$SERVICE_DIR" || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install || pnpm install
fi

# Set default DATABASE_URL if not set
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgres://los:los@localhost:5432/los"
    echo -e "${YELLOW}⚠️  DATABASE_URL not set, using default: ${DATABASE_URL}${NC}"
fi

echo -e "${BLUE}📦 Starting service...${NC}"
echo "   Directory: $(pwd)"
echo "   Port: 3001"
echo "   Log file: $LOG_FILE"
echo ""

# Start the service in the background
nohup pnpm run dev > "$LOG_FILE" 2>&1 &
SERVICE_PID=$!

echo -e "${GREEN}✅ Service started (PID: $SERVICE_PID)${NC}"
echo ""

# Wait for service to start
echo -e "${BLUE}⏳ Waiting for service to initialize...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Service is ready!${NC}"
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  Application Service is running${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "📍 Service Details:"
        echo "   • URL: http://localhost:3001"
        echo "   • Health: http://localhost:3001/health"
        echo "   • PID: $SERVICE_PID"
        echo "   • Logs: tail -f $LOG_FILE"
        echo ""
        echo "🧪 Ready for Testing!"
        echo "   Run: ./scripts/test-hierarchical-dashboards.sh"
        echo ""
        echo "🛑 To stop the service:"
        echo "   kill $SERVICE_PID"
        echo "   or: pkill -f 'ts-node-dev.*application.*server.ts'"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${YELLOW}⚠️  Service may still be starting...${NC}"
echo ""
echo "📋 Check service status:"
echo "   curl http://localhost:3001/health"
echo ""
echo "📋 View logs:"
echo "   tail -f $LOG_FILE"
echo ""
echo "📋 Check if process is running:"
echo "   ps aux | grep 'ts-node-dev.*application'"
echo ""

exit 0

