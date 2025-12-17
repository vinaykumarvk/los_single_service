#!/bin/bash

# Setup SSL bypass environment variables for Supabase
# Usage: source ./setup-ssl-bypass.sh
# Then run: pnpm dev

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Setting up SSL bypass environment variables...${NC}"

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

# Rebuild shared libs to ensure SSL logic is in use
echo -e "${BLUE}🔨 Rebuilding shared libs...${NC}"
pnpm -C shared/libs build

echo ""
echo -e "${GREEN}✅ SSL bypass setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run: ${BLUE}pnpm dev${NC} to start all services"
echo -e "  2. Or run: ${BLUE}./start-monolith.sh${NC} for monolith mode"
echo ""




