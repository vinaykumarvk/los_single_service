#!/bin/bash
# Script to run migrations on local Docker PostgreSQL
# Usage: ./scripts/run-migrations-docker.sh

set -e

echo "🔧 Running migrations on local Docker PostgreSQL..."
echo ""

# Wait for postgres to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec los-postgres pg_isready -U los > /dev/null 2>&1; do
  echo "   Waiting for postgres..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"
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
  
  # Copy migration file to container and run it
  docker cp "$MIGRATION_FILE" los-postgres:/tmp/migration.sql > /dev/null 2>&1
  docker exec los-postgres psql -U los -d los -f /tmp/migration.sql > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "   ✅ Success"
  else
    echo "   ⚠️  Warning (may already be applied)"
  fi
  echo ""
done

echo "✅ Migrations completed!"
echo ""
echo "📊 Database is ready for use"

