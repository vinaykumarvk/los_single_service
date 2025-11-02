# Fixes Applied for Minor Issues

**Date**: $(date)  
**Status**: ✅ **FIXED**

---

## Issue Fixed: KYC Service Returns 500 Instead of 404

### Problem
The `GET /api/applicants/:id` endpoint was returning HTTP 500 instead of HTTP 404 when an applicant was not found.

### Root Cause
The SQL query was trying to select the `dob` column, but after the migration `0005_add_missing_fields.sql`, the `dob` column was renamed to `date_of_birth`. The query still referenced `dob`, causing a database error that was caught and returned as a 500 error.

### Solution Applied

1. **Fixed SQL Query**:
   - Changed from `COALESCE(date_of_birth, dob) as date_of_birth, dob` 
   - To `date_of_birth, date_of_birth as dob`
   - This ensures the query only uses the existing `date_of_birth` column

2. **Improved Error Handling**:
   - Added separate try-catch for the database query
   - Better error logging to distinguish between "not found" and database errors
   - Wrapped decryption in try-catch to prevent failures from affecting the response
   - Added check for database schema errors (column/table not found)

### Code Changes

**File**: `services/customer-kyc/src/server.ts`

**Changes**:
- Fixed SQL query to use only `date_of_birth` column
- Added nested try-catch for better error handling
- Added decryption error handling (non-fatal)
- Improved error logging with more context

### Verification

```bash
# Test with non-existent applicant ID
curl http://localhost:3002/api/applicants/00000000-0000-0000-0000-000000000000
# Expected: HTTP 404 with {"error": "Applicant not found"}
```

---

## Test Results

✅ **Before Fix**: HTTP 500  
✅ **After Fix**: HTTP 404

The endpoint now correctly returns 404 for non-existent applicants.

---

**Fix Status**: ✅ **COMPLETE**

