#!/bin/bash

# Restart services with SSL bypass fix
# This script stops all services, sets up SSL bypass, and restarts them

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Restarting Services with SSL Fix           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Stop all running services
echo -e "${YELLOW}🛑 Stopping all running services...${NC}"
pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true
sleep 2

# Step 2: Free port 3000
echo -e "${YELLOW}🔓 Freeing port 3000...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Step 3: Set SSL bypass environment variables
echo -e "${BLUE}🔧 Setting up SSL bypass environment variables...${NC}"
export DATABASE_URL="postgresql://postgres:i3Oy1wcItkORuVlU@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_URL="https://orqupfsguquusnethtbt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MzcyNCwiZXhwIjoyMDc5ODM5NzI0fQ.JmNQZxevtxqpaKFJrcdzkAGmBEr_tQ2Dy1fCruMhnq8"
export PGSSLMODE=no-verify

echo -e "${GREEN}✅ Environment variables set:${NC}"
echo -e "  DATABASE_URL: ${DATABASE_URL:0:60}..."
echo -e "  SUPABASE_URL: $SUPABASE_URL"
echo -e "  PGSSLMODE: $PGSSLMODE"
echo ""

# Step 4: Rebuild shared libs
echo -e "${BLUE}🔨 Rebuilding shared libs with SSL fix...${NC}"
pnpm -C shared/libs build
echo ""

# Step 5: Verify port is free
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Port 3000 is still in use!${NC}"
    echo "   Please manually kill the process and try again."
    exit 1
fi

echo -e "${GREEN}✅ Port 3000 is free${NC}"
echo ""

# Step 6: Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
echo -e "${YELLOW}   Note: Run this script with 'source' to export variables:${NC}"
echo -e "${YELLOW}   source ./restart-with-ssl-fix.sh${NC}"
echo ""
echo -e "${GREEN}   Then run: pnpm dev${NC}"
echo ""




