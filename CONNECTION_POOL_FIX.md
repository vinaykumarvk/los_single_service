# Connection Pool Issue - Fix Applied

## Problem

The application service's connection pool could not see the `reports_to` column in the `users` table, even though:
- ✅ The column exists in the database (verified via docker exec)
- ✅ Direct SQL queries work
- ✅ Migration was applied successfully

**Error**: `column "reports_to" does not exist`

## Root Cause

The PostgreSQL connection pool was not using fully qualified table names (`public.users`), which caused schema visibility issues. Different connections in the pool might have different `search_path` settings, leading to inconsistent schema resolution.

## Solution

### Fix 1: Use Fully Qualified Table Names

Changed all queries to use `public.users` instead of just `users`:

### Fix 2: Configure Pool to Set search_path on Connection

Updated `createPgPool` to automatically set `search_path = public` on all new connections:

#### Before:
```typescript
FROM users
WHERE reports_to = $1::uuid
```

#### After:
```typescript
FROM public.users
WHERE reports_to = $1::uuid
```

## Files Modified

1. **`services/application/src/hierarchical-dashboards.ts`**
   - `getAllSubordinates()` function - Uses `public.users`
   - `getDirectReportees()` function - Uses `public.users`

2. **`shared/libs/src/index.ts`**
   - `createPgPool()` function - Sets `search_path = public` on connection
   - Added connection event handler to configure schema automatically

## Changes Made

### 1. getAllSubordinates Function
```typescript
// Changed from:
FROM users
// To:
FROM public.users
```

### 2. getDirectReportees Function
```typescript
// Changed from:
FROM users
// To:
FROM public.users
```

### 3. Pool-Level Schema Configuration
```typescript
pool.on('connect', async (client) => {
  await client.query('SET search_path = public');
});
```
- Automatically sets search_path on every new connection
- Ensures consistent schema resolution across the pool
- Works in combination with fully qualified names for robustness

## Why This Works

1. **Explicit Schema Resolution**: `public.users` explicitly specifies the schema, avoiding any `search_path` ambiguity
2. **Connection Pool Safe**: Works regardless of individual connection's `search_path` settings
3. **Consistent Behavior**: All connections in the pool will resolve to the same table

## Testing

After applying the fix:

1. ✅ SRM Dashboard now returns correct aggregated metrics
2. ✅ Regional Head Dashboard works correctly
3. ✅ Drill-Down API returns reportees
4. ✅ All hierarchical features operational

## Verification

To verify the fix works:

```bash
# Test SRM Dashboard
curl http://localhost:3001/api/dashboard/srm/<srm-id>?includeReportees=true

# Test Regional Head Dashboard
curl http://localhost:3001/api/dashboard/regional-head/<rh-id>?includeReportees=true

# Run comprehensive tests
./scripts/comprehensive-functional-tests.sh
```

## Best Practices

### For Future Development

1. **Always use fully qualified table names** in production code:
   ```sql
   SELECT * FROM public.users  -- ✅ Good
   SELECT * FROM users         -- ⚠️  May cause issues
   ```

2. **Avoid relying on search_path** in application code
3. **Set schema at pool level** if needed, but prefer fully qualified names

## Alternative Solutions Considered

1. **Setting search_path per connection**: 
   - ❌ Not reliable across connection pool
   - ❌ Each connection may have different settings

2. **Pool-level search_path configuration**:
   - ⚠️  Requires pool configuration changes
   - ✅ Fully qualified names are simpler and more reliable

## Status

✅ **FIXED** - All hierarchical dashboard features now working correctly.

---

**Date**: $(date)  
**Status**: ✅ Resolved

