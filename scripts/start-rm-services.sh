#!/bin/bash

# Script to start ONLY services required for Relationship Managers
# Based on RM_SERVICES_REQUIRED.md analysis
# Usage: ./scripts/start-rm-services.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LOG_DIR="/tmp/los-services"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Starting RM-Required Services Only        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}This will start only the 6-7 services needed for RM functionality${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgres://los:los@localhost:5432/los"
    echo -e "${YELLOW}⚠️  DATABASE_URL not set, using default${NC}"
fi

# Check if PostgreSQL is running
if ! docker ps | grep -q postgres; then
    echo -e "${RED}❌ PostgreSQL container not running!${NC}"
    echo "   Start it with: docker-compose up -d postgres"
    exit 1
fi

# RM-REQUIRED SERVICES ONLY (6 essential services, in startup order)
# Integration Hub (3020) is optional and excluded by default
declare -a RM_SERVICES=(
    "gateway:3000:API Gateway"
    "services/auth:3016:Auth Service"
    "services/masters:3005:Masters Service"
    "services/customer-kyc:3003:Customer KYC Service"
    "services/application:3001:Application Service"
    "services/document:3004:Document Service"
)

STARTED=0
FAILED=0
SKIPPED=0

for service_info in "${RM_SERVICES[@]}"; do
    IFS=':' read -r dir port name <<< "$service_info"
    
    # Check if this is the optional Integration Hub
    if [[ "$name" == *"Optional"* ]]; then
        echo -e "${YELLOW}Starting (Optional): $name${NC}"
    else
        echo -e "${BLUE}Starting: $name${NC}"
    fi
    echo "   Directory: $dir"
    echo "   Port: $port"
    
    # Check if port is already in use
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port already in use${NC}"
        
        # Check if it's our own service process
        EXISTING_PID=$(lsof -ti:$port | head -1)
        if [ ! -z "$EXISTING_PID" ]; then
            EXISTING_CMD=$(ps -p $EXISTING_PID -o comm= 2>/dev/null || echo "")
            if echo "$EXISTING_CMD" | grep -qE "node|ts-node"; then
                echo -e "${GREEN}   ✅ Service already running (PID: $EXISTING_PID)${NC}"
                STARTED=$((STARTED + 1))
                continue
            fi
        fi
        
        echo -e "${YELLOW}   Skipping (port conflict)${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    # Check if directory exists
    if [ ! -d "$dir" ]; then
        echo -e "${RED}❌ Directory $dir not found, skipping...${NC}"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Check if package.json exists
    if [ ! -f "$dir/package.json" ]; then
        echo -e "${YELLOW}⚠️  No package.json in $dir, skipping...${NC}"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi
    
    # Start service in background
    cd "$dir" || continue
    
    # Set PORT and DATABASE_URL environment variables
    export PORT=$port
    
    LOG_FILE="$LOG_DIR/$(basename $dir).log"
    echo "   Log: $LOG_FILE"
    
    # Start service
    if [ -f "package.json" ]; then
        # Try npm first, then pnpm
        if command -v pnpm &> /dev/null; then
            nohup pnpm run dev > "$LOG_FILE" 2>&1 & SERVICE_PID=$!
        else
            nohup npm run dev > "$LOG_FILE" 2>&1 & SERVICE_PID=$!
        fi
        
        # Wait a moment to check if service started
        sleep 2
        
        # Check if process is still running
        if ps -p $SERVICE_PID > /dev/null 2>&1; then
            echo -e "${GREEN}   ✅ Started (PID: $SERVICE_PID)${NC}"
            STARTED=$((STARTED + 1))
        else
            echo -e "${RED}   ❌ Failed to start${NC}"
            echo "   Check logs: $LOG_FILE"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "${YELLOW}   ⚠️  No package.json found${NC}"
        SKIPPED=$((SKIPPED + 1))
    fi
    
    cd - > /dev/null
    echo ""
done

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Startup Summary                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Started: $STARTED${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed: $FAILED${NC}"
fi
if [ $SKIPPED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Skipped: $SKIPPED${NC}"
fi
echo ""
echo -e "${BLUE}Service logs are in: $LOG_DIR${NC}"
echo ""
echo -e "${GREEN}✅ RM-Required services startup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Wait 5-10 seconds for services to fully initialize"
echo "2. Test login: http://localhost:5173/login"
echo "3. Check service health: curl http://localhost:3000/health"
echo ""

