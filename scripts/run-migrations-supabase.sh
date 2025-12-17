#!/bin/bash
# Script to run migrations on Supabase database
# Usage: ./scripts/run-migrations-supabase.sh [password]

set -e

# Supabase project details
SUPABASE_PROJECT="orqupfsguquusnethtbt"
SUPABASE_HOST="db.orqupfsguquusnethtbt.supabase.co"

echo "🔧 Running migrations on Supabase..."
echo "   Project: $SUPABASE_PROJECT"
echo ""

# Get password from argument or prompt
if [ -z "$1" ]; then
  echo "📝 Enter your Supabase database password:"
  echo "   (Get it from: https://supabase.com/dashboard/project/$SUPABASE_PROJECT/settings/database)"
  read -s DATABASE_PASSWORD
  echo ""
else
  DATABASE_PASSWORD="$1"
fi

# Construct DATABASE_URL
DATABASE_URL="postgresql://postgres.${SUPABASE_PROJECT}:${DATABASE_PASSWORD}@${SUPABASE_HOST}:5432/postgres?sslmode=require"

# Test connection
echo "🔌 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "✅ Connection successful!"
else
  echo "❌ ERROR: Could not connect to Supabase database"
  echo "   Please check your password and try again"
  exit 1
fi
echo ""

# Run migrations in order
echo "🚀 Running migrations..."
MIGRATION_DIR="services/monolith/migrations"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo "❌ ERROR: Migration directory not found: $MIGRATION_DIR"
  exit 1
fi

# Get all .sql files sorted by name
MIGRATIONS=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS" ]; then
  echo "❌ ERROR: No migration files found in $MIGRATION_DIR"
  exit 1
fi

# Count migrations
TOTAL=$(echo "$MIGRATIONS" | wc -l | tr -d ' ')
CURRENT=0

echo "📋 Found $TOTAL migration file(s)"
echo ""

# Run each migration
for MIGRATION_FILE in $MIGRATIONS; do
  CURRENT=$((CURRENT + 1))
  FILENAME=$(basename "$MIGRATION_FILE")
  
  echo "[$CURRENT/$TOTAL] Running: $FILENAME"
  
  # Use psql to run the migration
  psql "$DATABASE_URL" -f "$MIGRATION_FILE" -v ON_ERROR_STOP=1 > /tmp/migration_output.txt 2>&1
  
  if [ $? -eq 0 ]; then
    # Show only NOTICE and WARNING messages
    grep -E "(NOTICE|WARNING)" /tmp/migration_output.txt | head -3 || true
    echo "   ✅ Success"
  else
    echo "   ❌ Failed"
    cat /tmp/migration_output.txt
    echo ""
    echo "❌ Migration failed: $FILENAME"
    exit 1
  fi
  echo ""
done

rm -f /tmp/migration_output.txt

echo "🎉 All migrations completed successfully!"
echo ""
echo "📊 Verifying data..."

# Verify users were created
echo "Checking users table..."
psql "$DATABASE_URL" -c "SELECT username, roles, is_active FROM users WHERE username LIKE 'rm%' ORDER BY username LIMIT 10;" 2>/dev/null || echo "Could not verify users"

echo ""
echo "Checking applications..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) as total_applications FROM applications;" 2>/dev/null || echo "Could not verify applications"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔑 Test credentials:"
echo "   Username: rm1, rm2, rm3, or rm4"
echo "   Password: RM@123456"
echo ""
echo "🌐 Your Supabase project: https://supabase.com/dashboard/project/$SUPABASE_PROJECT"
echo ""




