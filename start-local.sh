#!/bin/bash

# Local Development Startup Script
# Starts all LOS services for local testing

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Starting LOS Application Locally            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check Docker
echo -e "${BLUE}📦 Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo -e "${YELLOW}   Please start Docker Desktop and try again.${NC}"
    echo ""
    echo -e "${BLUE}To start Docker:${NC}"
    echo -e "  1. Open Docker Desktop application"
    echo -e "  2. Wait for it to fully start"
    echo -e "  3. Run this script again"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Start infrastructure
echo ""
echo -e "${BLUE}📦 Starting infrastructure (PostgreSQL, Redpanda, MinIO, Keycloak)...${NC}"
cd infra
docker compose up -d
cd ..

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for infrastructure to be ready (30 seconds)...${NC}"
sleep 30

# Check infrastructure health
echo -e "${BLUE}🔍 Checking infrastructure health...${NC}"
if ! docker compose -f infra/docker-compose.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Some infrastructure services may not be ready yet${NC}"
fi

# Set environment variables
export DATABASE_URL="postgres://los:los@localhost:5432/los"
export CORS_ORIGIN="http://localhost:5000,http://localhost:5173"
export MASTERS_SERVICE_URL="http://localhost:3004"
export MINIO_ENDPOINT="localhost"
export MINIO_PORT="9000"
export MINIO_ACCESS_KEY="minio"
export MINIO_SECRET_KEY="minio123"
export MINIO_BUCKET="los-docs"

# Create logs directory
mkdir -p logs

# Run migrations
echo ""
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
cd services/application
pnpm migrate || echo -e "${YELLOW}⚠️  Application migrations may have failed (database might not be ready)${NC}"
cd ../customer-kyc
pnpm migrate || echo -e "${YELLOW}⚠️  KYC migrations may have failed (database might not be ready)${NC}"
cd ../document
pnpm migrate || echo -e "${YELLOW}⚠️  Document migrations may have failed (database might not be ready)${NC}"
cd ../..

# Start services in background
echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"

# Start Gateway
echo -e "${GREEN}  Starting Gateway (port 3000)...${NC}"
cd gateway && pnpm dev > ../logs/gateway.log 2>&1 &
GATEWAY_PID=$!
cd ..

# Start Auth Service
echo -e "${GREEN}  Starting Auth Service (port 3016)...${NC}"
cd services/auth && pnpm dev > ../../logs/auth.log 2>&1 &
AUTH_PID=$!
cd ../..

# Start Masters Service
echo -e "${GREEN}  Starting Masters Service (port 3004)...${NC}"
cd services/masters && pnpm dev > ../../logs/masters.log 2>&1 &
MASTERS_PID=$!
cd ../..

# Wait for Masters to be ready
sleep 5

# Start Application Service (RM Service)
echo -e "${GREEN}  Starting Application Service (port 3001)...${NC}"
cd services/application && MASTERS_SERVICE_URL=$MASTERS_SERVICE_URL pnpm dev > ../../logs/application.log 2>&1 &
APP_PID=$!
cd ../..

# Start KYC Service
echo -e "${GREEN}  Starting KYC Service (port 3003)...${NC}"
cd services/customer-kyc && pnpm dev > ../../logs/kyc.log 2>&1 &
KYC_PID=$!
cd ../..

# Start Document Service
echo -e "${GREEN}  Starting Document Service (port 3002)...${NC}"
cd services/document && pnpm dev > ../../logs/document.log 2>&1 &
DOC_PID=$!
cd ../..

# Wait for services to initialize
echo -e "${YELLOW}⏳ Waiting for services to initialize (10 seconds)...${NC}"
sleep 10

# Save PIDs
mkdir -p .runtime
echo "$GATEWAY_PID $AUTH_PID $MASTERS_PID $APP_PID $KYC_PID $DOC_PID" > .runtime/pids.txt

# Check service health
echo ""
echo -e "${BLUE}🏥 Checking service health...${NC}"
echo ""

check_service() {
    local name=$1
    local url=$2
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${name}${NC} - ${url}"
    else
        echo -e "${YELLOW}⏳ ${name}${NC} - ${url} (starting...)"
    fi
}

check_service "Gateway" "http://localhost:3000/health"
check_service "Auth Service" "http://localhost:3016/health"
check_service "Masters Service" "http://localhost:3004/health"
check_service "Application Service" "http://localhost:3001/health"
check_service "KYC Service" "http://localhost:3003/health"
check_service "Document Service" "http://localhost:3002/health"

echo ""
echo -e "${GREEN}✅ Services started!${NC}"
echo ""
echo -e "${BLUE}📝 Service URLs:${NC}"
echo -e "  ${GREEN}Gateway:${NC}        http://localhost:3000"
echo -e "  ${GREEN}Web UI:${NC}          http://localhost:5173 (run 'cd web && pnpm dev' to start)"
echo -e "  ${GREEN}Application API:${NC} http://localhost:3001"
echo ""
echo -e "${BLUE}🔐 Test Login Credentials:${NC}"
echo -e "  ${GREEN}Operations:${NC}      ops1 / ops1"
echo -e "  ${GREEN}RM:${NC}              rm1 / rm1"
echo -e "  ${GREEN}Admin:${NC}           admin1 / admin1"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "  Logs are in the ${YELLOW}logs/${NC} directory"
echo ""
echo -e "${BLUE}🛑 To stop services:${NC}"
echo -e "  Run: ${YELLOW}./stop-local.sh${NC} or kill processes in ${YELLOW}.runtime/pids.txt${NC}"
echo ""

