#!/bin/bash

# Start pnpm dev with SSL bypass environment variables
# This ensures PGSSLMODE is set before services start

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up SSL bypass and starting services...${NC}"

# Stop any running services first
echo -e "${YELLOW}🛑 Stopping existing services...${NC}"
pkill -f "ts-node-dev.*server.ts" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true
sleep 2

# Free port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# Export SSL bypass environment variables
export DATABASE_URL="postgresql://postgres:i3Oy1wcItkORuVlU@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_URL="https://orqupfsguquusnethtbt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MzcyNCwiZXhwIjoyMDc5ODM5NzI0fQ.JmNQZxevtxqpaKFJrcdzkAGmBEr_tQ2Dy1fCruMhnq8"
export PGSSLMODE=no-verify

echo -e "${GREEN}✅ Environment variables exported:${NC}"
echo -e "  DATABASE_URL: ${DATABASE_URL:0:60}..."
echo -e "  SUPABASE_URL: $SUPABASE_URL"
echo -e "  PGSSLMODE: $PGSSLMODE"
echo ""

# Verify port is free
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Port 3000 is still in use!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Port 3000 is free${NC}"
echo ""

# Start services with environment variables
echo -e "${BLUE}🚀 Starting services with pnpm dev...${NC}"
echo ""

# Run pnpm dev with the environment variables
exec pnpm dev




