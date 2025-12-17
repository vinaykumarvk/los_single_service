#!/bin/bash
# Script to check what tables exist in Supabase
# Usage: ./scripts/check-supabase-tables.sh [password]

set -e

# Supabase project details
SUPABASE_PROJECT="orqupfsguquusnethtbt"
SUPABASE_HOST="db.orqupfsguquusnethtbt.supabase.co"

echo "🔍 Checking Supabase database tables..."
echo "   Project: $SUPABASE_PROJECT"
echo ""

# Get password from argument or prompt
if [ -z "$1" ]; then
  echo "📝 Enter your Supabase database password:"
  read -s DATABASE_PASSWORD
  echo ""
else
  DATABASE_PASSWORD="$1"
fi

# Construct DATABASE_URL
DATABASE_URL="postgresql://postgres.${SUPABASE_PROJECT}:${DATABASE_PASSWORD}@${SUPABASE_HOST}:5432/postgres?sslmode=require"

# Test connection
echo "🔌 Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "❌ ERROR: Could not connect to Supabase database"
  echo "   Please check your password and try again"
  exit 1
fi
echo "✅ Connection successful!"
echo ""

# Check for tables
echo "📊 Listing all tables..."
psql "$DATABASE_URL" -c "
SELECT 
  schemaname as schema,
  tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
" 2>/dev/null

echo ""
echo "🔍 Checking for users table..."
USER_TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users');" 2>/dev/null | tr -d ' ')

if [ "$USER_TABLE_EXISTS" = "t" ]; then
  echo "✅ users table EXISTS"
  echo ""
  echo "👥 User records:"
  psql "$DATABASE_URL" -c "SELECT user_id, username, email, roles, is_active, created_at FROM users ORDER BY created_at LIMIT 10;" 2>/dev/null || echo "Could not query users"
else
  echo "❌ users table DOES NOT EXIST"
  echo "   You need to run migrations: ./scripts/run-migrations-supabase.sh"
fi

echo ""
echo "🔍 Checking for applications table..."
APP_TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applications');" 2>/dev/null | tr -d ' ')

if [ "$APP_TABLE_EXISTS" = "t" ]; then
  echo "✅ applications table EXISTS"
  echo ""
  echo "📋 Application count:"
  psql "$DATABASE_URL" -c "SELECT status, COUNT(*) as count FROM applications GROUP BY status ORDER BY count DESC;" 2>/dev/null || echo "Could not query applications"
else
  echo "❌ applications table DOES NOT EXIST"
  echo "   You need to run migrations: ./scripts/run-migrations-supabase.sh"
fi

echo ""
echo "🔍 Checking for applicants table..."
APPLICANT_TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applicants');" 2>/dev/null | tr -d ' ')

if [ "$APPLICANT_TABLE_EXISTS" = "t" ]; then
  echo "✅ applicants table EXISTS"
  APPLICANT_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM applicants;" 2>/dev/null | tr -d ' ')
  echo "   Total applicants: $APPLICANT_COUNT"
else
  echo "❌ applicants table DOES NOT EXIST"
fi

echo ""
echo "📊 Summary:"
echo "==========="

if [ "$USER_TABLE_EXISTS" = "t" ] && [ "$APP_TABLE_EXISTS" = "t" ]; then
  echo "✅ Database is already set up!"
  echo "   You can proceed with deployment."
  echo ""
  echo "🔑 If you can't log in, check that users have the correct password hash."
  echo "   Run this to check: psql \"\$DATABASE_URL\" -c \"SELECT username, password_hash FROM users WHERE username='rm1';\""
else
  echo "⚠️  Database needs migrations!"
  echo "   Run: ./scripts/run-migrations-supabase.sh"
fi

echo ""




