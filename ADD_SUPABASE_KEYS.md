# Add Supabase Keys to .env File

## Quick Fix

Your `.env` file is missing the Supabase API keys. You need to add them:

1. **Get your Supabase keys:**
   - Go to: https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/api
   - Copy the **Service Role Key** (recommended) or **Anon Key**

2. **Add to .env file:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

3. **Restart the service:**
   ```bash
   ./stop-monolith.sh
   ./start-monolith.sh
   ```

## Current .env Status

Your `.env` file currently has:
- ✅ `DATABASE_URL` - Set correctly
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - **MISSING** (needs to be added)
- ❌ `SUPABASE_ANON_KEY` - **MISSING** (optional, but good to have)

## Why You Need These Keys

The Supabase SDK needs these keys to:
- Authenticate API requests
- Access the Supabase REST API
- Use Supabase features (realtime, storage, etc.)

The **Service Role Key** is recommended because it:
- Bypasses Row Level Security (needed for server operations)
- Has full database access
- Is more secure for backend services

## After Adding Keys

Once you've added the keys to `.env`, restart the service and you should see:
```
✅ Supabase SDK client initialized - all database operations will use Supabase SDK
```

