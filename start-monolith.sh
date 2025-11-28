#!/bin/bash

# Simplified Monolith Startup Script
# Starts LOS as a single monolithic service

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Starting LOS Monolith Service              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check Docker
echo -e "${BLUE}📦 Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo -e "${YELLOW}   Please start Docker Desktop and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Start infrastructure
echo ""
echo -e "${BLUE}📦 Starting infrastructure (PostgreSQL, Redpanda, MinIO, Keycloak)...${NC}"
cd infra
docker compose -f docker-compose.monolith.yml up -d
cd ..

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for infrastructure to be ready (30 seconds)...${NC}"
sleep 30

# Set environment variables
export DATABASE_URL="postgres://los:los@localhost:5432/los"
export CORS_ORIGIN="http://localhost:5000,http://localhost:5173"
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
cd services/monolith
pnpm migrate || echo -e "${YELLOW}⚠️  Migrations may have failed (database might not be ready)${NC}"
cd ../..

# Start monolith service
echo ""
echo -e "${BLUE}🚀 Starting Monolith Service...${NC}"
echo -e "${GREEN}  Starting on port 3000...${NC}"

cd services/monolith && pnpm dev > ../../logs/monolith.log 2>&1 &
MONOLITH_PID=$!
cd ../..

# Wait for service to initialize
echo -e "${YELLOW}⏳ Waiting for service to initialize (10 seconds)...${NC}"
sleep 10

# Save PID
mkdir -p .runtime
echo "$MONOLITH_PID" > .runtime/monolith-pid.txt

# Check service health
echo ""
echo -e "${BLUE}🏥 Checking service health...${NC}"
if curl -s "http://localhost:3000/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Monolith Service${NC} - http://localhost:3000/health"
else
    echo -e "${YELLOW}⏳ Monolith Service${NC} - http://localhost:3000/health (starting...)"
fi

echo ""
echo -e "${GREEN}✅ Monolith Service started!${NC}"
echo ""
echo -e "${BLUE}📝 Service URLs:${NC}"
echo -e "  ${GREEN}Monolith API:${NC}  http://localhost:3000"
echo -e "  ${GREEN}Web UI:${NC}        http://localhost:5173 (run 'cd web && pnpm dev' to start)"
echo ""
echo -e "${BLUE}🔐 Test Login Credentials:${NC}"
echo -e "  ${GREEN}Operations:${NC}    ops1 / ops1"
echo -e "  ${GREEN}RM:${NC}            rm1 / rm1"
echo -e "  ${GREEN}Admin:${NC}         admin1 / admin1"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo -e "  Logs are in the ${YELLOW}logs/monolith.log${NC} file"
echo ""
echo -e "${BLUE}🛑 To stop service:${NC}"
echo -e "  Run: ${YELLOW}./stop-monolith.sh${NC} or kill process ${YELLOW}$MONOLITH_PID${NC}"
echo ""

