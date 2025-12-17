#!/bin/bash
# Script to run migrations on Cloud SQL instance
# Usage: ./scripts/run-migrations-cloud-sql.sh

set -e

# Configuration - update these values
PROJECT_ID="wealth-report"
REGION="europe-west1"
INSTANCE_NAME="los-db"  # Update this to your actual Cloud SQL instance name

echo "🔧 Running migrations on Cloud SQL..."
echo "   Project: $PROJECT_ID"
echo "   Instance: $INSTANCE_NAME"
echo "   Region: $REGION"
echo ""

# Get the DATABASE_URL from Secret Manager
echo "📥 Fetching DATABASE_URL from Secret Manager..."
DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url" --project="$PROJECT_ID" 2>/dev/null || echo "")

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: Could not fetch DATABASE_URL from Secret Manager"
  echo "   Please ensure the secret 'database-url' exists in Secret Manager"
  exit 1
fi

echo "✅ DATABASE_URL retrieved successfully"
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
  PGPASSWORD="${DATABASE_URL#*://}" psql "$DATABASE_URL" -f "$MIGRATION_FILE" -v ON_ERROR_STOP=1 2>&1 | grep -E "(ERROR|NOTICE|WARNING)" || true
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "   ✅ Success"
  else
    echo "   ❌ Failed"
    echo ""
    echo "❌ Migration failed: $FILENAME"
    exit 1
  fi
  echo ""
done

echo "🎉 All migrations completed successfully!"
echo ""
echo "📊 Verifying data..."

# Verify users were created
echo "Checking users table..."
psql "$DATABASE_URL" -c "SELECT username, roles, is_active FROM users WHERE username LIKE 'rm%' ORDER BY username;" -t 2>/dev/null || echo "Could not verify users"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🔑 Test credentials:"
echo "   Username: rm1"
echo "   Password: RM@123456"
echo ""




