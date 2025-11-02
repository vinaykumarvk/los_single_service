# Hierarchical Dashboard Implementation

## ✅ Implementation Summary

### Architecture: Dynamic Runtime Aggregation

All aggregate values are **computed at runtime** based on reporting hierarchy stored in the database. When mappings change, aggregates automatically reflect the new structure.

---

## 📊 Hierarchy Structure

```
Regional Head (1)
    ├── SRM1 (Senior Relationship Manager 1)
    │   ├── RM1 (4 RMs)
    │   ├── RM2
    │   ├── RM3
    │   └── RM4
    │
    ├── SRM2 (Senior Relationship Manager 2)
    │   ├── RM5 (4 RMs)
    │   ├── RM6
    │   ├── RM7
    │   └── RM8
    │
    └── SRM3 (Senior Relationship Manager 3)
        ├── RM9 (2 RMs)
        └── RM10

Total: 1 Regional Head + 3 SRMs + 10 RMs = 14 users
```

---

## 🗄️ Database Schema

### Migration: `0003_add_reporting_hierarchy.sql`

Added to `users` table:
- `reports_to` (UUID) - References manager's user_id (NULL for top level)
- `employee_id` (TEXT) - Unique employee identifier
- `designation` (TEXT) - Job title (RM, SRM, Regional Head)

**Key Design**:
- **Self-referential relationship**: `users.reports_to → users.user_id`
- **Recursive queries**: Use CTE to get all subordinates at any level
- **Dynamic computation**: Aggregates computed on every API call

---

## 🔧 API Endpoints

### 1. RM Dashboard (Individual)
**Endpoint**: `GET /api/dashboard/rm/:userId`

**Response**:
```json
{
  "userId": "uuid",
  "totalApplications": 13,
  "applicationsByStatus": {
    "Draft": 2,
    "Submitted": 5,
    "InProgress": 3,
    "Approved": 3
  },
  "totalRequestedAmount": 6500000,
  "averageTAT": 5.2,
  "pipeline": { ... }
}
```

### 2. SRM Dashboard (Aggregated)
**Endpoint**: `GET /api/dashboard/srm/:srmId?includeReportees=true`

**Response**:
```json
{
  "srmId": "uuid",
  "totalApplications": 52,  // Sum of all RMs under this SRM
  "applicationsByStatus": { ... },  // Aggregated across all RMs
  "totalRequestedAmount": 26000000,  // Sum of all RMs
  "averageTAT": 4.8,
  "pipeline": { ... },
  "reportees": [  // Optional - if includeReportees=true
    {
      "userId": "rm1-id",
      "username": "rm1",
      "designation": "Relationship Manager",
      "metrics": { ... }  // Individual RM metrics
    },
    ...
  ]
}
```

**Computation**:
- Gets all RMs where `reports_to = srmId`
- Aggregates applications assigned to those RMs
- Computes metrics dynamically from current data

### 3. Regional Head Dashboard (Aggregated)
**Endpoint**: `GET /api/dashboard/regional-head/:headId?includeReportees=true`

**Response**:
```json
{
  "regionalHeadId": "uuid",
  "totalApplications": 130,  // Sum of all RMs under all SRMs
  "applicationsByStatus": { ... },  // Aggregated across entire region
  "totalRequestedAmount": 65000000,
  "averageTAT": 5.0,
  "pipeline": { ... },
  "reportees": [  // Optional - SRMs with their aggregated metrics
    {
      "userId": "srm1-id",
      "username": "srm1",
      "designation": "Senior Relationship Manager",
      "metrics": { ... }  // SRM's aggregated metrics (all their RMs)
    },
    ...
  ]
}
```

**Computation**:
- Recursively gets all SRMs where `reports_to = headId`
- For each SRM, gets all their RMs (recursive)
- Aggregates all applications assigned to all RMs in hierarchy
- Computes metrics dynamically

### 4. Drill-Down: Get Reportees
**Endpoint**: `GET /api/hierarchy/reportees/:managerId`

**Response**:
```json
{
  "managerId": "uuid",
  "reportees": [
    {
      "userId": "reportee-id",
      "username": "srm1",
      "email": "srm1@los.local",
      "designation": "Senior Relationship Manager",
      "roles": ["srm"],
      "metrics": { ... }  // Aggregated metrics for this reportee
    },
    ...
  ]
}
```

**Use Case**: Click on SRM in Regional Head dashboard → See all RMs under that SRM

---

## 🔄 Dynamic Mapping Updates

### Example: Reassign RM from SRM1 to SRM2

**Before**:
- SRM1 has 4 RMs (RM1-4)
- SRM2 has 4 RMs (RM5-8)

**Update Mapping**:
```sql
UPDATE users 
SET reports_to = 'srm2-id'  -- Move RM1 from SRM1 to SRM2
WHERE user_id = 'rm1-id';
```

**After** (Automatic - No manual aggregate updates needed):
- SRM1 dashboard now shows 3 RMs (RM2-4) - **automatically recomputed**
- SRM2 dashboard now shows 5 RMs (RM1, RM5-8) - **automatically recomputed**
- Regional Head dashboard reflects new structure - **automatically recomputed**

**Next API Call**:
- `GET /api/dashboard/srm/srm1-id` → Returns aggregated metrics for RM2, RM3, RM4 only
- `GET /api/dashboard/srm/srm2-id` → Returns aggregated metrics for RM1, RM5, RM6, RM7, RM8

**No cache invalidation needed** - Aggregates computed fresh on each request!

---

## 📈 Aggregation Logic

### Recursive Subordinate Query

```sql
WITH RECURSIVE subordinates AS (
  -- Base case: Direct reportees
  SELECT user_id, reports_to
  FROM users
  WHERE reports_to = $managerId AND is_active = true
  
  UNION ALL
  
  -- Recursive case: Reportees of reportees
  SELECT u.user_id, u.reports_to
  FROM users u
  INNER JOIN subordinates s ON u.reports_to = s.user_id
  WHERE u.is_active = true
)
SELECT user_id FROM subordinates;
```

This gets **all subordinates at all levels**, so:
- Regional Head query gets: SRM1, SRM2, SRM3, RM1, RM2, ..., RM10
- SRM1 query gets: RM1, RM2, RM3, RM4

### Aggregate Application Metrics

```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'Draft') as draft,
  COUNT(*) FILTER (WHERE status = 'Submitted') as submitted,
  ...
  COALESCE(SUM(requested_amount), 0) as total_amount,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_tat_days
FROM applications
WHERE assigned_to = ANY($subordinate_ids::uuid[])
```

---

## 🧪 Testing Dynamic Updates

### Test Scenario 1: Move RM to Different SRM

```sql
-- Move RM1 from SRM1 to SRM2
UPDATE users 
SET reports_to = '00000000-0000-0000-0000-000000000020'  -- SRM2 ID
WHERE user_id = '00000001-0000-0000-0000-000000000001';  -- RM1 ID
```

**Verify**:
1. `GET /api/dashboard/srm/00000000-0000-0000-0000-000000000010` (SRM1)
   - Should show 3 RMs (RM2, RM3, RM4)
   - Total applications: ~39 (13 × 3)
2. `GET /api/dashboard/srm/00000000-0000-0000-0000-000000000020` (SRM2)
   - Should show 5 RMs (RM1, RM5, RM6, RM7, RM8)
   - Total applications: ~65 (13 × 5)
3. Regional Head dashboard automatically reflects new structure

### Test Scenario 2: Change Regional Head

```sql
-- Move SRM3 to report to different manager (if exists)
UPDATE users 
SET reports_to = 'new-regional-head-id'
WHERE user_id = '00000000-0000-0000-0000-000000000030';  -- SRM3
```

**Verify**:
- Old Regional Head dashboard no longer includes SRM3's RMs
- New Regional Head dashboard includes SRM3's RMs

---

## 🎯 Key Features

✅ **Runtime Computation**: Aggregates computed on every API call  
✅ **No Hardcoding**: All mappings stored in database  
✅ **Automatic Updates**: Changing `reports_to` immediately affects aggregates  
✅ **Recursive Hierarchy**: Supports any depth (RM → SRM → Regional Head → ...)  
✅ **Drill-Down**: Navigate from Regional Head → SRM → RM  
✅ **Flexible**: Easy to add more levels or change structure  

---

## 📝 Implementation Files

1. **Database Schema**:
   - `services/auth/migrations/0003_add_reporting_hierarchy.sql` - Adds `reports_to` column

2. **Seed Data**:
   - `services/auth/migrations/0004_seed_hierarchy_users.sql` - Creates 14 users with hierarchy

3. **Aggregation Logic**:
   - `services/application/src/hierarchical-dashboards.ts` - Core computation functions

4. **Application Distribution**:
   - `services/application/migrations/0008_distribute_apps_to_10_rms.sql` - Assigns ~13 apps per RM

5. **Integration**:
   - `services/application/src/server.ts` - Registers dashboard endpoints

---

## 🚀 Next Steps

1. **Frontend Components**:
   - Dashboard UI for Regional Head
   - Dashboard UI for SRM
   - Drill-down navigation (click SRM → see RMs)

2. **Access Control**:
   - Verify user has permission to view their hierarchy level
   - Regional Head can see all, SRM can see only their RMs

3. **Performance Optimization** (if needed):
   - Cache aggregates with TTL (but invalidate on mapping changes)
   - Materialized views for very large hierarchies

4. **Keycloak Integration**:
   - Create users in Keycloak with matching user IDs
   - Map Keycloak roles: `rm`, `srm`, `regional_head`

---

## 📖 Related Documentation

- `RM_ASSIGNMENT_TESTING_GUIDE.md` - Testing application assignments
- `PERSONA_TESTING_GUIDE.md` - Persona-based access control

