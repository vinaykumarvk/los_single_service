# RM User IDs for Testing Data Isolation

## 📋 RM User Credentials

| Username | Password | User ID | Assigned Apps |
|----------|----------|---------|---------------|
| **rm1** | rm1 | See below | 10 applications |
| **rm2** | rm2 | See below | 10 applications |
| **rm3** | rm3 | See below | 10 applications |

---

## 🔑 Quick Command to Get RM IDs

```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" -d "password=admin" \
  -d "grant_type=password" -d "client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "RM1 ID:"
curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"

echo "RM2 ID:"
curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm2" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"

echo "RM3 ID:"
curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm3" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"
```

Or use the script:
```bash
./scripts/get-rm-ids.sh
```

---

## 🧪 Testing Data Isolation

### Verify Each RM Only Sees Their Applications

1. **Login as rm1** → Should see 10 applications
2. **Login as rm2** → Should see 10 DIFFERENT applications  
3. **Login as rm3** → Should see 10 DIFFERENT applications
4. **Login as admin1** → Should see ALL applications

### SQL Verification

```sql
-- Check assignments
SELECT 
  CASE 
    WHEN assigned_to = '<rm1-id>' THEN 'RM1 (rm1)'
    WHEN assigned_to = '<rm2-id>' THEN 'RM2 (rm2)'
    WHEN assigned_to = '<rm3-id>' THEN 'RM3 (rm3)'
    ELSE 'Unassigned'
  END as assigned_to,
  COUNT(*) as application_count,
  array_agg(application_id ORDER BY created_at) as app_ids
FROM applications
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to
ORDER BY assigned_to;
```

### API Verification

```bash
# Get tokens for each RM and verify they only see their assigned applications

# As RM1 (should return 10)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>"

# As RM2 (should return different 10)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm2-token>"

# As RM3 (should return different 10)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm3-token>"

# As Admin (should return all)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <admin1-token>"
```

---

## 📊 Expected Results Summary

### RM1 Login
- Applications visible: **10** (assigned to rm1)
- Dashboard stats: Based on 10 applications only
- Cannot access: Applications assigned to rm2 or rm3

### RM2 Login  
- Applications visible: **10** (different from rm1)
- Dashboard stats: Based on 10 different applications
- Cannot access: Applications assigned to rm1 or rm3

### RM3 Login
- Applications visible: **10** (different from rm1 and rm2)
- Dashboard stats: Based on 10 different applications
- Cannot access: Applications assigned to rm1 or rm2

### Admin Login
- Applications visible: **ALL** (30+ assigned + unassigned)
- Dashboard stats: Based on all applications
- Can see: All RM assignments and reassign

---

## 🔍 Quick Verification Script

```bash
# Check current assignments
docker exec los-postgres psql -U los -d los -c \
  "SELECT assigned_to, COUNT(*) FROM applications WHERE assigned_to IS NOT NULL GROUP BY assigned_to;"

# Verify each RM user can only query their assigned applications
# (Requires getting auth tokens for each RM first)
```

---

## ✅ Success Criteria

- [x] RM1 can only see 10 applications (their assigned ones)
- [x] RM2 can only see 10 different applications
- [x] RM3 can only see 10 different applications
- [x] Each RM cannot see other RMs' applications
- [x] Admin can see all applications
- [x] Data filtering happens at API/database level

