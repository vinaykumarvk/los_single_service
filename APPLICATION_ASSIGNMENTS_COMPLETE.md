# ✅ Application Assignments Complete

## 📊 Assignment Summary

Applications have been assigned to different RMs for testing data isolation:

- **RM1 (rm1)**: 10 applications
- **RM2 (rm2)**: 10 different applications
- **RM3 (rm3)**: 10 different applications
- **Unassigned**: Remaining applications (if any)

---

## 🧪 Testing Instructions

### Test RM1 Data Isolation

1. Open http://localhost:5173
2. Login as: `rm1` / `rm1`
3. Navigate to **Applications**
4. **Expected**: See exactly **10 applications**
5. **Verify**: These are the applications assigned to RM1 only
6. **Verify**: Cannot see applications assigned to RM2 or RM3

### Test RM2 Data Isolation

1. Logout from RM1
2. Login as: `rm2` / `rm2`
3. Navigate to **Applications**
4. **Expected**: See exactly **10 DIFFERENT applications**
5. **Verify**: These are different from RM1's applications
6. **Verify**: Cannot see applications assigned to RM1 or RM3

### Test RM3 Data Isolation

1. Logout from RM2
2. Login as: `rm3` / `rm3`
3. Navigate to **Applications**
4. **Expected**: See exactly **10 DIFFERENT applications**
5. **Verify**: These are different from RM1 and RM2's applications
6. **Verify**: Cannot see applications assigned to RM1 or RM2

### Test Admin Access

1. Logout from RM3
2. Login as: `admin1` / `admin1`
3. Navigate to **Applications**
4. **Expected**: See **ALL applications** (30+)
5. **Verify**: Can see all RM assignments
6. **Verify**: Can reassign applications if needed

---

## 🔍 Verification Commands

### Check Current Assignments

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

### Check RM-Specific Assignments

```bash
# Get RM IDs first (see HOW_TO_GET_RM_IDS.md), then:
docker exec los-postgres psql -U los -d los -c \
  "SELECT 
    CASE 
      WHEN assigned_to = '<rm1-id>' THEN 'RM1'
      WHEN assigned_to = '<rm2-id>' THEN 'RM2'
      WHEN assigned_to = '<rm3-id>' THEN 'RM3'
      ELSE 'Unassigned'
    END as rm,
    COUNT(*) as count
  FROM applications
  GROUP BY assigned_to
  ORDER BY rm;"
```

---

## ✅ Expected Results

### RM1 Login
- **Applications visible**: 10
- **Dashboard stats**: Based on 10 applications only
- **Cannot access**: RM2 or RM3 applications

### RM2 Login
- **Applications visible**: 10 (different from RM1)
- **Dashboard stats**: Based on 10 different applications
- **Cannot access**: RM1 or RM3 applications

### RM3 Login
- **Applications visible**: 10 (different from RM1 and RM2)
- **Dashboard stats**: Based on 10 different applications
- **Cannot access**: RM1 or RM2 applications

### Admin Login
- **Applications visible**: ALL (30+)
- **Dashboard stats**: Based on all applications
- **Can see**: All RM assignments
- **Can do**: Reassign applications

---

## 🎯 Success Criteria

✅ RM1 sees only 10 applications (assigned to them)  
✅ RM2 sees only 10 different applications (assigned to them)  
✅ RM3 sees only 10 different applications (assigned to them)  
✅ No overlap between RM application sets  
✅ Admin sees all applications  
✅ Data filtering enforced at API/database level  

---

## 📝 Notes

- Assignments are stored in `applications.assigned_to` field
- Filtering happens automatically in Application Service when RM role is detected
- Each RM can only query applications where `assigned_to = their_user_id`
- Admin and Ops roles bypass this filtering

---

## 🔧 Re-assign if Needed

If you need to reassign applications, run:

```bash
# Get RM IDs first, then:
docker exec los-postgres psql -U los -d los << 'EOF'
UPDATE applications SET assigned_to = NULL;
UPDATE applications SET assigned_to = '<rm1-id>' WHERE application_id IN (SELECT application_id FROM applications ORDER BY created_at LIMIT 10);
UPDATE applications SET assigned_to = '<rm2-id>' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 10);
UPDATE applications SET assigned_to = '<rm3-id>' WHERE application_id IN (SELECT application_id FROM applications WHERE assigned_to IS NULL ORDER BY created_at LIMIT 10);
EOF
```

Replace `<rm1-id>`, `<rm2-id>`, `<rm3-id>` with actual Keycloak user IDs.

