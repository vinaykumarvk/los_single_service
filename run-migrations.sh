#!/bin/bash

# Script to run all new migrations
# Ensures database schema is up to date with latest changes

set -e

DB_URL=${DATABASE_URL:-postgres://los:los@localhost:5432/los}

echo "🔄 Running database migrations..."
echo ""

# Migration 1: Add missing fields to applicants table
echo "📝 Applying: Add missing fields to applicants table..."
psql "$DB_URL" -f services/customer-kyc/migrations/0005_add_missing_fields.sql
echo "✅ Migration 1 complete"

# Migration 2: Add property_details table
echo "📝 Applying: Create property_details table..."
psql "$DB_URL" -f services/application/migrations/0006_add_property_details_table.sql
echo "✅ Migration 2 complete"

# Migration 3: Add login security features
echo "📝 Applying: Add login security features..."
psql "$DB_URL" -f services/auth/migrations/0002_add_login_security.sql
echo "✅ Migration 3 complete"

echo ""
echo "✅ All migrations completed successfully!"
echo ""
echo "📊 Summary:"
echo "  ✅ Added missing applicant fields (income sources, years in job, bank fields)"
echo "  ✅ Created property_details table"
echo "  ✅ Added login security (lockout, password reset OTP tables)"

