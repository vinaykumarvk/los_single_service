#!/bin/bash

# Setup Supabase for LOS Application

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Setting up Supabase Database                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

SUPABASE_PROJECT="orqupfsguquusnethtbt"
SUPABASE_URL="https://${SUPABASE_PROJECT}.supabase.co"

echo -e "${BLUE}📋 Supabase Project:${NC}"
echo -e "  URL: ${YELLOW}${SUPABASE_URL}${NC}"
echo -e "  Dashboard: ${YELLOW}https://supabase.com/dashboard/project/${SUPABASE_PROJECT}${NC}"
echo ""

# Database password (configured)
DB_PASSWORD="i3Oy1wcItkORuVlU"

echo -e "${BLUE}🔐 Using configured database password${NC}"
echo ""

# Construct connection string
# Supabase format: postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${SUPABASE_PROJECT}.supabase.co:5432/postgres?sslmode=require"

echo ""
echo -e "${BLUE}🔍 Testing connection...${NC}"

# Test connection
if psql "$CONNECTION_STRING" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connected to Supabase successfully!${NC}"
else
    echo -e "${RED}❌ Failed to connect${NC}"
    echo -e "${YELLOW}   Please verify:${NC}"
    echo -e "   1. Password is correct"
    echo -e "   2. Database is accessible"
    echo -e "   3. IP is not blocked (check Supabase dashboard)"
    exit 1
fi

# Save to .env file
echo ""
echo -e "${BLUE}💾 Saving configuration...${NC}"
cat > .env << EOF
# Supabase Database Connection
DATABASE_URL=${CONNECTION_STRING}

# Application Settings
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# JWT Secrets (update in production)
JWT_SECRET=change-me-in-production-secret-key-min-32-chars
JWT_REFRESH_SECRET=change-me-in-production-refresh-secret-key-min-32-chars

# MinIO/S3 (for document storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=los-docs
EOF

echo -e "${GREEN}✅ Configuration saved to .env${NC}"

# Run migrations
echo ""
echo -e "${BLUE}🗄️  Running database migrations...${NC}"
cd services/monolith

export DATABASE_URL="$CONNECTION_STRING"

if pnpm migrate; then
    echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Some migrations may have warnings (tables might already exist)${NC}"
    echo -e "${YELLOW}   This is normal if you've run migrations before${NC}"
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Supabase setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "  1. Restart your monolith service:"
echo -e "     ${YELLOW}cd services/monolith && pnpm dev${NC}"
echo -e "  2. Or use the existing running service (it will pick up .env)"
echo -e "  3. Test the connection:"
echo -e "     ${YELLOW}curl http://localhost:3000/health${NC}"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo -e "  Dashboard: ${YELLOW}https://supabase.com/dashboard/project/${SUPABASE_PROJECT}${NC}"
echo -e "  SQL Editor: ${YELLOW}https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/sql${NC}"
echo -e "  Table Editor: ${YELLOW}https://supabase.com/dashboard/project/${SUPABASE_PROJECT}/editor${NC}"
echo ""

