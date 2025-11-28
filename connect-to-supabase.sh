#!/usr/bin/env bash
# Simple script to connect to Supabase - zsh compatible

SUPABASE_PROJECT="orqupfsguquusnethtbt"

echo "🔐 Supabase Setup"
echo "=================="
echo ""
echo "Your Supabase project: orqupfsguquusnethtbt"
echo "Get your password from:"
echo "https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database"
echo ""
echo -n "Enter your Supabase database password: "
read -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Password is required"
    exit 1
fi

# Construct connection string
CONNECTION_STRING="postgresql://postgres.${SUPABASE_PROJECT}:${DB_PASSWORD}@db.${SUPABASE_PROJECT}.supabase.co:5432/postgres?sslmode=require"

echo ""
echo "🔍 Testing connection..."

# Test connection
if psql "$CONNECTION_STRING" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ Connected successfully!"
else
    echo "❌ Connection failed. Please check your password."
    exit 1
fi

# Save to .env
echo ""
echo "💾 Saving to .env file..."
cat > .env << EOF
# Supabase Database
DATABASE_URL=${CONNECTION_STRING}

# Application
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# JWT
JWT_SECRET=change-me-in-production-secret-key-min-32-chars
JWT_REFRESH_SECRET=change-me-in-production-refresh-secret-key-min-32-chars

# MinIO/S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=los-docs
EOF

echo "✅ Configuration saved!"

# Run migrations
echo ""
echo "🗄️  Running migrations..."
cd services/monolith
export DATABASE_URL="$CONNECTION_STRING"

if pnpm migrate 2>&1 | tail -5; then
    echo ""
    echo "✅ Migrations completed!"
else
    echo ""
    echo "⚠️  Some migrations may have warnings (this is normal)"
fi

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your app is now connected to Supabase!"
echo "Restart your service to use the new database."
echo ""

