# Comprehensive Testing Guide - Hierarchical Dashboards

## ✅ Setup Complete

### Database Setup
- ✅ Users table created with `reports_to`, `employee_id`, `designation`
- ✅ 14 users created: 1 Regional Head, 3 SRMs, 10 RMs
- ✅ Hierarchy mappings established:
  - Regional Head → 3 SRMs
  - SRM1 → 4 RMs (RM1-4)
  - SRM2 → 4 RMs (RM5-8)
  - SRM3 → 2 RMs (RM9-10)
- ✅ ~130 applications distributed (~13 per RM)

---

## 🧪 Test Scenarios

### Test 1: Verify Hierarchy Structure

```bash
# Check all users and their managers
docker exec los-postgres psql -U los -d los -c "
SELECT 
  u.username,
  u.designation,
  u.employee_id,
  m.username as reports_to
FROM users u
LEFT JOIN users m ON u.reports_to = m.user_id
WHERE u.designation IN ('Regional Head', 'Senior Relationship Manager', 'Relationship Manager')
ORDER BY 
  CASE u.designation 
    WHEN 'Regional Head' THEN 1
    WHEN 'Senior Relationship Manager' THEN 2
    WHEN 'Relationship Manager' THEN 3
  END,
  u.username;
"
```

**Expected**:
- 1 Regional Head (no reports_to)
- 3 SRMs (all report to Regional Head)
- 10 RMs (distributed among SRMs)

---

### Test 2: RM Dashboard (Individual)

**Endpoint**: `GET /api/dashboard/rm/:userId`

```bash
# Get RM1 user ID
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" | tr -d ' ')

# Call API
curl http://localhost:3001/api/dashboard/rm/${RM1_ID}
```

**Expected Response**:
```json
{
  "userId": "00000001-0000-0000-0000-000000000001",
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

**Verify**:
- ✅ Returns only RM1's applications (13 total)
- ✅ All metrics based on RM1's assigned applications

---

### Test 3: SRM Dashboard (Aggregated)

**Endpoint**: `GET /api/dashboard/srm/:srmId?includeReportees=true`

```bash
# Get SRM1 user ID
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" | tr -d ' ')

# Call API
curl "http://localhost:3001/api/dashboard/srm/${SRM1_ID}?includeReportees=true"
```

**Expected Response**:
```json
{
  "srmId": "00000000-0000-0000-0000-000000000010",
  "totalApplications": 52,  // Sum of RM1, RM2, RM3, RM4 (13 each)
  "applicationsByStatus": { ... },  // Aggregated
  "totalRequestedAmount": 26000000,  // Sum of all RMs
  "averageTAT": 5.0,
  "pipeline": { ... },
  "reportees": [
    {
      "userId": "rm1-id",
      "username": "rm1",
      "designation": "Relationship Manager",
      "metrics": { "totalApplications": 13, ... }
    },
    { "username": "rm2", ... },
    { "username": "rm3", ... },
    { "username": "rm4", ... }
  ]
}
```

**Verify**:
- ✅ Total = sum of all 4 RMs under SRM1 (~52)
- ✅ Status breakdown aggregated correctly
- ✅ Reportees array contains all 4 RMs with their individual metrics

---

### Test 4: Regional Head Dashboard (Aggregated)

**Endpoint**: `GET /api/dashboard/regional-head/:headId?includeReportees=true`

```bash
# Get Regional Head user ID
RH_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'regional_head1';" | tr -d ' ')

# Call API
curl "http://localhost:3001/api/dashboard/regional-head/${RH_ID}?includeReportees=true"
```

**Expected Response**:
```json
{
  "regionalHeadId": "00000000-0000-0000-0000-000000000001",
  "totalApplications": 130,  // Sum of ALL 10 RMs
  "applicationsByStatus": { ... },  // Aggregated across entire region
  "totalRequestedAmount": 65000000,
  "averageTAT": 5.0,
  "pipeline": { ... },
  "reportees": [
    {
      "userId": "srm1-id",
      "username": "srm1",
      "designation": "Senior Relationship Manager",
      "metrics": { "totalApplications": 52, ... }  // SRM1's aggregated metrics
    },
    { "username": "srm2", "metrics": { "totalApplications": 52, ... } },
    { "username": "srm3", "metrics": { "totalApplications": 26, ... } }
  ]
}
```

**Verify**:
- ✅ Total = sum of all 10 RMs (~130)
- ✅ Reportees shows 3 SRMs
- ✅ Each SRM's metrics show their aggregated RMs

---

### Test 5: Drill-Down API

**Endpoint**: `GET /api/hierarchy/reportees/:managerId`

```bash
# Get Regional Head's reportees (should be SRMs)
curl "http://localhost:3001/api/hierarchy/reportees/${RH_ID}"

# Get SRM1's reportees (should be RMs)
curl "http://localhost:3001/api/hierarchy/reportees/${SRM1_ID}"
```

**Expected**: 
- Regional Head → Returns 3 SRMs with their aggregated metrics
- SRM1 → Returns 4 RMs with their individual metrics

---

### Test 6: Dynamic Mapping Change ⭐ **CRITICAL TEST**

This test verifies that aggregates update automatically when hierarchy changes.

```bash
# Step 1: Get baseline metrics
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" | tr -d ' ')
SRM2_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm2';" | tr -d ' ')
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" | tr -d ' ')

# Get before metrics
BEFORE_SRM1=$(curl -s "http://localhost:3001/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])")
BEFORE_SRM2=$(curl -s "http://localhost:3001/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])")

echo "Before: SRM1=${BEFORE_SRM1}, SRM2=${BEFORE_SRM2}"

# Step 2: Move RM1 from SRM1 to SRM2
docker exec los-postgres psql -U los -d los -c "
UPDATE users 
SET reports_to = '${SRM2_ID}'
WHERE user_id = '${RM1_ID}';
"

# Step 3: Get after metrics (should change immediately)
AFTER_SRM1=$(curl -s "http://localhost:3001/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])")
AFTER_SRM2=$(curl -s "http://localhost:3001/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])")

echo "After: SRM1=${AFTER_SRM1}, SRM2=${AFTER_SRM2}"

# Verify changes
if [ "$AFTER_SRM1" -lt "$BEFORE_SRM1" ] && [ "$AFTER_SRM2" -gt "$BEFORE_SRM2" ]; then
  echo "✅ Dynamic mapping works! Aggregates updated automatically"
else
  echo "❌ Aggregates did not update"
fi

# Step 4: Restore original mapping
docker exec los-postgres psql -U los -d los -c "
UPDATE users 
SET reports_to = '${SRM1_ID}'
WHERE user_id = '${RM1_ID}';
"
```

**Expected Results**:
- **Before**: SRM1 has 52 apps (4 RMs × 13), SRM2 has 52 apps (4 RMs × 13)
- **After**: SRM1 has 39 apps (3 RMs × 13), SRM2 has 65 apps (5 RMs × 13)
- **Regional Head**: Still shows 130 total (aggregated correctly)

---

## 🎯 Success Criteria

### ✅ Database Setup
- [x] Users table has hierarchy columns
- [x] 14 users created with correct mappings
- [x] Applications distributed to RMs

### ✅ API Endpoints
- [x] RM dashboard returns individual metrics
- [x] SRM dashboard returns aggregated metrics from their RMs
- [x] Regional Head dashboard returns aggregated metrics from all SRMs
- [x] Drill-down API returns reportees with metrics

### ✅ Dynamic Computation
- [x] Aggregates computed at runtime (not cached)
- [x] Changing `reports_to` immediately affects aggregates
- [x] No hardcoded values - all from database

### ✅ Data Integrity
- [x] RM can only see their assigned applications
- [x] SRM sees sum of their RMs' applications
- [x] Regional Head sees sum of all RMs' applications
- [x] Drill-down navigates correctly through hierarchy

---

## 🐛 Troubleshooting

### Issue: API Returns 404

**Solution**: Check if application service is running:
```bash
docker ps | grep application
curl http://localhost:3001/health
```

### Issue: API Returns Empty Metrics

**Check**:
1. Users exist in database
2. Applications are assigned to RMs (`assigned_to` field)
3. User IDs match between users table and applications table

### Issue: Aggregates Don't Update After Mapping Change

**Check**:
1. Database update succeeded: `SELECT reports_to FROM users WHERE username = 'rm1';`
2. API is calling fresh (no caching)
3. Recursive query is working: Test with SQL directly

### Issue: "users table does not exist"

**Solution**: Run migration:
```bash
docker exec -i los-postgres psql -U los -d los < services/auth/migrations/0003_add_reporting_hierarchy.sql
```

---

## 📊 Test Results

Run the comprehensive test script:
```bash
./scripts/test-hierarchical-dashboards.sh
```

This will test all scenarios automatically.

---

## 🔄 Next Steps After Testing

1. **Frontend Integration**: Build UI components for dashboards
2. **Access Control**: Verify role-based access (SRM can only see their RMs)
3. **Performance**: Monitor query performance with large datasets
4. **Caching**: Consider caching if needed (with invalidation on mapping changes)

---

## 📖 Related Files

- `services/application/src/hierarchical-dashboards.ts` - Core aggregation logic
- `services/auth/migrations/0003_add_reporting_hierarchy.sql` - Schema
- `services/auth/migrations/0004_seed_hierarchy_users.sql` - Users
- `scripts/test-hierarchical-dashboards.sh` - Automated tests

