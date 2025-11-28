#!/bin/bash
# Helper script to update Supabase keys in .env

echo "📝 To fix the dashboard issue, you need to add your Supabase API keys to .env"
echo ""
echo "1. Get your keys from: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/api"
echo "2. Edit .env file and replace the placeholder values"
echo ""
echo "Current .env location: $(pwd)/.env"
echo ""
echo "The keys should look like:"
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "After updating, restart the service with: ./restart-with-env.sh"
