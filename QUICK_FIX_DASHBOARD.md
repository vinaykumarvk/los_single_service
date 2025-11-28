# Quick Fix for Dashboard Issue

## Problem
Dashboard shows 0 applications because Supabase API keys are placeholders in .env file.

## Solution

**Edit `/Users/n15318/LoS/.env` and replace:**

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
```

**With your actual keys from:**
https://supabase.com/dashboard/project/orqupfsguquusnethtbt/settings/api

**Then restart:**
```bash
./restart-with-env.sh
```

The keys should be long JWT tokens starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
