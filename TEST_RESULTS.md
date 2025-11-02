# Hierarchical Dashboard Test Results

## Test Execution Summary

### ✅ Database Tests (Passed)

- [x] Users table structure verified
- [x] 14 hierarchy users exist
- [x] Hierarchy mappings correct:
  - Regional Head → 3 SRMs
  - SRM1 → 4 RMs
  - SRM2 → 4 RMs  
  - SRM3 → 2 RMs
- [x] 130 applications distributed (~13 per RM)

---

### ⏳ API Tests (Run with Service)

These tests require the application service to be running on port 3001.

#### Test 1: RM Dashboard
**Endpoint**: `GET /api/dashboard/rm/:userId`

**Expected**:
- Returns RM's individual metrics
- Total applications: ~13
- Status breakdown for RM's assigned apps

**Command**:
```bash
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" | tr -d ' ')
curl http://localhost:3001/api/dashboard/rm/${RM1_ID}
```

---

#### Test 2: SRM Dashboard (Aggregated)
**Endpoint**: `GET /api/dashboard/srm/:srmId?includeReportees=true`

**Expected**:
- Returns aggregated metrics from all RMs under SRM
- SRM1: ~52 applications (4 RMs × 13)
- Reportees array contains 4 RMs with their metrics

**Command**:
```bash
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" | tr -d ' ')
curl "http://localhost:3001/api/dashboard/srm/${SRM1_ID}?includeReportees=true"
```

---

#### Test 3: Regional Head Dashboard (Aggregated)
**Endpoint**: `GET /api/dashboard/regional-head/:headId?includeReportees=true`

**Expected**:
- Returns aggregated metrics from all SRMs
- Regional Head: ~130 applications (all 10 RMs)
- Reportees array contains 3 SRMs with their aggregated metrics

**Command**:
```bash
RH_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'regional_head1';" | tr -d ' ')
curl "http://localhost:3001/api/dashboard/regional-head/${RH_ID}?includeReportees=true"
```

---

#### Test 4: Drill-Down API
**Endpoint**: `GET /api/hierarchy/reportees/:managerId`

**Expected**:
- Regional Head → Returns 3 SRMs with metrics
- SRM1 → Returns 4 RMs with metrics

**Command**:
```bash
# Regional Head's reportees
curl "http://localhost:3001/api/hierarchy/reportees/${RH_ID}"

# SRM1's reportees
curl "http://localhost:3001/api/hierarchy/reportees/${SRM1_ID}"
```

---

#### Test 5: Dynamic Mapping Change ⭐ **CRITICAL**

**Purpose**: Verify aggregates update automatically when hierarchy changes

**Steps**:
1. Get baseline metrics for SRM1 and SRM2
2. Move RM1 from SRM1 to SRM2
3. Check dashboards immediately - should reflect new structure
4. Restore original mapping

**Expected Results**:
- **Before**: SRM1 = 52 apps (4 RMs), SRM2 = 52 apps (4 RMs)
- **After**: SRM1 = 39 apps (3 RMs), SRM2 = 65 apps (5 RMs)
- **Change**: Immediate (no cache, runtime computation)

**Command**:
```bash
# Get IDs
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" | tr -d ' ')
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" | tr -d ' ')
SRM2_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm2';" | tr -d ' ')

# Get before metrics
curl -s "http://localhost:3001/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])"
curl -s "http://localhost:3001/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])"

# Change mapping
docker exec los-postgres psql -U los -d los -c "UPDATE users SET reports_to = '${SRM2_ID}' WHERE user_id = '${RM1_ID}';"

# Get after metrics (should be different)
curl -s "http://localhost:3001/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])"
curl -s "http://localhost:3001/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(json.load(sys.stdin)['totalApplications'])"

# Restore
docker exec los-postgres psql -U los -d los -c "UPDATE users SET reports_to = '${SRM1_ID}' WHERE user_id = '${RM1_ID}';"
```

---

## Test Execution

Run the comprehensive test script:
```bash
./scripts/test-hierarchical-dashboards.sh
```

Or test manually using the commands above.

---

## Expected Test Results

### ✅ Success Criteria

1. **RM Dashboard**
   - Returns individual metrics
   - Total = ~13 applications
   - Metrics match RM's assigned applications

2. **SRM Dashboard**
   - Returns aggregated metrics
   - Total = sum of all RMs under SRM
   - Reportees array populated with RM data

3. **Regional Head Dashboard**
   - Returns aggregated metrics
   - Total = sum of all 10 RMs (~130)
   - Reportees array populated with SRM data

4. **Drill-Down**
   - Returns direct reportees
   - Each reportee has metrics
   - Can navigate hierarchy

5. **Dynamic Mapping** ⭐
   - Changing `reports_to` updates aggregates
   - No manual refresh needed
   - Aggregates computed from current mappings

---

## Troubleshooting

### Service Not Running
```bash
cd services/application
npm install
npm start
```

### API Returns 404
- Check service is running: `curl http://localhost:3001/health`
- Verify endpoints are registered in `server.ts`

### Empty Metrics
- Check users exist: `SELECT * FROM users WHERE designation IN ('RM', 'SRM', 'Regional Head');`
- Check applications assigned: `SELECT assigned_to, COUNT(*) FROM applications GROUP BY assigned_to;`

### Dynamic Mapping Doesn't Work
- Verify database update: `SELECT reports_to FROM users WHERE username = 'rm1';`
- Check recursive query logic in `hierarchical-dashboards.ts`
- Verify no caching (aggregates computed on each call)
