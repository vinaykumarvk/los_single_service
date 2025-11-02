# ✅ Final RM Assignment Status

## 📊 Application Distribution

Applications have been distributed as follows:

- **RM1 (rm1)**: 27 applications assigned
- **RM2 (rm2)**: 27 applications assigned  
- **RM3 (rm3)**: 27 applications assigned
- **Unassigned**: ~19 applications (pending admin assignment)

**Total**: ~100 applications

---

## ⚠️ Important: Placeholder IDs Currently Used

The assignments currently use **placeholder UUIDs**:
- RM1: `00000001-0000-0000-0000-000000000001`
- RM2: `00000001-0000-0000-0000-000000000002`
- RM3: `00000001-0000-0000-0000-000000000003`

**To complete setup**, replace these with actual Keycloak User IDs:

```sql
-- Get actual Keycloak IDs first (see HOW_TO_GET_RM_IDS.md), then:

UPDATE applications 
SET assigned_to = '<actual-rm1-keycloak-id>' 
WHERE assigned_to = '00000001-0000-0000-0000-000000000001';

UPDATE applications 
SET assigned_to = '<actual-rm2-keycloak-id>' 
WHERE assigned_to = '00000001-0000-0000-0000-000000000002';

UPDATE applications 
SET assigned_to = '<actual-rm3-keycloak-id>' 
WHERE assigned_to = '00000001-0000-0000-0000-000000000003';
```

---

## 🧪 Testing Admin Assignment Flow

### Test: Admin Assigns Customer to RM

#### Prerequisites

1. **Get Admin Token**:
   ```bash
   # Login as admin1 at http://localhost:5173
   # Or get token via Keycloak API
   ```

2. **Get RM Keycloak User ID**:
   - Method 1: Keycloak Admin Console → Users → rm1 → Copy ID
   - Method 2: See `HOW_TO_GET_RM_IDS.md`

3. **Get Unassigned Application ID**:
   ```sql
   SELECT application_id 
   FROM applications 
   WHERE assigned_to IS NULL 
   LIMIT 1;
   ```

#### Step 1: Admin Assigns Application

**API Call**:
```bash
curl -X PATCH http://localhost:3001/api/applications/<unassigned-app-id>/assign \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: <admin-keycloak-id>" \
  -H "X-User-Roles: [\"admin\"]" \
  -d '{
    "assignedTo": "<rm1-keycloak-user-id>"
  }'
```

**Expected Response** (200 OK):
```json
{
  "assignedTo": "<rm1-keycloak-user-id>",
  "assignedAt": "2024-01-01T12:00:00Z"
}
```

#### Step 2: Verify RM Can See It

**Login as RM1** and call:
```bash
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>" \
  -H "X-User-Id: <rm1-keycloak-id>" \
  -H "X-User-Roles: [\"rm\", \"relationship_manager\"]"
```

**Expected**:
- ✅ The newly assigned application appears in the response
- ✅ RM1's total count increases by 1 (from 27 to 28)
- ✅ The `assigned_to` field in the application matches RM1's ID

#### Step 3: Database Verification

```sql
-- Count RM1's applications (should be 28 now)
SELECT COUNT(*) 
FROM applications 
WHERE assigned_to = '<rm1-keycloak-id>';

-- Verify the specific application is assigned
SELECT application_id, assigned_to, assigned_at
FROM applications
WHERE application_id = '<assigned-app-id>';
```

---

## ✅ Success Criteria Checklist

- [x] **100+ applications created**
- [x] **27 applications assigned to each RM**
- [x] **~19 applications unassigned for admin**
- [x] **Assignment API endpoint exists** (`PATCH /api/applications/:id/assign`)
- [x] **RM filtering implemented** (RMs only see their assigned applications)
- [ ] **Actual Keycloak IDs replaced** (use placeholders until realm setup)
- [ ] **Admin assignment tested** (assign customer, verify RM sees it)

---

## 📋 Next Steps

1. **Setup Keycloak Realm**:
   - Open http://localhost:8080
   - Login: admin / admin
   - Create/Import realm "los" from `infra/keycloak-realm.json`

2. **Get RM User IDs**:
   - Create users: rm1, rm2, rm3
   - Get their Keycloak User IDs
   - Update database assignments (see SQL above)

3. **Test Assignment Flow**:
   - Login as admin
   - Assign one unassigned application to RM1
   - Login as RM1
   - Verify the assigned application appears in RM1's list

---

## 📖 Documentation

- `RM_ASSIGNMENT_TESTING_GUIDE.md` - Complete testing guide
- `HOW_TO_GET_RM_IDS.md` - How to get Keycloak User IDs
- `RM_ASSIGNMENT_STATUS.md` - Assignment setup instructions
- `PERSONA_TESTING_GUIDE.md` - Persona-based testing

---

## 🔧 Quick Commands

### Check Current Status
```bash
docker exec los-postgres psql -U los -d los -c \
  "SELECT 
    CASE 
      WHEN assigned_to IS NOT NULL THEN 'Assigned'
      ELSE 'Unassigned'
    END as status,
    COUNT(*) as count
  FROM applications
  GROUP BY (assigned_to IS NOT NULL);"
```

### Find Unassigned Applications
```bash
docker exec los-postgres psql -U los -d los -c \
  "SELECT application_id, status, created_at
   FROM applications
   WHERE assigned_to IS NULL
   LIMIT 10;"
```

### Get RM Application Count
```bash
docker exec los-postgres psql -U los -d los -c \
  "SELECT COUNT(*) FROM applications WHERE assigned_to = '<rm-keycloak-id>';"
```

