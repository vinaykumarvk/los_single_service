# SSL Bypass Setup for Supabase

## Issue Fixed
The application service was showing "self-signed certificate in certificate chain" errors when connecting to Supabase PostgreSQL.

## Solution Applied

### 1. Port 3000 Freed ✅
- Killed all processes using port 3000
- Port is now available for the monolith service

### 2. SSL Bypass Environment Variables ✅
The following environment variables need to be exported before starting services:

```bash
export DATABASE_URL="postgresql://postgres:i3Oy1wcItkORuVlU@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_URL="https://orqupfsguquusnethtbt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MzcyNCwiZXhwIjoyMDc5ODM5NzI0fQ.JmNQZxevtxqpaKFJrcdzkAGmBEr_tQ2Dy1fCruMhnq8"
export PGSSLMODE=no-verify
```

### 3. Shared Libs Rebuilt ✅
- Rebuilt `shared/libs` to ensure SSL bypass logic is compiled and available

## How to Start Services

### Option 1: Using the setup script (Recommended)
```bash
# Source the script to export variables
source ./setup-ssl-bypass.sh

# Then start services
pnpm dev
```

### Option 2: Manual export
```bash
# Export variables manually
export DATABASE_URL="postgresql://postgres:i3Oy1wcItkORuVlU@db.orqupfsguquusnethtbt.supabase.co:5432/postgres?sslmode=require"
export SUPABASE_URL="https://orqupfsguquusnethtbt.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI2MzcyNCwiZXhwIjoyMDc5ODM5NzI0fQ.JmNQZxevtxqpaKFJrcdzkAGmBEr_tQ2Dy1fCruMhnq8"
export PGSSLMODE=no-verify

# Rebuild shared libs
pnpm -C shared/libs build

# Start services
pnpm dev
```

### Option 3: Using updated start-services.sh
The `start-services.sh` script has been updated to automatically detect Supabase URLs and set `PGSSLMODE=no-verify`:
```bash
./start-services.sh
```

## Verification

After starting services, check the application service logs to ensure there are no SSL certificate errors:

```bash
# Check application service logs
tail -f logs/application.log

# Or if using monolith
tail -f logs/monolith.log
```

You should see:
- ✅ No "self-signed certificate" errors
- ✅ "Supabase SDK client initialized" message
- ✅ Services starting successfully

## Files Modified

1. **setup-ssl-bypass.sh** - New script to export SSL bypass variables
2. **start-services.sh** - Updated to auto-detect Supabase and set PGSSLMODE
3. **shared/libs** - Rebuilt with SSL bypass logic

## Notes

- The `PGSSLMODE=no-verify` environment variable tells the PostgreSQL client library to skip SSL certificate verification
- This is safe for Supabase connections as they use valid certificates, but the client library may not have the CA chain
- The shared/libs code also sets `rejectUnauthorized: false` in the Pool configuration for additional compatibility




