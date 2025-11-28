# Supabase Setup Verification Guide

## ✅ Status: All Code Converted to Supabase SDK

All database interactions have been successfully converted to use the Supabase SDK. Since you have both keys set, here's how to verify everything is working:

## Environment Variables

Your environment should have:
- `DATABASE_URL` - Supabase PostgreSQL connection string (format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (recommended)
- `SUPABASE_ANON_KEY` - Anon key (fallback, if service role not set)

## How It Works

1. **On Service Startup:**
   - `createSupabaseClient()` reads `DATABASE_URL`
   - Extracts project ID from the connection string
   - Constructs Supabase URL: `https://{projectId}.supabase.co`
   - Uses `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY` as fallback)
   - Initializes Supabase client

2. **Database Operations:**
   - Simple queries → Supabase query builder (where possible)
   - Complex queries → Raw SQL via fallback
   - Transactions → `connectSupabase()` returns transaction object
   - RPC calls → `executeRPC()` function

## Verification Steps

### 1. Check Service Startup

Start any service and look for this log message:
```bash
cd services/monolith
pnpm dev
```

Expected output:
```
✅ Supabase SDK client initialized - all database operations will use Supabase SDK
```

If you see an error, check:
- `DATABASE_URL` is set correctly
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY` is set
- Connection string format is correct

### 2. Test Database Operations

#### Test Authentication:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### Test Application Creation:
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "applicantId": "test-id",
    "channel": "Online",
    "productCode": "HL",
    "requestedAmount": 100000,
    "requestedTenureMonths": 12
  }'
```

#### Test Product Listing:
```bash
curl http://localhost:3004/api/masters/products
```

### 3. Check for Errors

If you see errors like:
- `SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set` → Set the environment variable
- `Invalid Supabase DATABASE_URL format` → Check your DATABASE_URL format
- `Failed to initialize Supabase client` → Verify keys are correct

## What's Different Now

### Before (Direct PostgreSQL):
```typescript
const pool = createPgPool();
const { rows } = await pool.query('SELECT * FROM users', []);
```

### After (Supabase SDK):
```typescript
const supabaseClient = createSupabaseClient();
const { rows } = await querySupabase(supabaseClient, 'SELECT * FROM users', []);
```

## All Services Converted

✅ Monolith Service  
✅ Application Service  
✅ Auth Service  
✅ Customer KYC Service  
✅ Document Service  
✅ Masters Service  
✅ Shared Libraries (blacklist, outboxPublisher)

## Next Steps

1. **Start services** and verify they connect to Supabase
2. **Test key operations** (login, create application, etc.)
3. **Monitor logs** for any Supabase-related errors
4. **Verify transactions** work correctly (create application with outbox event)

Everything should work seamlessly! The code now uses Supabase SDK for all database operations while maintaining compatibility with your existing SQL queries.

