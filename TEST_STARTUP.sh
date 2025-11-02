#!/bin/bash

# Testing Script for LOS Application
# This script helps verify the application setup before testing

set -e

echo "🧪 LOS Application Testing Startup Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Not in LOS root directory${NC}"
    exit 1
fi

# Check Node.js and pnpm
echo "📦 Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Install with: npm install -g pnpm${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pnpm: $(pnpm --version)${NC}"

# Check database connection
echo ""
echo "🗄️  Checking database..."
if command -v psql &> /dev/null; then
    if psql -h localhost -U los -d los -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL connection successful${NC}"
    else
        echo -e "${YELLOW}⚠ PostgreSQL connection failed. Ensure database is running.${NC}"
        echo "   Try: docker-compose up -d postgres (if using Docker)"
    fi
else
    echo -e "${YELLOW}⚠ psql not found. Skipping database check.${NC}"
fi

# Check environment variables
echo ""
echo "🔧 Checking environment configuration..."

if [ -f "services/.env" ]; then
    echo -e "${GREEN}✓ services/.env exists${NC}"
else
    echo -e "${YELLOW}⚠ services/.env not found. Creating default...${NC}"
    echo "DATABASE_URL=postgres://los:los@localhost:5432/los" > services/.env
fi

if [ -f "web/.env" ]; then
    echo -e "${GREEN}✓ web/.env exists${NC}"
else
    echo -e "${YELLOW}⚠ web/.env not found${NC}"
    echo "   Create it with: VITE_API_BASE_URL=http://localhost:3000/api"
fi

# Check if dependencies are installed
echo ""
echo "📚 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not installed. Running pnpm install...${NC}"
    pnpm install
else
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Check shared libs
echo ""
echo "📦 Checking shared libraries..."
if [ -d "shared/libs" ]; then
    cd shared/libs
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ Building shared libs...${NC}"
        pnpm install
        pnpm build
    fi
    cd ../..
    echo -e "${GREEN}✓ Shared libraries ready${NC}"
else
    echo -e "${RED}❌ shared/libs directory not found${NC}"
fi

echo ""
echo "✅ Setup check complete!"
echo ""
echo "🚀 To start the application:"
echo "   1. Start infrastructure: docker-compose up -d (if using Docker)"
echo "   2. Start backend services: pnpm -w --parallel run dev"
echo "   3. Start frontend (new terminal): cd web && pnpm dev"
echo ""
echo "📋 For RM persona specifically:"
echo "   cd web && VITE_PERSONA=rm pnpm dev"
echo ""

