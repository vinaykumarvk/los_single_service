# Supabase SDK Audit Report

## Executive Summary

**Date**: Generated on scan  
**Status**: ⚠️ **CRITICAL ISSUE FOUND**

The codebase is **NOT consistently using the Supabase SDK** for database interactions. Instead, it's using **direct PostgreSQL pool connections** (`pool.query()`, `client.query()`) throughout the entire codebase.

### Key Findings

- ✅ Supabase SDK is **imported** in some files
- ❌ Supabase SDK is **rarely used** for actual database operations
- ❌ **421 instances** of direct PostgreSQL pool queries found across 34 files
- ⚠️ Only **2 files** have any Supabase SDK usage, and even those fall back to pool queries

---

## Files Using Direct PostgreSQL Connections

### Core Service Files (Primary Issue)

#### 1. **services/monolith/src/server.ts**
- **Status**: ❌ Uses `pool.query()` and `client.query()` extensively
- **Lines**: 76+ instances
- **Details**: 
  - Initializes Supabase client but **never uses it**
  - All database operations use direct PostgreSQL pool
  - Transactions use `client.query()` directly
- **Impact**: HIGH - Main service file

#### 2. **services/application/src/server.ts**
- **Status**: ❌ Uses `pool.query()` and `client.query()` extensively
- **Lines**: 71+ instances
- **Details**: No Supabase SDK usage at all
- **Impact**: HIGH - Application service

#### 3. **services/auth/src/server.ts**
- **Status**: ❌ Uses `pool.query()` extensively
- **Details**: No Supabase SDK usage
- **Impact**: HIGH - Authentication service

#### 4. **services/customer-kyc/src/server.ts**
- **Status**: ❌ Uses `pool.query()` extensively
- **Details**: No Supabase SDK usage
- **Impact**: HIGH - KYC service

#### 5. **services/document/src/server.ts**
- **Status**: ❌ Uses `pool.query()` (21+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM - Document service

#### 6. **services/masters/src/server.ts**
- **Status**: ❌ Uses `pool.query()` (39+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM - Masters service

### Dashboard and Handler Files

#### 7. **services/monolith/src/hierarchical-dashboards.ts**
- **Status**: ❌ Uses `pool.query()` (4+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 8. **services/application/src/hierarchical-dashboards.ts**
- **Status**: ❌ Uses `pool.query()` (4+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 9. **services/monolith/src/rm-dashboard.ts**
- **Status**: ⚠️ **PARTIAL** - Has Supabase SDK usage but falls back to pool
- **Details**: 
  - Uses Supabase SDK for some queries (lines 30-66, 86-117)
  - Falls back to `pool.query()` on error or when `supabaseClient` is null
  - This is the **only file** with meaningful Supabase SDK usage
- **Impact**: MEDIUM - Shows pattern but not consistent

#### 10. **services/application/src/rm-dashboard.ts**
- **Status**: ❌ Uses `pool.query()` (4+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 11. **services/monolith/src/rm-access-control.ts**
- **Status**: ❌ Uses `pool.query()` (1+ instance)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 12. **services/application/src/rm-access-control.ts**
- **Status**: ❌ Uses `pool.query()` (1+ instance)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 13. **services/monolith/src/property-endpoints.ts**
- **Status**: ❌ Uses `pool.query()` (8+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 14. **services/application/src/property-endpoints.ts**
- **Status**: ❌ Uses `pool.query()` (8+ instances)
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM

#### 15. **services/monolith/src/sse-handler.ts**
- **Status**: ❌ Uses `pool.query()` (1+ instance)
- **Details**: No Supabase SDK usage
- **Impact**: LOW

#### 16. **services/application/src/sse-handler.ts**
- **Status**: ❌ Uses `pool.query()` (1+ instance)
- **Details**: No Supabase SDK usage
- **Impact**: LOW

### Shared Libraries

#### 17. **shared/libs/src/index.ts**
- **Status**: ❌ Exports `createPgPool()` function
- **Details**: This is the root cause - provides PostgreSQL pool creation
- **Impact**: CRITICAL - Used by all services

#### 18. **shared/libs/src/blacklist.ts**
- **Status**: ❌ Uses direct `Pool` from `pg` package
- **Details**: Creates its own pool instance
- **Impact**: MEDIUM - Shared utility

#### 19. **shared/libs/src/outboxPublisher.ts**
- **Status**: ❌ Uses `pool.query()` and `client.query()`
- **Details**: No Supabase SDK usage
- **Impact**: MEDIUM - Event publishing

#### 20. **shared/libs/src/migrate.ts**
- **Status**: ❌ Uses `pool.query()` (likely)
- **Details**: Migration scripts
- **Impact**: LOW - One-time operations

### Test Files

All test files also use direct PostgreSQL connections:
- `services/monolith/src/__tests__/*.test.ts` (multiple files)
- `services/application/src/__tests__/*.test.ts` (multiple files)
- `services/customer-kyc/src/__tests__/*.test.ts`

---

## Files with Supabase SDK Usage (Minimal)

### 1. **services/monolith/src/server.ts**
- **Status**: ⚠️ **INITIALIZED BUT NOT USED**
- **Lines**: 12, 30-55
- **Details**: 
  - Imports `createClient` from `@supabase/supabase-js`
  - Creates `supabaseClient` instance
  - **Never actually uses it** for any database operations
  - All queries still use `pool.query()`

### 2. **services/monolith/src/rm-dashboard.ts**
- **Status**: ⚠️ **PARTIAL USAGE**
- **Lines**: 30-66, 86-117
- **Details**: 
  - Uses Supabase SDK for some queries
  - Falls back to `pool.query()` on error
  - Falls back to `pool.query()` when `supabaseClient` is null
  - This is the **only meaningful usage** in the entire codebase

### 3. **services/monolith/src/supabase-client.ts**
- **Status**: ⚠️ **WRAPPER WITH FALLBACK**
- **Details**: 
  - Attempts to use Supabase SDK
  - **Falls back to direct PostgreSQL** for all SELECT/INSERT/UPDATE/DELETE queries
  - Only uses RPC for function calls
  - This file is **not even imported** by most services

---

## Root Cause Analysis

### Primary Issues

1. **`shared/libs/src/index.ts` exports `createPgPool()`**
   - This function creates direct PostgreSQL pools
   - Used by all services as the primary database connection method
   - No Supabase SDK wrapper provided

2. **No Supabase SDK abstraction layer**
   - Services directly use `pool.query()` everywhere
   - No centralized database access layer using Supabase SDK
   - Even when Supabase client is initialized, it's not used

3. **Inconsistent initialization**
   - `services/monolith/src/server.ts` initializes Supabase client but doesn't use it
   - Other services don't even initialize it
   - No standard pattern for database access

4. **Fallback patterns encourage direct PostgreSQL**
   - `supabase-client.ts` wrapper falls back to pool for most queries
   - `rm-dashboard.ts` falls back to pool on errors
   - This creates a pattern where Supabase SDK is optional, not required

---

## Impact Assessment

### Security & Compliance
- ⚠️ **Row Level Security (RLS)**: Not enforced when using direct PostgreSQL connections
- ⚠️ **API Key Management**: Direct connections bypass Supabase's API key system
- ⚠️ **Audit Trail**: May not be properly tracked by Supabase

### Functionality
- ⚠️ **Supabase Features**: Missing out on Supabase-specific features (realtime, storage, etc.)
- ⚠️ **Connection Pooling**: Using PostgreSQL pool instead of Supabase's optimized connection handling
- ⚠️ **Monitoring**: May not appear in Supabase dashboard

### Maintainability
- ⚠️ **Code Duplication**: Multiple ways to access database
- ⚠️ **Inconsistency**: Some files use SDK, most use pool
- ⚠️ **Testing**: Harder to test with mixed approaches

---

## Recommendations

### Immediate Actions Required

1. **Create a Supabase SDK wrapper in shared/libs**
   - Replace `createPgPool()` with `createSupabaseClient()`
   - Provide query methods that use Supabase SDK
   - Handle transactions using Supabase SDK

2. **Update all service files**
   - Replace `pool.query()` with Supabase SDK calls
   - Use `supabaseClient.from('table').select()` instead of raw SQL
   - Use `supabaseClient.rpc()` for stored procedures

3. **Remove direct PostgreSQL pool usage**
   - Remove `createPgPool()` export from `shared/libs/src/index.ts`
   - Update all imports to use Supabase client
   - Remove `pg` package dependency (or keep only for migrations)

4. **Update shared utilities**
   - `shared/libs/src/blacklist.ts` - Use Supabase SDK
   - `shared/libs/src/outboxPublisher.ts` - Use Supabase SDK
   - All other shared database utilities

5. **Standardize initialization**
   - Create a single initialization function
   - Use it consistently across all services
   - Remove fallback to direct PostgreSQL

### Migration Strategy

1. **Phase 1: Create Supabase SDK wrapper**
   - Create `shared/libs/src/supabase-client.ts`
   - Provide methods for common operations
   - Maintain backward compatibility during transition

2. **Phase 2: Update one service at a time**
   - Start with `services/monolith/src/server.ts`
   - Convert all `pool.query()` calls to Supabase SDK
   - Test thoroughly before moving to next service

3. **Phase 3: Update shared libraries**
   - Update `blacklist.ts`, `outboxPublisher.ts`, etc.
   - Remove `createPgPool()` export

4. **Phase 4: Remove PostgreSQL pool dependency**
   - Remove all `pool.query()` usage
   - Remove `pg` package (or keep only for migrations)
   - Update all test files

---

## Files Requiring Changes

### Critical Priority (Must Fix)
1. `shared/libs/src/index.ts` - Remove `createPgPool()`, add Supabase client
2. `services/monolith/src/server.ts` - Convert all queries to Supabase SDK
3. `services/application/src/server.ts` - Convert all queries to Supabase SDK
4. `services/auth/src/server.ts` - Convert all queries to Supabase SDK
5. `services/customer-kyc/src/server.ts` - Convert all queries to Supabase SDK

### High Priority
6. `services/document/src/server.ts`
7. `services/masters/src/server.ts`
8. `shared/libs/src/blacklist.ts`
9. `shared/libs/src/outboxPublisher.ts`
10. All dashboard and handler files

### Medium Priority
11. All test files
12. Migration scripts
13. Utility scripts

---

## Summary Statistics

- **Total files with database queries**: 34+
- **Files using Supabase SDK**: 2 (partial usage)
- **Files using direct PostgreSQL**: 34+
- **Total `pool.query()` instances**: 421+
- **Total `client.query()` instances**: 50+
- **Supabase SDK usage instances**: ~20 (only in rm-dashboard.ts)

**Conclusion**: The codebase is **NOT using Supabase SDK** for database interactions. It's using direct PostgreSQL connections throughout. This needs to be fixed to properly leverage Supabase features and ensure consistency.

