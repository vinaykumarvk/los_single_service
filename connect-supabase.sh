#!/bin/bash
# Quick script to connect to Supabase

echo "Your Supabase Connection String Format:"
echo ""
echo "postgresql://postgres.orqupfsguquusnethtbt:[YOUR-PASSWORD]@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
echo ""
echo "Get your password from:"
echo "https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database"
echo ""
read -sp "Enter your Supabase password: " PASSWORD
echo ""

export DATABASE_URL="postgresql://postgres.orqupfsguquusnethtbt:${PASSWORD}@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"

echo "Testing connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connected! Running migrations..."
    cd services/monolith
    pnpm migrate
    echo ""
    echo "✅ Setup complete! Your app is now using Supabase."
    echo "Connection string saved in DATABASE_URL environment variable"
else
    echo "❌ Connection failed. Please check your password."
fi
