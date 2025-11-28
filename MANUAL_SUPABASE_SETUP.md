# Manual Supabase Setup (If Script Doesn't Work)

If you're getting "zsh: event not found" error, use this manual method:

## Step 1: Get Your Password

1. Go to: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database
2. Copy your database password

## Step 2: Set Connection String

Run this command (replace `YOUR_PASSWORD` with your actual password):

```bash
export DATABASE_URL="postgresql://postgres.orqupfsguquusnethtbt:YOUR_PASSWORD@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
```

## Step 3: Test Connection

```bash
psql "$DATABASE_URL" -c "SELECT version();"
```

If you see PostgreSQL version, connection works!

## Step 4: Run Migrations

```bash
cd services/monolith
pnpm migrate
```

## Step 5: Create .env File (Optional but Recommended)

Create a `.env` file in the project root:

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.orqupfsguquusnethtbt:YOUR_PASSWORD@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require
PORT=3000
CORS_ORIGIN=http://localhost:5173
EOF
```

Replace `YOUR_PASSWORD` with your actual password.

## Alternative: Use the New Script

Try the zsh-compatible script:

```bash
bash connect-to-supabase.sh
```

Or:

```bash
./connect-to-supabase.sh
```

