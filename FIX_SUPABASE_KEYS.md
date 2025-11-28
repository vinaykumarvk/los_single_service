# Fix Supabase API Keys

## Issue
The dashboard is showing 0 applications because the Supabase API keys in `.env` are placeholders, causing "Invalid API key" errors.

## Solution

### Step 1: Get Your Supabase Keys

1. Go to your Supabase dashboard:
   https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/api

2. Copy the **Service Role Key** (recommended) or **Anon Key**

### Step 2: Update .env File

Edit `/Users/n15318/LoS/.env` and replace the placeholder values:

```bash
# Replace these lines:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# With your actual keys:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODc2NDMyMCwiZXhwIjoyMDE0MzQwMzIwfQ.YOUR_ACTUAL_KEY
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ycXVwZnNndXF1dXNuZXRodGJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg3NjQzMjAsImV4cCI6MjAxNDM0MDMyMH0.YOUR_ACTUAL_KEY
```

### Step 3: Restart the Service

After updating the keys, restart the monolith service:

```bash
./stop-monolith.sh
./start-monolith.sh
```

Or if using the restart script:
```bash
./restart-with-env.sh
```

## Verification

After restarting, check the logs:
```bash
tail -f logs/monolith.log
```

You should see:
```
✅ Supabase SDK client initialized - all database operations will use Supabase SDK
```

And NO errors like:
- ❌ "Invalid API key"
- ❌ "SUPABASE_SERVICE_ROLE_KEY must be set"

## Why Service Role Key?

The **Service Role Key** is recommended because:
- Bypasses Row Level Security (needed for server operations)
- Full database access
- More secure for backend services

The **Anon Key** can work but may have limited access depending on your RLS policies.

