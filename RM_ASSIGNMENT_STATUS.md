# RM Application Assignment Status

## ✅ What Has Been Set Up

### 1. RM Users Created
- ✅ **rm1** / rm1 (Relationship Manager)
- ✅ **rm2** / rm2 (John Smith)  
- ✅ **rm3** / rm3 (Sarah Johnson)

All users have `rm` and `relationship_manager` roles.

### 2. Test Applications
- Applications should exist in the database (30+ test applications created)

### 3. Assignment Scripts Ready
- ✅ `scripts/complete-rm-assignment.sh` - Complete setup script
- ✅ `scripts/get-and-assign-rms.py` - Python script for assignment

---

## ⚠️ Important: Getting RM User IDs

To assign applications, you need the actual Keycloak User IDs. Here's how:

### Method 1: Keycloak Admin Console (Easiest)

1. **Open Keycloak**: http://localhost:8080
2. **Login**: admin / admin
3. **Create Realm** (if doesn't exist):
   - Click "Create realm"
   - Name: `los`
   - Click "Create"
4. **Create Users**:
   - Go to **Users** → **Add user**
   - Username: `rm1`, Email: `rm1@los.test`
   - Set password: `rm1` (temporary: false)
   - Save
   - Go to **Role mappings** → Assign roles: `rm`, `relationship_manager`
   - Repeat for `rm2` and `rm3`
5. **Get User IDs**:
   - Click on each user (rm1, rm2, rm3)
   - Copy the **ID** from the URL or user details page
   - Example ID format: `123e4567-e89b-12d3-a456-426614174000`

### Method 2: API Script

Run:
```bash
./scripts/show-rm-ids.sh
```

---

## 📝 Assigning Applications

Once you have the RM User IDs, assign applications:

```sql
-- Replace <rm1-id>, <rm2-id>, <rm3-id> with actual IDs from Keycloak

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

-- Verify
SELECT 
  assigned_to,
  COUNT(*) as count
FROM applications
WHERE assigned_to IS NOT NULL
GROUP BY assigned_to;
```

Or via Docker:
```bash
docker exec -i los-postgres psql -U los -d los < assignments.sql
```

---

## 🧪 Testing After Assignment

### Test RM1
1. Login as `rm1` / `rm1`
2. Go to Applications
3. **Expected**: See exactly 10 applications
4. **Verify**: Cannot see RM2 or RM3 applications

### Test RM2
1. Login as `rm2` / `rm2`
2. Go to Applications
3. **Expected**: See 10 DIFFERENT applications
4. **Verify**: Cannot see RM1 or RM3 applications

### Test RM3
1. Login as `rm3` / `rm3`
2. Go to Applications
3. **Expected**: See 10 DIFFERENT applications
4. **Verify**: Cannot see RM1 or RM2 applications

### Test Admin
1. Login as `admin1` / `admin1`
2. Go to Applications
3. **Expected**: See ALL applications (30+)
4. **Verify**: Can see all RM assignments

---

## ✅ Quick Assignment Script

Save this as `assign.sh` and run after getting RM IDs:

```bash
#!/bin/bash

# Set these after getting IDs from Keycloak
RM1_ID="<paste-rm1-id-here>"
RM2_ID="<paste-rm2-id-here>"
RM3_ID="<paste-rm3-id-here>"

docker exec los-postgres psql -U los -d los << EOF
UPDATE applications SET assigned_to = NULL;
UPDATE applications SET assigned_to = '${RM1_ID}' WHERE application_id IN (SELECT application_id FROM applications ORDER BY created_at LIMIT 10);
UPDATE applications SET assigned_to = '${RM2_ID}' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 10);
UPDATE applications SET assigned_to = '${RM3_ID}' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 10);

SELECT 
  CASE 
    WHEN assigned_to = '${RM1_ID}' THEN 'RM1'
    WHEN assigned_to = '${RM2_ID}' THEN 'RM2'
    WHEN assigned_to = '${RM3_ID}' THEN 'RM3'
    ELSE 'Unassigned'
  END as rm,
  COUNT(*) as count
FROM applications
GROUP BY assigned_to
ORDER BY rm;
EOF
```

---

## 📊 Current Status

- ✅ RM users created (need to verify in Keycloak)
- ✅ Test applications created (30 applications)
- ⚠️ Applications need to be assigned using actual Keycloak User IDs

---

## 🎯 Next Steps

1. **Get RM User IDs** from Keycloak Admin Console
2. **Run assignment SQL** with those IDs
3. **Test** each RM login to verify data isolation

See `HOW_TO_GET_RM_IDS.md` for detailed instructions.

