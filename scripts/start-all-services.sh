#!/bin/bash

# Script to start all LoS services
# Usage: ./scripts/start-all-services.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

LOG_DIR="/tmp/los-services"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Starting All LoS Services                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
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

# Service definitions: (directory, port, name)
declare -a SERVICES=(
    "services/application:3001:Application Service"
    "services/auth:3002:Auth Service"
    "services/kyc:3003:KYC Service"
    "services/document:3004:Document Service"
    "services/masters:3005:Masters Service"
    "services/underwriting:3006:Underwriting Service"
    "services/sanction-offer:3007:Sanction Service"
    "services/payments:3008:Payments Service"
    "services/disbursement:3009:Disbursement Service"
    "reporting:3015:Reporting Service"
    "services/scoring:3018:Scoring Service"
    "services/analytics:3019:Analytics Service"
    "gateway:3000:API Gateway"
)

STARTED=0
FAILED=0

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r dir port name <<< "$service_info"
    
    echo -e "${BLUE}Starting: $name${NC}"
    echo "   Directory: $dir"
    echo "   Port: $port"
    
    # Check if port is already in use
    if lsof -ti:$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port already in use, skipping...${NC}"
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
        continue
    fi
    
    # Start service in background
    cd "$dir" || continue
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}   Installing dependencies...${NC}"
        npm install --silent 2>&1 || pnpm install --silent 2>&1 || true
    fi
    
    # Start service
    LOG_FILE="$LOG_DIR/$(basename $dir).log"
    nohup npm run dev > "$LOG_FILE" 2>&1 & SERVICE_PID=$! || nohup pnpm run dev > "$LOG_FILE" 2>&1 & SERVICE_PID=$!
    
    echo -e "${GREEN}   ✅ Started (PID: $SERVICE_PID, Log: $LOG_FILE)${NC}"
    STARTED=$((STARTED + 1))
    
    cd - > /dev/null
    sleep 1
done

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Services Starting...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check service health
echo ""
echo -e "${BLUE}Checking service health:${NC}"
echo ""

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r dir port name <<< "$service_info"
    
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name (port $port) - Healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  $name (port $port) - Starting...${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ Started $STARTED service(s)${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed to start $FAILED service(s)${NC}"
fi
echo ""
echo "📋 Service Details:"
echo "   • Logs directory: $LOG_DIR"
echo "   • View logs: tail -f $LOG_DIR/*.log"
echo ""
echo "🧪 Test services:"
echo "   • Gateway: http://localhost:3000/health"
echo "   • Application: http://localhost:3001/health"
echo ""
echo "🛑 To stop all services:"
echo "   ./scripts/stop-all-services.sh"
echo ""

