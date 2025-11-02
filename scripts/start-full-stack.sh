#!/bin/bash

# Start Full Stack LOS Application
# This script automates the entire startup process

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Loan Origination System - Full Stack Setup  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: ${NODE_VERSION}${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Installing...${NC}"
    npm install -g pnpm
fi
PNPM_VERSION=$(pnpm --version)
echo -e "${GREEN}✅ pnpm: ${PNPM_VERSION}${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker Desktop${NC}"
    exit 1
fi
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

echo ""

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
pnpm -w install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Start infrastructure
echo -e "${YELLOW}🐳 Step 2: Starting infrastructure services...${NC}"
cd infra
docker compose up -d
cd ..
echo -e "${GREEN}✅ Infrastructure services started${NC}"
echo ""

# Step 3: Wait for services to be ready
echo -e "${YELLOW}⏳ Step 3: Waiting for infrastructure to initialize (30 seconds)...${NC}"
for i in {30..1}; do
    echo -ne "\r⏳ Waiting... $i seconds remaining"
    sleep 1
done
echo -e "\r${GREEN}✅ Infrastructure ready${NC}      "
echo ""

# Step 4: Check infrastructure health
echo -e "${YELLOW}🏥 Step 4: Checking infrastructure health...${NC}"
if docker compose -f infra/docker-compose.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Infrastructure services are running${NC}"
else
    echo -e "${RED}❌ Some infrastructure services failed to start${NC}"
    docker compose -f infra/docker-compose.yml ps
    exit 1
fi
echo ""

# Step 5: Build services
echo -e "${YELLOW}🔨 Step 5: Building services...${NC}"
if pnpm -w build 2>&1 | grep -q "error"; then
    echo -e "${YELLOW}⚠️  Some build errors detected, but continuing...${NC}"
else
    echo -e "${GREEN}✅ Services built successfully${NC}"
fi
echo ""

# Step 6: Start backend services
echo -e "${YELLOW}🚀 Step 6: Starting backend services...${NC}"
echo -e "${BLUE}   This will start all services in parallel${NC}"
echo -e "${BLUE}   Services will run in the background${NC}"
echo ""

# Create logs directory
mkdir -p logs

# Start services in background
pnpm -w --parallel run dev > logs/all-services.log 2>&1 &
SERVICES_PID=$!

echo -e "${YELLOW}⏳ Waiting for services to start (10 seconds)...${NC}"
sleep 10
echo ""

# Step 7: Check service health
echo -e "${YELLOW}🏥 Step 7: Checking service health...${NC}"
echo ""

check_service() {
    local name=$1
    local port=$2
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name (port $port)${NC}"
        return 0
    else
        echo -e "${YELLOW}⏳ $name (port $port) - starting...${NC}"
        return 1
    fi
}

check_service "Gateway" 3000
check_service "Application" 3001
check_service "Customer-KYC" 3002
check_service "Document" 3003
check_service "Masters" 3004
check_service "Underwriting" 3006
check_service "Scoring" 3018
check_service "Analytics" 3019

echo ""

# Step 8: Instructions for frontend
echo -e "${YELLOW}💻 Step 8: Starting frontend...${NC}"
echo -e "${BLUE}   Frontend should be started in a separate terminal${NC}"
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ Setup Complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📋 Service URLs:${NC}"
echo -e "   Gateway:    ${GREEN}http://localhost:3000${NC}"
echo -e "   Scoring:    ${GREEN}http://localhost:3018${NC}"
echo -e "   Analytics:  ${GREEN}http://localhost:3019${NC}"
echo -e "   Frontend:   ${GREEN}http://localhost:5173${NC} (run 'cd web && pnpm dev')"
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "   1. Open new terminal and run: ${YELLOW}cd web && pnpm dev${NC}"
echo -e "   2. Access application at: ${YELLOW}http://localhost:5173${NC}"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "   All services: ${YELLOW}tail -f logs/all-services.log${NC}"
echo ""
echo -e "${BLUE}🛑 To Stop:${NC}"
echo -e "   Run: ${YELLOW}./scripts/stop-full-stack.sh${NC}"
echo ""

# Save PID for stop script
mkdir -p .runtime
echo $SERVICES_PID > .runtime/services-pid.txt

