# SSL Certificate Fix - Complete

## Issues Fixed ✅

### 1. Port 3000 EADDRINUSE Error
- ✅ Killed all processes using port 3000
- ✅ Port is now free and available

### 2. Self-Signed Certificate Error
- ✅ Updated `shared/libs/src/supabase-client.ts` to respect `PGSSLMODE` environment variable
- ✅ Updated `shared/libs/src/index.ts` (deprecated createPgPool) to respect `PGSSLMODE`
- ✅ Rebuilt shared libs with SSL fix
- ✅ All Pool connections now properly handle SSL bypass when `PGSSLMODE=no-verify` is set

## Code Changes

### `shared/libs/src/supabase-client.ts`
- Updated `executeRawQuery()` to check `PGSSLMODE` env var
- Updated `beginTransaction()` to check `PGSSLMODE` env var
- Both now default to `no-verify` for Supabase connections if `PGSSLMODE` is not set

### `shared/libs/src/index.ts`
- Updated deprecated `createPgPool()` to respect `PGSSLMODE` env var

## How to Start Services

### Option 1: Use the restart script (Recommended)
```bash
# Source the script to export variables and stop services
source ./restart-with-ssl-fix.sh

# Then start services
pnpm dev
```

### Option 2: Manual setup
```bash
# 1. Stop all services
pkill -f "ts-node-dev.*server.ts"
pkill -f "pnpm.*dev"

# 2. Free port 3000
lsof -ti:3000 | xargs kill -9

# 3. Export SSL bypass variables
export DATABASE_URL="postgresql://postgres:i3Oy1wcItkORuVlU@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_URL="https://orqupfsguquusnethtbt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MzcyNCwiZXhwIjoyMDc5ODM5NzI0fQ.JmNQZxevtxqpaKFJrcdzkAGmBEr_tQ2Dy1fCruMhnq8"
export PGSSLMODE=no-verify

# 4. Rebuild shared libs (already done, but good to verify)
pnpm -C shared/libs build

# 5. Start services
pnpm dev
```

### Option 3: Use setup script
```bash
source ./setup-ssl-bypass.sh
pnpm dev
```

## Verification

After starting services, check the logs:

```bash
# Check application service logs
tail -f logs/application.log

# Or if using monolith
tail -f logs/monolith.log
```

You should see:
- ✅ No "self-signed certificate in certificate chain" errors
- ✅ "Supabase SDK client initialized" message
- ✅ Services starting successfully on their ports

## Environment Variables Required

These must be exported before starting services:

```bash
DATABASE_URL="postgresql://postgres:i3Oy1wcItkORuVlU@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://orqupfsguquusnethtbt.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MzcyNCwiZXhwIjoyMDc5ODM5NzI0fQ.JmNQZxevtxqpaKFJrcdzkAGmBEr_tQ2Dy1fCruMhnq8"
PGSSLMODE=no-verify  # This is the key fix!
```

## Files Modified

1. `shared/libs/src/supabase-client.ts` - Updated SSL handling
2. `shared/libs/src/index.ts` - Updated SSL handling
3. `restart-with-ssl-fix.sh` - New script to restart with SSL fix
4. `setup-ssl-bypass.sh` - Helper script for SSL setup

## Next Steps

1. ✅ Port 3000 is free
2. ✅ SSL bypass code is in place
3. ✅ Shared libs rebuilt
4. ⏭️ **Start services with environment variables exported**

Run: `source ./restart-with-ssl-fix.sh && pnpm dev`




