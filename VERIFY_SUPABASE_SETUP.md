# Verify Supabase Setup

## Environment Variables Check

Since you have both keys set, let's verify the setup is working correctly.

### Required Environment Variables:
- ✅ `DATABASE_URL` - Your Supabase PostgreSQL connection string
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key (recommended for server-side)
- ✅ `SUPABASE_ANON_KEY` - Anon key (alternative, but service role is better)

### Quick Verification

1. **Check if variables are set:**
   ```bash
   echo $DATABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Test Supabase connection:**
   The code will automatically:
   - Extract project ID from DATABASE_URL
   - Use SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY as fallback)
   - Initialize Supabase client on service startup

3. **Start a service and check logs:**
   ```bash
   cd services/monolith
   pnpm dev
   ```
   
   You should see:
   ```
   ✅ Supabase SDK client initialized - all database operations will use Supabase SDK
   ```

### What the Code Does

The `createSupabaseClient()` function:
1. Reads `DATABASE_URL`
2. If it contains `supabase.co`, extracts the project ID
3. Constructs Supabase URL: `https://{projectId}.supabase.co`
4. Uses `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY` as fallback)
5. Creates and returns Supabase client

### Important Notes

- **Service Role Key** is recommended because:
  - Bypasses Row Level Security (RLS) - needed for server-side operations
  - Full database access - required for admin operations
  - More secure for backend services

- **Anon Key** can be used but:
  - Respects RLS policies
  - May have limited access
  - Better for client-side operations

### Testing Database Operations

Once services start, test:
1. User login (auth service)
2. Create application (monolith/application service)
3. Query products (masters service)
4. Upload document (document service)

All operations should work seamlessly with Supabase SDK!

