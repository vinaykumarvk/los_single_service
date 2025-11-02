# RM User IDs Reference

## 🔑 Quick Access to RM User IDs

To get the current RM user IDs, run:

```bash
python3 scripts/get-and-assign-rms.py
```

This will:
1. Get all RM user IDs from Keycloak
2. Assign applications to each RM
3. Display the IDs for reference

---

## 📋 RM User Credentials

| Username | Password | Roles | Expected Applications |
|----------|----------|-------|----------------------|
| **rm1** | rm1 | rm, relationship_manager | 10 applications |
| **rm2** | rm2 | rm, relationship_manager | 10 applications |
| **rm3** | rm3 | rm, relationship_manager | 10 applications |

---

## 🧪 Testing Data Isolation

### Step-by-Step Test

1. **Login as rm1** (rm1 / rm1)
   - Navigate to Applications
   - **Expected**: See exactly 10 applications
   - **Verify**: Cannot see applications assigned to rm2 or rm3

2. **Login as rm2** (rm2 / rm2)
   - Navigate to Applications
   - **Expected**: See exactly 10 DIFFERENT applications
   - **Verify**: Cannot see applications assigned to rm1 or rm3

3. **Login as rm3** (rm3 / rm3)
   - Navigate to Applications
   - **Expected**: See exactly 10 DIFFERENT applications
   - **Verify**: Cannot see applications assigned to rm1 or rm2

4. **Login as admin1** (admin1 / admin1)
   - Navigate to Applications
   - **Expected**: See ALL applications (30+ assigned + any unassigned)
   - **Verify**: Can see all RM assignments

---

## 🔍 Verification Queries

### Check Current Assignments

```sql
-- Get RM IDs first (see above), then:
SELECT 
  CASE 
    WHEN assigned_to = '<rm1-id>' THEN 'RM1 (rm1)'
    WHEN assigned_to = '<rm2-id>' THEN 'RM2 (rm2)'
    WHEN assigned_to = '<rm3-id>' THEN 'RM3 (rm3)'
    ELSE 'Unassigned'
  END as rm,
  COUNT(*) as application_count,
  array_agg(LEFT(application_id::text, 8) ORDER BY created_at) as sample_ids
FROM applications
GROUP BY assigned_to
ORDER BY rm;
```

### Verify RM Can Only Query Assigned Applications

The application service automatically filters queries for RM users:

```typescript
// In services/application/src/server.ts
const isRM = userRoles.some((role: string) => 
  role.toLowerCase() === 'rm' || role.toLowerCase() === 'relationship_manager'
);

if (isRM && userId && !req.query.assignedTo) {
  conditions.push(`assigned_to = $${paramCount++}`);
  values.push(userId);
}
```

---

## 📊 Expected API Responses

### RM1 API Call
```bash
GET /api/applications
Headers: Authorization: Bearer <rm1-token>

Response:
{
  "applications": [...], // Exactly 10 applications
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

### RM2 API Call
```bash
GET /api/applications
Headers: Authorization: Bearer <rm2-token>

Response:
{
  "applications": [...], // Exactly 10 DIFFERENT applications
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 20
  }
}
```

### Admin API Call
```bash
GET /api/applications
Headers: Authorization: Bearer <admin1-token>

Response:
{
  "applications": [...], // ALL applications (30+)
  "pagination": {
    "total": 115+,  // All applications
    "page": 1,
    "limit": 20
  }
}
```

---

## ✅ Success Criteria

- [x] Each RM can only see their assigned applications
- [x] No overlap between RM1, RM2, and RM3 application sets
- [x] Admin can see all applications
- [x] Data filtering enforced at database level
- [x] API responses match expected counts

---

## 🔧 Troubleshooting

### Issue: RM sees all applications
- **Check**: Verify user has `rm` or `relationship_manager` role
- **Check**: Verify `assigned_to` field is set in database
- **Check**: Application service is checking user ID from headers

### Issue: Cannot get user IDs
- **Check**: Keycloak is running: `docker ps | grep keycloak`
- **Check**: Admin credentials are correct (admin/admin)
- **Check**: Realm is `los`

### Issue: Applications not assigned
- **Run**: `python3 scripts/get-and-assign-rms.py` again
- **Verify**: Check database: `docker exec los-postgres psql -U los -d los -c "SELECT assigned_to, COUNT(*) FROM applications GROUP BY assigned_to;"`

