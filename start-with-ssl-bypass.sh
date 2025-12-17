#!/bin/bash

# Start services with SSL bypass environment variables for Supabase
# This script exports the required SSL bypass variables before starting services

set -e

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

echo -e "${GREEN}✅ Environment variables set:${NC}"
echo -e "  DATABASE_URL: ${DATABASE_URL:0:60}..."
echo -e "  SUPABASE_URL: $SUPABASE_URL"
echo -e "  PGSSLMODE: $PGSSLMODE"
echo ""

# Check if shared libs need rebuilding
echo -e "${BLUE}🔨 Rebuilding shared libs to ensure SSL logic is in use...${NC}"
pnpm -C shared/libs build

echo ""
echo -e "${GREEN}✅ Ready to start services!${NC}"
echo ""
echo -e "${YELLOW}To start services, run:${NC}"
echo -e "  ${BLUE}pnpm dev${NC}"
echo ""
echo -e "${YELLOW}Or to start monolith:${NC}"
echo -e "  ${BLUE}./start-monolith.sh${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure to run this script with 'source' to export variables:"
echo -e "  ${BLUE}source ./start-with-ssl-bypass.sh${NC}"
echo ""




