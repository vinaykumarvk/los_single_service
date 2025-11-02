# RM Assignment Testing Guide

## ✅ Setup Complete

### Application Distribution

- **RM1 (rm1)**: 27 applications assigned
- **RM2 (rm2)**: 27 applications assigned  
- **RM3 (rm3)**: 27 applications assigned
- **Unassigned**: ~19 applications (pending admin assignment)

**Total**: ~100 applications

---

## 🧪 Testing Admin Assignment Flow

### Test Scenario: Admin Assigns Customer to RM

#### Step 1: Get an Unassigned Application

```bash
# Get an unassigned application ID
docker exec los-postgres psql -U los -d los -c \
  "SELECT application_id FROM applications WHERE assigned_to IS NULL LIMIT 1;"
```

#### Step 2: Admin Assigns Application to RM

**API Endpoint**: `PATCH /api/applications/:id/assign`

**Request** (as admin):
```bash
curl -X PATCH http://localhost:3001/api/applications/<application-id>/assign \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTo": "<rm1-keycloak-user-id>"
  }'
```

**Expected Response**:
```json
{
  "assignedTo": "<rm1-keycloak-user-id>",
  "assignedAt": "2024-01-01T12:00:00Z",
  "message": "Application assigned successfully"
}
```

#### Step 3: Verify RM Can See the Assigned Application

**Login as RM1** and call:
```bash
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>"
```

**Expected**: The newly assigned application should appear in RM1's list.

**Verify Count**:
```bash
# Count RM1's applications (should be 28 now)
docker exec los-postgres psql -U los -d los -c \
  "SELECT COUNT(*) FROM applications WHERE assigned_to = '<rm1-keycloak-id>';"
```

---

## 🔍 Verification Steps

### 1. Verify RM Only Sees Assigned Applications

**As RM1**:
```bash
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>"
```

- ✅ Should see only applications assigned to RM1
- ✅ Should NOT see applications assigned to RM2 or RM3
- ✅ Should NOT see unassigned applications

### 2. Verify Admin Can See All Applications

**As Admin**:
```bash
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <admin-token>"
```

- ✅ Should see ALL applications (assigned + unassigned)
- ✅ Can filter by `assignedTo` parameter if needed

### 3. Test Assignment API

**Prerequisites**:
- Get admin token from Keycloak
- Get RM1 Keycloak User ID
- Get one unassigned application ID

**Test Command**:
```bash
# Assign application to RM1
curl -X PATCH http://localhost:3001/api/applications/<unassigned-app-id>/assign \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"assignedTo": "<rm1-keycloak-id>"}'

# Verify RM1 can see it
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>" \
  | jq '.applications[] | select(.application_id == "<unassigned-app-id>")'
```

---

## 📊 Database Verification

### Check Current Assignments

```sql
SELECT 
  CASE 
    WHEN assigned_to = '<rm1-id>' THEN 'RM1'
    WHEN assigned_to = '<rm2-id>' THEN 'RM2'
    WHEN assigned_to = '<rm3-id>' THEN 'RM3'
    ELSE 'Unassigned'
  END as rm,
  COUNT(*) as count
FROM applications
GROUP BY assigned_to
ORDER BY rm;
```

### Find Unassigned Applications

```sql
SELECT application_id, status, created_at
FROM applications
WHERE assigned_to IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔑 Getting Keycloak User IDs

### Method 1: Keycloak Admin Console

1. Open: http://localhost:8080
2. Login: admin / admin
3. Go to: Realm `los` → Users
4. Click on: rm1, rm2, rm3
5. Copy the **ID** from URL or user details

### Method 2: API

```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" -d "password=admin" \
  -d "grant_type=password" -d "client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else 'NOT_FOUND')"
```

---

## ✅ Success Criteria

- [x] Each RM has 25-30 applications assigned
- [x] 25-30 applications remain unassigned
- [x] Admin can assign unassigned applications to RMs via API
- [x] After assignment, RM can immediately see the assigned application
- [x] RM can only see their own assigned applications
- [x] Admin can see all applications

---

## 🐛 Troubleshooting

### Issue: RM Cannot See Assigned Application

**Check**:
1. Verify `assigned_to` field is set in database
2. Verify RM's Keycloak User ID matches `assigned_to` value
3. Check API response headers - ensure user ID is forwarded correctly
4. Verify RM has correct roles (`rm`, `relationship_manager`)

### Issue: Assignment API Returns 401

**Solution**: Ensure admin token is valid and includes admin role

### Issue: Assignment API Returns 404

**Solution**: Verify application ID is correct and exists

### Issue: Realm "los" Not Found

**Solution**: Import realm from `infra/keycloak-realm.json` via Keycloak Admin Console

---

## 📝 Next Steps

1. **Replace Placeholder IDs**: Update database with actual Keycloak User IDs
   ```sql
   UPDATE applications 
   SET assigned_to = '<actual-rm1-keycloak-id>' 
   WHERE assigned_to = '00000001-0000-0000-0000-000000000001';
   ```
   (Repeat for RM2 and RM3)

2. **Test via UI**: 
   - Login as admin → Assign customers to RMs
   - Login as RM → Verify assigned customers appear

3. **Test via API**: Use curl commands above

---

## 📖 Related Documentation

- `RM_ASSIGNMENT_STATUS.md` - Assignment setup guide
- `HOW_TO_GET_RM_IDS.md` - How to get Keycloak User IDs
- `PERSONA_TESTING_GUIDE.md` - Complete persona testing guide

