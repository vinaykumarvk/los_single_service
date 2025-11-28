# Quick Start: Connect to Your Supabase Database

Your Supabase project: **orqupfsguquusnethtbt**

## 🔑 Step 1: Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database
2. Scroll to **Database password** section
3. Click **Reset database password** (if you don't have it) or copy existing password
4. **Save this password** - you'll need it!

## 🔗 Step 2: Connection String Format

Your Supabase connection string should be:

```
postgresql://postgres.orqupfsguquusnethtbt:[YOUR-PASSWORD]@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require
```

Replace `[YOUR-PASSWORD]` with your actual password.

## 🚀 Step 3: Setup (Choose One Method)

### Method 1: Automated Script (Recommended)

```bash
./setup-supabase.sh
```

When prompted, enter your database password.

### Method 2: Manual Setup

```bash
# 1. Set environment variable
export DATABASE_URL="postgresql://postgres.orqupfsguquusnethtbt:[YOUR-PASSWORD]@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"

# 2. Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# 3. Run migrations
cd services/monolith
pnpm migrate

# 4. Start service (it will use DATABASE_URL)
pnpm dev
```

### Method 3: Create .env File

Create `.env` file in project root:

```bash
DATABASE_URL=postgresql://postgres.orqupfsguquusnethtbt:[YOUR-PASSWORD]@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Then:
```bash
cd services/monolith
pnpm migrate
pnpm dev
```

## ✅ Step 4: Verify Connection

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test database connection
curl http://localhost:3000/api/masters/products
```

## 🔧 Alternative: Connection Pooler (Recommended for Production)

For better performance and connection management, use the pooler:

```
postgresql://postgres.orqupfsguquusnethtbt:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Note: Port is **6543** instead of 5432, and hostname is different.

## 📊 Access Supabase Dashboard

- **Dashboard**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt
- **SQL Editor**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/sql
- **Table Editor**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/editor
- **Database Settings**: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/database

## 🚨 Troubleshooting

### "password authentication failed"
- Double-check your password
- Make sure you copied the entire password (no spaces)

### "connection refused"
- Check if your IP is allowed (Settings → Database → Connection pooling)
- Try using connection pooler (port 6543)

### "SSL required"
- Make sure `?sslmode=require` is in connection string
- Supabase requires SSL connections

## 💡 Tips

1. **Use Connection Pooler** for production (port 6543)
2. **Store password securely** - use environment variables or secret management
3. **Never commit** `.env` file to git
4. **Test locally** before deploying to production

