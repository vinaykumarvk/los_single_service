#!/bin/bash

# Start LOS Application
# This script starts all services in the correct order

set -e

echo "🚀 Starting Loan Origination System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

export MASTERS_SERVICE_URL=${MASTERS_SERVICE_URL:-http://localhost:3004}

wait_for_service() {
    local name=$1
    local url=$2
    local retries=${3:-30}
    local delay=${4:-2}

    echo -e "${YELLOW}⏳ Waiting for ${name} at ${url}...${NC}"
    for ((attempt=1; attempt<=retries; attempt++)); do
        if curl -sSf "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${name} is ready${NC}"
            return 0
        fi
        sleep "$delay"
    done

    echo -e "${YELLOW}❌ ${name} did not become ready in time${NC}"
    return 1
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start infrastructure
echo -e "${BLUE}📦 Starting infrastructure (PostgreSQL, Kafka, MinIO, Keycloak)...${NC}"
cd infra
docker compose up -d
cd ..

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for infrastructure to be ready...${NC}"
sleep 10

# Check infrastructure health
echo -e "${BLUE}🔍 Checking infrastructure health...${NC}"
docker compose -f infra/docker-compose.yml ps

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "pnpm-lock.yaml" ]; then
    echo -e "${BLUE}📥 Installing dependencies...${NC}"
    pnpm -w install
fi

# Build services
echo -e "${BLUE}🔨 Building services...${NC}"
pnpm -w build

# Start gateway
echo -e "${GREEN}🌐 Starting Gateway (port 3000)...${NC}"
cd gateway && pnpm dev > ../logs/gateway.log 2>&1 &
GATEWAY_PID=$!
cd ..

# Start core services
echo -e "${GREEN}🔧 Starting Core Services...${NC}"

cd services/auth && pnpm dev > ../../logs/auth.log 2>&1 &
AUTH_PID=$!
cd ../..

cd services/customer-kyc && pnpm dev > ../../logs/kyc.log 2>&1 &
KYC_PID=$!
cd ../..

cd services/document && pnpm dev > ../../logs/document.log 2>&1 &
DOC_PID=$!
cd ../..

cd services/masters && pnpm dev > ../../logs/masters.log 2>&1 &
MASTERS_PID=$!
cd ../..

wait_for_service "Masters Service" "http://localhost:3004/health" 30 2

cd services/application && MASTERS_SERVICE_URL=$MASTERS_SERVICE_URL pnpm dev > ../../logs/application.log 2>&1 &
APP_PID=$!
cd ../..

cd services/underwriting && pnpm dev > ../../logs/underwriting.log 2>&1 &
UNDERWRITING_PID=$!
cd ../..

cd services/scoring && pnpm dev > ../../logs/scoring.log 2>&1 &
SCORING_PID=$!
cd ../..

cd services/analytics && pnpm dev > ../../logs/analytics.log 2>&1 &
ANALYTICS_PID=$!
cd ../..

cd services/sanction-offer && pnpm dev > ../../logs/sanction.log 2>&1 &
SANCTION_PID=$!
cd ../..

cd services/payments && pnpm dev > ../../logs/payments.log 2>&1 &
PAYMENTS_PID=$!
cd ../..

cd services/disbursement && pnpm dev > ../../logs/disbursement.log 2>&1 &
DISBURSEMENT_PID=$!
cd ../..

cd services/orchestrator && pnpm dev > ../../logs/orchestrator.log 2>&1 &
ORCHESTRATOR_PID=$!
cd ../..

cd services/integration-hub && pnpm dev > ../../logs/integration.log 2>&1 &
INTEGRATION_PID=$!
cd ../..

cd services/bureau && pnpm dev > ../../logs/bureau.log 2>&1 &
BUREAU_PID=$!
cd ../..

cd services/verification && pnpm dev > ../../logs/verification.log 2>&1 &
VERIFICATION_PID=$!
cd ../..

cd services/notifications && pnpm dev > ../../logs/notifications.log 2>&1 &
NOTIFICATIONS_PID=$!
cd ../..

cd services/audit && pnpm dev > ../../logs/audit.log 2>&1 &
AUDIT_PID=$!
cd ../..

cd reporting && pnpm dev > ../logs/reporting.log 2>&1 &
REPORTING_PID=$!
cd ..

# Wait a bit for services to start
echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 5

# Check service health
echo -e "${BLUE}🏥 Checking service health...${NC}"
echo ""
echo "Gateway: http://localhost:3000/health"
curl -s http://localhost:3000/health && echo " ✅" || echo " ❌"

echo "Auth: http://localhost:3016/health"
curl -s http://localhost:3016/health && echo " ✅" || echo " ❌"

echo "Application: http://localhost:3001/health"
curl -s http://localhost:3001/health && echo " ✅" || echo " ❌"

echo "Scoring: http://localhost:3018/health"
curl -s http://localhost:3018/health && echo " ✅" || echo " ❌"

echo "Analytics: http://localhost:3019/health"
curl -s http://localhost:3019/health && echo " ✅" || echo " ❌"

echo ""
echo -e "${GREEN}✅ Application started!${NC}"
echo ""
echo "📝 Service URLs:"
echo "  Gateway: http://localhost:3000"
echo "  Web UI: http://localhost:5173 (run 'cd web && pnpm dev' to start)"
echo ""
echo "📋 Logs are in the logs/ directory"
echo ""
echo "To stop all services, run: ./stop-app.sh"
echo ""

# Save PIDs for stop script
mkdir -p .runtime
echo "$GATEWAY_PID $AUTH_PID $APP_PID $KYC_PID $DOC_PID $MASTERS_PID $UNDERWRITING_PID $SCORING_PID $ANALYTICS_PID $SANCTION_PID $PAYMENTS_PID $DISBURSEMENT_PID $ORCHESTRATOR_PID $INTEGRATION_PID $BUREAU_PID $VERIFICATION_PID $NOTIFICATIONS_PID $AUDIT_PID $REPORTING_PID" > .runtime/pids.txt
