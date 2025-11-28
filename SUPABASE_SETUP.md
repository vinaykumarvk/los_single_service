# Supabase Setup Guide

Supabase is an excellent choice for production! It provides:
- ✅ Managed PostgreSQL (same as your current setup)
- ✅ Built-in authentication (can replace Keycloak)
- ✅ Real-time subscriptions
- ✅ Auto-generated REST APIs
- ✅ Dashboard and admin UI
- ✅ Free tier for development
- ✅ Automatic backups

## 🚀 Quick Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Login
3. Click "New Project"
4. Fill in:
   - **Name**: los-app
   - **Database Password**: (choose a strong password - save it!)
   - **Region**: Choose closest to you
5. Wait 2-3 minutes for project to be created

### Step 2: Get Connection String

1. Go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string (looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Step 3: Update Environment Variables

```bash
# Replace with your Supabase connection string
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

Or create `.env` file:
```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### Step 4: Run Migrations

```bash
cd services/monolith
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
pnpm migrate
```

### Step 5: Update Application

The monolith service will automatically use the `DATABASE_URL` environment variable. No code changes needed!

## 🔧 Configuration

### Local Development with Supabase

```bash
# .env file
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

### Production Deployment

#### Option 1: Environment Variables
```bash
# Set in your deployment platform
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

#### Option 2: Secret Management
```bash
# Google Cloud Secret Manager
echo -n "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" | \
  gcloud secrets create database-url --data-file=-

# AWS Secrets Manager
aws secretsmanager create-secret \
  --name los/database-url \
  --secret-string "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

## 🔐 Security Settings

### 1. Enable SSL (Required)

Supabase requires SSL connections. Update connection string:

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

### 2. Connection Pooling (Recommended)

Supabase provides connection pooling for better performance:

```bash
# Use connection pooler (port 6543 instead of 5432)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?sslmode=require
```

### 3. IP Allowlist (Optional)

In Supabase Dashboard:
- Go to **Settings** → **Database**
- Add your IP addresses to allowlist
- Or use connection pooling (no IP restrictions needed)

## 📊 Supabase Dashboard Features

### SQL Editor
- Run queries directly in browser
- View query results
- Execute migrations

### Table Editor
- Visual table management
- Edit data directly
- View relationships

### API Documentation
- Auto-generated REST API docs
- GraphQL endpoint (if enabled)
- Real-time subscriptions

## 🔄 Migration from Local PostgreSQL

### Step 1: Export Local Database

```bash
# Export schema and data
pg_dump -h localhost -U los -d los -F c -f los_backup.dump
```

### Step 2: Import to Supabase

```bash
# Using Supabase connection string
pg_restore \
  -h db.xxxxx.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  los_backup.dump
```

Or use Supabase Dashboard:
1. Go to **SQL Editor**
2. Paste your migration SQL files
3. Run them one by one

## 🎯 Using Supabase Auth (Optional)

Supabase includes built-in authentication. You can:

### Option 1: Keep Current Auth (Recommended for now)
- Continue using JWT auth in monolith
- Supabase just provides database

### Option 2: Migrate to Supabase Auth
- Use Supabase Auth SDK
- Replace JWT implementation
- Get email verification, password reset, etc.

## 📈 Monitoring & Backups

### Automatic Backups
- Supabase automatically backs up daily
- Point-in-time recovery available
- Manual backup option in dashboard

### Monitoring
- Dashboard shows:
  - Database size
  - Active connections
  - Query performance
  - API usage

### Alerts
- Set up alerts for:
  - Database size limits
  - Connection limits
  - Performance issues

## 💰 Pricing

### Free Tier (Perfect for Development)
- 500 MB database
- 2 GB bandwidth
- Unlimited API requests
- 50,000 monthly active users

### Pro Tier ($25/month)
- 8 GB database
- 50 GB bandwidth
- Daily backups
- Priority support

## 🚨 Important Notes

### 1. Connection Limits
- Free tier: 60 direct connections, 200 pooled connections
- Use connection pooling for production

### 2. Database Size
- Monitor in dashboard
- Upgrade plan if needed

### 3. Region Selection
- Choose region closest to users
- Cannot change after creation

### 4. Password Security
- Use strong password
- Store in secret management
- Never commit to git

## 🔧 Troubleshooting

### Connection Issues

**Error: "connection refused"**
- Check connection string is correct
- Verify password is correct
- Check IP allowlist (if enabled)

**Error: "SSL required"**
- Add `?sslmode=require` to connection string
- Or use connection pooler (port 6543)

**Error: "too many connections"**
- Use connection pooler (port 6543)
- Reduce connection pool size in application

### Performance Issues

**Slow queries**
- Use connection pooler
- Add indexes (via SQL Editor)
- Check query performance in dashboard

## 📝 Example Configuration

### Complete .env for Supabase

```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?sslmode=require

# Application
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,http://localhost:5173

# JWT (if using custom auth)
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# MinIO/S3 (still needed for documents)
MINIO_ENDPOINT=your-s3-endpoint
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=los-docs
```

## ✅ Benefits of Supabase

1. **Zero Database Management** - No server maintenance
2. **Automatic Backups** - Daily backups included
3. **Scalability** - Handles traffic spikes automatically
4. **Security** - Built-in SSL, IP allowlisting
5. **Developer Experience** - Great dashboard and tools
6. **Cost Effective** - Free tier for development
7. **PostgreSQL Compatible** - Works with existing code

## 🎯 Next Steps

1. **Create Supabase project** at supabase.com
2. **Get connection string** from dashboard
3. **Update DATABASE_URL** in your environment
4. **Run migrations** to create tables
5. **Test connection** with your application
6. **Deploy** with Supabase connection string

Your existing code works without changes - just update the connection string!

