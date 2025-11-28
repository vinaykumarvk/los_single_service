#!/bin/bash

# Script to switch from local PostgreSQL to Supabase

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Switch to Supabase Database                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not set${NC}"
    echo ""
    echo -e "${BLUE}Please provide your Supabase connection string:${NC}"
    echo -e "${YELLOW}Format: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres${NC}"
    echo ""
    read -p "Enter Supabase connection string: " SUPABASE_URL
    
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ Connection string required${NC}"
        exit 1
    fi
    
    export DATABASE_URL="$SUPABASE_URL"
fi

# Add SSL mode if not present
if [[ ! "$DATABASE_URL" == *"sslmode"* ]]; then
    echo -e "${YELLOW}⚠️  Adding sslmode=require to connection string${NC}"
    if [[ "$DATABASE_URL" == *"?"* ]]; then
        DATABASE_URL="${DATABASE_URL}&sslmode=require"
    else
        DATABASE_URL="${DATABASE_URL}?sslmode=require"
    fi
    export DATABASE_URL
fi

echo -e "${BLUE}📦 Testing connection to Supabase...${NC}"

# Test connection
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected to Supabase successfully!${NC}"
else
    echo -e "${RED}❌ Failed to connect to Supabase${NC}"
    echo -e "${YELLOW}   Please check your connection string and credentials${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🗄️  Running migrations...${NC}"
cd services/monolith

if pnpm migrate; then
    echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some migrations may have failed (tables might already exist)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "  1. Update your .env file with:"
echo -e "     ${YELLOW}DATABASE_URL=\"$DATABASE_URL\"${NC}"
echo -e "  2. Restart your application"
echo -e "  3. Test the connection:"
echo -e "     ${YELLOW}curl http://localhost:3000/health${NC}"
echo ""

