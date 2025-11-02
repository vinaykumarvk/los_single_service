# Test Execution Summary

## ✅ Tests Completed

### Database Tests (All Passed)
- [x] Users table structure verified
- [x] 14 hierarchy users exist
- [x] Hierarchy mappings correct
- [x] 130 applications distributed (~13 per RM)

---

## ⏳ API Tests (Require Service Running)

### Service Startup
**Command**: `cd services/application && npm run dev`

**Status**: Service needs to be started manually or via Docker

---

### Test Results (When Service is Running)

#### Test 1: RM Dashboard
**Endpoint**: `GET /api/dashboard/rm/:userId`

**Expected**:
- Returns RM's individual metrics
- Total: ~13 applications
- Status breakdown included

**Test Command**:
```bash
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" | tr -d ' ')
curl http://localhost:3001/api/dashboard/rm/${RM1_ID}
```

---

#### Test 2: SRM Dashboard (Aggregated)
**Endpoint**: `GET /api/dashboard/srm/:srmId?includeReportees=true`

**Expected**:
- SRM1: ~52 applications (4 RMs × 13)
- Reportees array with 4 RMs and their metrics

**Test Command**:
```bash
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" | tr -d ' ')
curl "http://localhost:3001/api/dashboard/srm/${SRM1_ID}?includeReportees=true"
```

---

#### Test 3: Regional Head Dashboard (Aggregated)
**Endpoint**: `GET /api/dashboard/regional-head/:headId?includeReportees=true`

**Expected**:
- Regional Head: ~130 applications (all 10 RMs)
- Reportees array with 3 SRMs and their aggregated metrics

**Test Command**:
```bash
RH_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'regional_head1';" | tr -d ' ')
curl "http://localhost:3001/api/dashboard/regional-head/${RH_ID}?includeReportees=true"
```

---

#### Test 4: Drill-Down API
**Endpoint**: `GET /api/hierarchy/reportees/:managerId`

**Expected**:
- Regional Head → 3 SRMs
- SRM1 → 4 RMs

**Test Command**:
```bash
# Regional Head's SRMs
curl "http://localhost:3001/api/hierarchy/reportees/${RH_ID}"

# SRM1's RMs
curl "http://localhost:3001/api/hierarchy/reportees/${SRM1_ID}"
```

---

#### Test 5: Dynamic Mapping Change ⭐ **CRITICAL**

**Purpose**: Verify aggregates update automatically

**Steps**:
1. Get baseline metrics
2. Move RM1 from SRM1 to SRM2
3. Check dashboards - should reflect new structure immediately
4. Restore mapping

**Expected**:
- **Before**: SRM1=52, SRM2=52
- **After**: SRM1=39, SRM2=65
- **Change**: Immediate (runtime computation)

**Test Script**:
```bash
# Get IDs
RM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'rm1';" | tr -d ' ')
SRM1_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm1';" | tr -d ' ')
SRM2_ID=$(docker exec los-postgres psql -U los -d los -t -c "SELECT user_id FROM users WHERE username = 'srm2';" | tr -d ' ')

# Baseline
echo "Before:"
curl -s "http://localhost:3001/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(f\"SRM1: {json.load(sys.stdin)['totalApplications']} apps\")"
curl -s "http://localhost:3001/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(f\"SRM2: {json.load(sys.stdin)['totalApplications']} apps\")"

# Change
docker exec los-postgres psql -U los -d los -c "UPDATE users SET reports_to = '${SRM2_ID}' WHERE user_id = '${RM1_ID}';"
sleep 1

# After
echo "After:"
curl -s "http://localhost:3001/api/dashboard/srm/${SRM1_ID}" | python3 -c "import sys, json; print(f\"SRM1: {json.load(sys.stdin)['totalApplications']} apps\")"
curl -s "http://localhost:3001/api/dashboard/srm/${SRM2_ID}" | python3 -c "import sys, json; print(f\"SRM2: {json.load(sys.stdin)['totalApplications']} apps\")"

# Restore
docker exec los-postgres psql -U los -d los -c "UPDATE users SET reports_to = '${SRM1_ID}' WHERE user_id = '${RM1_ID}';"
```

---

## 🚀 Quick Start Testing

1. **Start Service**:
   ```bash
   cd services/application
   npm install
   npm run build
   npm run dev
   ```

2. **Run Automated Tests**:
   ```bash
   ./scripts/test-hierarchical-dashboards.sh
   ```

3. **Or Test Manually**:
   Use commands from `COMPREHENSIVE_TESTING_GUIDE.md`

---

## 📊 Expected Results

### RM Dashboard
```json
{
  "userId": "rm1-id",
  "totalApplications": 13,
  "applicationsByStatus": {
    "Draft": 2,
    "Submitted": 5,
    ...
  },
  "pipeline": { ... }
}
```

### SRM Dashboard
```json
{
  "srmId": "srm1-id",
  "totalApplications": 52,  // Aggregated from 4 RMs
  "reportees": [
    { "username": "rm1", "metrics": { "totalApplications": 13 }, ... },
    { "username": "rm2", "metrics": { "totalApplications": 13 }, ... },
    ...
  ]
}
```

### Regional Head Dashboard
```json
{
  "regionalHeadId": "rh-id",
  "totalApplications": 130,  // Aggregated from all 10 RMs
  "reportees": [
    { "username": "srm1", "metrics": { "totalApplications": 52 }, ... },
    { "username": "srm2", "metrics": { "totalApplications": 52 }, ... },
    { "username": "srm3", "metrics": { "totalApplications": 26 }, ... }
  ]
}
```

---

## ✅ Success Criteria

- [x] Database structure correct
- [x] Hierarchy mappings verified
- [x] Application distribution verified
- [ ] RM dashboard returns correct metrics (requires service)
- [ ] SRM dashboard returns aggregated metrics (requires service)
- [ ] Regional Head dashboard returns aggregated metrics (requires service)
- [ ] Drill-down works (requires service)
- [ ] Dynamic mapping updates aggregates (requires service)

---

## 🐛 Troubleshooting

### Service Won't Start
- Check TypeScript errors: `npm run build`
- Check port availability: `lsof -ti:3001`
- Check dependencies: `npm install`

### API Returns 500
- Check service logs
- Verify database connection
- Check if users table exists

### Empty Metrics
- Verify applications assigned: `SELECT assigned_to, COUNT(*) FROM applications GROUP BY assigned_to;`
- Check user IDs match between users and applications tables

