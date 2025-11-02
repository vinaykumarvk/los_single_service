# How to Get RM User IDs for Testing

## 🔑 Quick Method: Keycloak Admin Console

1. Open Keycloak Admin Console: http://localhost:8080
2. Login: admin / admin
3. Navigate to: **Realm: los** → **Users**
4. Search for: `rm1`, `rm2`, `rm3`
5. Click on each user → Copy the **User ID** from the URL or user details

## 📋 RM User Credentials

| Username | Password | Expected Applications |
|----------|----------|----------------------|
| rm1 | rm1 | 10 applications |
| rm2 | rm2 | 10 applications |
| rm3 | rm3 | 10 applications |

---

## 🔧 Alternative: Use API Command

```bash
# Get admin token
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

# Get RM1 ID
curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"

# Get RM2 ID  
curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm2" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"

# Get RM3 ID
curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm3" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"
```

---

## 📝 Assign Applications to RMs

Once you have the RM user IDs, assign applications:

```sql
-- Replace <rm1-id>, <rm2-id>, <rm3-id> with actual IDs from above

-- Clear existing assignments
UPDATE applications SET assigned_to = NULL;

-- Assign to RM1 (first 10)
UPDATE applications SET assigned_to = '<rm1-id>' 
WHERE application_id IN (
  SELECT application_id FROM applications 
  ORDER BY created_at 
  LIMIT 10
);

-- Assign to RM2 (next 10)
UPDATE applications SET assigned_to = '<rm2-id>' 
WHERE application_id IN (
  SELECT application_id FROM applications 
  WHERE assigned_to IS NULL
  ORDER BY created_at 
  LIMIT 10
);

-- Assign to RM3 (next 10)
UPDATE applications SET assigned_to = '<rm3-id>' 
WHERE application_id IN (
  SELECT application_id FROM applications 
  WHERE assigned_to IS NULL
  ORDER BY created_at 
  LIMIT 10
);

-- Verify assignments
SELECT 
  assigned_to,
  COUNT(*) as count
FROM applications
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;
```

Or run via Docker:

```bash
docker exec -i los-postgres psql -U los -d los << 'EOF'
-- Replace IDs in the queries above
EOF
```

---

## 🧪 Testing Data Isolation

### Test Each RM

1. **Login as rm1** (rm1 / rm1)
   - Go to Applications
   - **Expected**: See exactly 10 applications
   - **Verify**: Cannot see applications assigned to rm2 or rm3

2. **Login as rm2** (rm2 / rm2)
   - Go to Applications  
   - **Expected**: See exactly 10 DIFFERENT applications
   - **Verify**: Cannot see applications assigned to rm1 or rm3

3. **Login as rm3** (rm3 / rm3)
   - Go to Applications
   - **Expected**: See exactly 10 DIFFERENT applications
   - **Verify**: Cannot see applications assigned to rm1 or rm2

4. **Login as admin1** (admin1 / admin1)
   - Go to Applications
   - **Expected**: See ALL applications (all RM assignments + unassigned)

---

## ✅ Verification

### Check Database Assignments

```bash
docker exec los-postgres psql -U los -d los -c \
  "SELECT assigned_to, COUNT(*) FROM applications WHERE assigned_to IS NOT NULL GROUP BY assigned_to;"
```

### Check What Each RM Sees (API Level)

```bash
# After getting auth tokens for each RM:
# RM1 should return 10
curl http://localhost:3001/api/applications -H "Authorization: Bearer <rm1-token>"

# RM2 should return 10 (different from RM1)
curl http://localhost:3001/api/applications -H "Authorization: Bearer <rm2-token>"

# RM3 should return 10 (different from RM1 and RM2)
curl http://localhost:3001/api/applications -H "Authorization: Bearer <rm3-token>"

# Admin should return all
curl http://localhost:3001/api/applications -H "Authorization: Bearer <admin1-token>"
```

---

## 📖 Files Created

- `HOW_TO_GET_RM_IDS.md` - This file (how to get IDs)
- `RM_IDS_FOR_TESTING.txt` - Command reference
- `RM_USER_IDS_REFERENCE.md` - Complete testing guide
- `scripts/show-rm-ids.sh` - Script to display IDs

---

## 🎯 Success Criteria

✅ Each RM can only see their assigned applications  
✅ No overlap between RM application sets  
✅ Admin can see all applications  
✅ Data filtering enforced at API/database level  

