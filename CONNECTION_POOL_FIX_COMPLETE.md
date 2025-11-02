# Connection Pool Issue - Complete Fix Guide

## 🔍 Root Cause Identified

The application service is connecting to a **LOCAL PostgreSQL instance** (PostgreSQL 14.18 Homebrew) instead of the Docker container (PostgreSQL 15.14).

### Evidence:
- Docker exec shows: PostgreSQL 15.14 with `reports_to` column ✅
- Python/Application connection shows: PostgreSQL 14.18 without `reports_to` column ❌
- Connection string `postgres://los:los@localhost:5432/los` resolves to local PostgreSQL when it's running

## 🔧 Solutions

### Option 1: Apply Migration to Local PostgreSQL (Recommended)

If you're using local PostgreSQL for development:

```bash
# Apply migration to local PostgreSQL
psql -U los -d los -f services/auth/migrations/0003_add_reporting_hierarchy.sql
```

### Option 2: Use Docker Container Only

Stop local PostgreSQL and ensure Docker container port is mapped to 5432:

```bash
# Stop local PostgreSQL (macOS)
brew services stop postgresql@14

# Or check if it's running
brew services list | grep postgresql

# Ensure Docker container is running
docker ps | grep postgres
```

### Option 3: Use Different Port for Local PostgreSQL

Configure local PostgreSQL to use a different port (e.g., 5433):

```bash
# Edit PostgreSQL config (location depends on installation)
# Then update DATABASE_URL in application service to use 5433 for local
```

### Option 4: Configure Docker Port Mapping

If Docker PostgreSQL is on a different port, update `DATABASE_URL`:

```bash
# Check Docker port mapping
docker ps | grep postgres

# Update DATABASE_URL if needed
# Example: postgres://los:los@localhost:5433/los (if Docker uses 5433)
```

## ✅ Fixes Already Applied

1. **Fully Qualified Table Names**: Changed to `public.users` ✅
2. **Pool Configuration**: Added `search_path = public` on connection ✅
3. **Query Optimization**: Fixed UUID casting ✅

## 📋 Verification Steps

After applying the fix:

1. **Verify column exists in the database application connects to**:
   ```bash
   # If using Docker
   docker exec los-postgres psql -U los -d los -c "\d users" | grep reports_to
   
   # If using local
   psql -U los -d los -c "\d users" | grep reports_to
   ```

2. **Test connection**:
   ```bash
   curl http://localhost:3001/api/dashboard/srm/<srm-id>
   ```

3. **Run comprehensive tests**:
   ```bash
   ./scripts/comprehensive-functional-tests.sh
   ```

## 🎯 Recommended Approach

**For Development**: Apply migration to local PostgreSQL (Option 1)  
**For Production**: Use Docker container only (Option 2)

## 📖 Files Modified

- `services/application/src/hierarchical-dashboards.ts` - Fully qualified names
- `shared/libs/src/index.ts` - Pool connection handler

---

**Status**: ✅ Code fixes applied, database migration needed on correct instance

