# Supabase Docker Connection Analysis & Recommendations

## Current Situation

### ✅ What's Working
1. **Code is correct**: Using Supabase SDK's `.from().select()` methods (HTTP REST API)
2. **Supabase SDK works**: Direct test shows SDK can connect successfully
3. **Configuration is correct**: Supabase URL and keys are properly set

### ❌ Current Problem
- Docker container can't resolve Supabase hostnames (`getaddrinfo ENOTFOUND`)
- Even though we're using HTTP REST API (not direct PostgreSQL), DNS resolution fails
- Error: `getaddrinfo ENOTFOUND db.orqupfsguquusnethtbt.supabase.co`

## Root Cause

The issue is **Docker's DNS resolution**, not the code or Supabase SDK configuration. Docker containers have their own DNS resolver that may not be able to resolve external hostnames like `orqupfsguquusnethtbt.supabase.co`.

## Solutions (In Order of Preference)

### Option 1: Configure Docker Desktop DNS (Recommended - User Action Required)

**Steps:**
1. Open Docker Desktop
2. Go to **Settings** → **Resources** → **Network**
3. Either:
   - Enable **"Use host DNS"**, OR
   - Add custom DNS servers: `8.8.8.8` and `8.8.4.4`
4. Click **Apply & Restart**
5. Restart the monolith container:
   ```bash
   docker compose -f infra/docker-compose.monolith.yml restart monolith
   ```

**Why this works:**
- Uses host's DNS resolver (which can resolve external hostnames)
- Or uses reliable public DNS servers (Google DNS)

### Option 2: Use Supabase Connection Pooler

The pooler endpoint is designed for serverless/containerized apps and may have better DNS resolution.

**Steps:**
1. Get your pooler connection string from Supabase dashboard:
   - Go to **Settings** → **Database**
   - Copy the **Connection Pooling** connection string
   - Format: `postgresql://postgres.orqupfsguquusnethtbt:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

2. Update `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres.orqupfsguquusnethtbt:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

3. Restart the container:
   ```bash
   docker compose -f infra/docker-compose.monolith.yml restart monolith
   ```

**Note:** The pooler is for direct PostgreSQL connections. Since we're using Supabase SDK REST API, this may not help unless we also switch back to direct PostgreSQL queries.

### Option 3: Run Outside Docker (For Development)

For local development, you can run the monolith directly on the host (not in Docker):

```bash
cd /Users/n15318/LoS
pnpm install
cd services/monolith
pnpm build
pnpm start
```

This uses the host's DNS resolver and should work immediately.

## Code Changes Made

We've already updated the code to use Supabase SDK REST API instead of direct PostgreSQL connections:

1. **`services/monolith/src/rm-dashboard.ts`**:
   - Changed from `querySupabase()` (which uses direct PostgreSQL) to `supabaseClient.from().select()` (HTTP REST API)
   - This avoids direct database connections that fail in Docker

2. **`shared/libs/src/supabase-client.ts`**:
   - Already configured to use Supabase SDK with HTTP REST API
   - Direct PostgreSQL connections are only used as fallback for local PostgreSQL

## Verification

After applying one of the solutions above, test the connection:

```bash
# Test dashboard endpoint
curl -H "X-User-Id: 00000001-0000-0000-0000-000000000001" \
  http://localhost:3000/api/applications/rm/dashboard

# Check logs
docker logs los-monolith --tail 20 | grep -E "RMDashboard|error"
```

## Recommendation

**Start with Option 1** (Docker Desktop DNS configuration) as it's the simplest and most reliable solution. It requires a one-time configuration and will fix the issue for all future Docker deployments.

If Option 1 doesn't work or isn't possible, use Option 3 (run outside Docker) for local development, and use Option 2 (pooler) for production deployments.

