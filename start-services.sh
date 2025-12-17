#!/bin/bash

# Load .env if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# SSL bypass for Supabase (if using Supabase)
if [[ "$DATABASE_URL" == *"supabase.co"* ]]; then
    export PGSSLMODE=no-verify
    echo "🔧 SSL bypass enabled for Supabase (PGSSLMODE=no-verify)"
fi

# Fallback to local database if DATABASE_URL not set
export DATABASE_URL=${DATABASE_URL:-"postgres://los:los@localhost:5432/los"}
export CORS_ORIGIN=${CORS_ORIGIN:-"http://localhost:5000,http://localhost:5173"}
export MASTERS_SERVICE_URL=${MASTERS_SERVICE_URL:-http://localhost:3004}

echo "🚀 Starting all services with DATABASE_URL set..."
pnpm -w --parallel run dev
