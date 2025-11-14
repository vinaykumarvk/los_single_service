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

# Migration 4+: Ensure application_id uses TEXT identifiers
APP_ID_TYPE=$(psql "$DB_URL" -t -c "SELECT data_type FROM information_schema.columns WHERE table_name='applications' AND column_name='application_id'" | tr -d '[:space:]')

if [ "$APP_ID_TYPE" != "text" ]; then
    echo "📝 Applying: Change application_id to TEXT (0009)..."
    psql "$DB_URL" -f services/application/migrations/0009_change_application_id_format.sql
    echo "✅ Migration 4 complete"

    echo "📝 Applying: Convert existing application_ids (0010)..."
    psql "$DB_URL" -f services/application/migrations/0010_convert_all_application_ids.sql
    echo "✅ Migration 5 complete"
else
    echo "⏭️  Skipping application_id migrations (already TEXT)"
fi

echo ""
echo "✅ All migrations completed successfully!"
echo ""
echo "📊 Summary:"
echo "  ✅ Added missing applicant fields (income sources, years in job, bank fields)"
echo "  ✅ Created property_details table"
echo "  ✅ Added login security (lockout, password reset OTP tables)"
echo "  ✅ Ensured application_id uses human-readable TEXT identifiers"
