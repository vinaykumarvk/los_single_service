# Fix 500 Error on Create Application

## Issue Summary
The frontend is getting a 500 error when creating applications. This guide fixes the root causes.

## Root Causes Identified

1. **Backend Mismatch**: Frontend is configured to use port 3001 (application service) but only monolith on port 3000 is running
2. **SSL Certificate Error**: Supabase connection has "self-signed certificate in certificate chain" error
3. **Insufficient Error Logging**: Full stack traces not being captured

## Fixes Applied

### 1. Frontend Configuration
Update `web/.env.local` to point to the monolith:

```bash
# Using monolith on port 3000 (all services consolidated)
VITE_API_GATEWAY=http://localhost:3000
```

**Action Required**: 
- Edit `web/.env.local` and set `VITE_API_GATEWAY=http://localhost:3000`
- Remove or comment out `VITE_API_APPLICATION=http://localhost:3001/api`
- Restart the web dev server: `cd web && pnpm dev`

### 2. SSL Certificate Fix
The SSL configuration has been improved in `shared/libs/src/index.ts` to:
- Automatically add `sslmode=require` to Supabase connection strings
- Set `rejectUnauthorized: false` to handle self-signed certificates

**Action Required**:
- Ensure `DATABASE_URL` includes your Supabase connection string
- Restart the monolith service to pick up the changes

### 3. Enhanced Error Logging
The monolith's `/api/applications` POST endpoint now logs:
- Full stack traces
- Error names
- Request payloads
- Correlation IDs

**No action required** - already applied.

## Verification Steps

1. **Check which backend is running**:
   ```bash
   lsof -i :3000 -i :3001
   # Should show monolith on 3000
   ```

2. **Check frontend config**:
   ```bash
   cat web/.env.local | grep VITE_API
   # Should show VITE_API_GATEWAY=http://localhost:3000
   ```

3. **Check database connection**:
   ```bash
   echo $DATABASE_URL | grep supabase
   # Should show your Supabase URL
   ```

4. **Test application creation**:
   - Open browser dev tools (Network tab)
   - Try creating an application
   - Check the request URL - should be `http://localhost:3000/api/applications`
   - Check backend logs: `tail -f logs/monolith.log`

5. **Check error logs**:
   ```bash
   tail -n 120 logs/monolith.log | grep -A 20 "CreateApplicationError"
   ```

## Expected Payload

The API expects:
```json
{
  "applicantId": "uuid-string",
  "productCode": "HOME_LOAN_V1" or "PERSONAL_LOAN_V1",
  "requestedAmount": 500000,
  "requestedTenureMonths": 240,
  "channel": "Mobile" | "Branch" | "DSA" | "Online"
}
```

The frontend (`web/src/rm/pages/NewApplication.tsx`) generates `applicantId` using `crypto.randomUUID()`, which is correct.

## Next Steps

1. Update `web/.env.local` as described above
2. Restart web dev server
3. Restart monolith if needed
4. Try creating an application again
5. If still failing, check `logs/monolith.log` for the full error stack trace

## Getting Full Error Details

After applying fixes, if you still get a 500 error:

```bash
# Watch logs in real-time
tail -f logs/monolith.log

# Then try creating an application in the UI
# The error will appear in the logs with full stack trace
```

The error will now include:
- Full stack trace
- Error message
- Request payload
- Correlation ID

