# Persona-Based Testing Guide

This guide demonstrates how to test the application with different personas (RM, Admin, Operations) and verify their functional and data entitlements.

## 🎭 Test Users

### 1. Relationship Manager (RM)
- **Username**: `rm1`
- **Password**: `rm1`
- **Roles**: `rm`, `relationship_manager`
- **Access**: Only applications assigned to them

### 2. Administrator (Admin)
- **Username**: `admin1`
- **Password**: `admin1`
- **Roles**: `admin`, `pii:read`
- **Access**: All applications, all features, can manage users

### 3. Operations Officer (Ops)
- **Username**: `ops1`
- **Password**: `ops1`
- **Roles**: `ops`, `checker`
- **Access**: All applications, can approve/reject, view reports

---

## 🚀 Setup Instructions

### Step 1: Create Test Users in Keycloak

```bash
./scripts/setup-test-users.sh
```

This creates the three test users with appropriate roles in Keycloak.

### Step 2: Setup RM-Customer Assignments

```bash
./scripts/setup-rm-assignments.sh
```

This assigns 10 sample applications to `rm1` for testing data filtering.

---

## 🧪 Testing Each Persona

### Testing as Relationship Manager (RM)

#### 1. Login as RM

1. Open http://localhost:5173
2. Click "Login"
3. Enter credentials:
   - Username: `rm1`
   - Password: `rm1`

#### 2. Expected Behavior

**Dashboard View:**
- ✅ Shows only statistics for applications assigned to RM1
- ✅ Pipeline data filtered to assigned applications
- ✅ TAT metrics calculated only for assigned applications

**Applications List:**
- ✅ Shows only 10 applications (assigned to rm1)
- ✅ Cannot see applications assigned to other RMs
- ✅ Cannot see unassigned applications

**Functional Access:**
- ✅ Can create new applications
- ✅ Can view assigned application details
- ✅ Can upload documents for assigned applications
- ✅ Can edit assigned applications (if status is Draft)
- ❌ Cannot approve/reject applications
- ❌ Cannot view all applications
- ❌ Cannot access admin features

**Data Entitlements:**
```sql
-- RM queries automatically filter by assigned_to
SELECT * FROM applications WHERE assigned_to = 'rm1-user-id';
-- Returns: 10 applications
```

#### 3. Verify RM Filtering

```bash
# As RM, API calls should only return assigned applications
curl -H "Authorization: Bearer <rm1-token>" \
  http://localhost:3001/api/applications

# Expected: Only 10 applications in response
```

---

### Testing as Administrator (Admin)

#### 1. Login as Admin

1. Open http://localhost:5173
2. Click "Login"
3. Enter credentials:
   - Username: `admin1`
   - Password: `admin1`

#### 2. Expected Behavior

**Dashboard View:**
- ✅ Shows statistics for ALL applications (no filtering)
- ✅ Complete pipeline overview
- ✅ Full system metrics

**Applications List:**
- ✅ Shows ALL applications (115+ applications)
- ✅ Can see applications assigned to any RM
- ✅ Can see unassigned applications
- ✅ Can reassign applications

**Functional Access:**
- ✅ Can create new applications
- ✅ Can view ALL application details
- ✅ Can edit any application
- ✅ Can approve/reject applications
- ✅ Can view PII (unmasked PAN, Aadhaar)
- ✅ Can manage users
- ✅ Can manage rules
- ✅ Can view audit logs
- ✅ Can export data
- ✅ Can access all admin features

**Data Entitlements:**
```sql
-- Admin queries have no filtering
SELECT * FROM applications;
-- Returns: All applications
```

**UI Features Visible:**
- ✅ All menu items (Applications, Dashboard, Reports, Analytics, Users, Rules, Audit)
- ✅ User management interface
- ✅ Rule management interface
- ✅ Full analytics dashboard

#### 3. Verify Admin Access

```bash
# As Admin, API calls return all data
curl -H "Authorization: Bearer <admin1-token>" \
  http://localhost:3001/api/applications

# Expected: All 115+ applications in response
```

---

### Testing as Operations Officer (Ops)

#### 1. Login as Operations

1. Open http://localhost:5173
2. Click "Login"
3. Enter credentials:
   - Username: `ops1`
   - Password: `ops1`

#### 2. Expected Behavior

**Dashboard View:**
- ✅ Shows statistics for ALL applications
- ✅ Complete pipeline overview
- ✅ Operations-focused metrics

**Applications List:**
- ✅ Shows ALL applications
- ✅ Can view all applications
- ✅ Cannot reassign (unless has admin role)

**Functional Access:**
- ✅ Can view all application details
- ✅ Can approve/reject applications (checker role)
- ✅ Can view reports and analytics
- ✅ Can view audit logs
- ✅ Can export data
- ✅ Can access disbursement features
- ❌ Cannot manage users
- ❌ Cannot manage rules
- ❌ Cannot view PII (unless has `pii:read` role)
- ❌ Cannot delete applications

**Data Entitlements:**
```sql
-- Ops queries have no filtering (but can't modify certain data)
SELECT * FROM applications;
-- Returns: All applications
```

**UI Features Visible:**
- ✅ Applications, Dashboard, Reports, Analytics
- ✅ Underwriting, Sanction, Disbursement features
- ❌ Users, Rules management (hidden)

#### 3. Verify Ops Access

```bash
# As Ops, API calls return all data
curl -H "Authorization: Bearer <ops1-token>" \
  http://localhost:3001/api/applications

# Expected: All applications in response

# Can approve applications
curl -X POST -H "Authorization: Bearer <ops1-token>" \
  -H "Content-Type: application/json" \
  -d '{"decision": "APPROVED", "reasons": ["Meets criteria"]}' \
  http://localhost:3006/api/applications/{id}/underwrite
```

---

## 📊 Comparison Table

| Feature | RM | Admin | Ops |
|---------|----|----|-----|
| **View Applications** | ✅ Assigned only | ✅ All | ✅ All |
| **Create Applications** | ✅ Yes | ✅ Yes | ❌ No |
| **Edit Applications** | ✅ Assigned only | ✅ All | ❌ No |
| **Approve/Reject** | ❌ No | ✅ Yes | ✅ Yes |
| **View PII** | ❌ No | ✅ Yes | ❌ No* |
| **View Reports** | ❌ No | ✅ Yes | ✅ Yes |
| **Manage Users** | ❌ No | ✅ Yes | ❌ No |
| **Manage Rules** | ❌ No | ✅ Yes | ❌ No |
| **View Audit Logs** | ❌ No | ✅ Yes | ✅ Yes |
| **Export Data** | ❌ No | ✅ Yes | ✅ Yes |
| **Disbursement** | ❌ No | ✅ Yes | ✅ Yes |

*Ops can view PII if granted `pii:read` role

---

## 🔍 Verification Commands

### Check User Roles
```bash
curl http://localhost:3000/api/user/roles \
  -H "Authorization: Bearer <token>"
```

### Check RM Dashboard (Filtered)
```bash
curl http://localhost:3001/api/applications/rm/dashboard \
  -H "Authorization: Bearer <rm1-token>"
```

### Check Application List (RM vs Admin)
```bash
# As RM - should return 10
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>"

# As Admin - should return all
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <admin1-token>"
```

---

## 🎯 Testing Scenarios

### Scenario 1: RM Data Isolation
1. Login as `rm1`
2. Navigate to Applications
3. **Expected**: See only 10 applications
4. Logout
5. Login as `admin1`
6. Navigate to Applications
7. **Expected**: See all 115+ applications
8. **Result**: ✅ Data filtering works correctly

### Scenario 2: Admin Full Access
1. Login as `admin1`
2. Navigate to Dashboard
3. **Expected**: See complete statistics
4. Navigate to Applications
5. **Expected**: See all applications
6. Try to reassign an application
7. **Expected**: Success (admin can reassign)
8. **Result**: ✅ Admin has full access

### Scenario 3: Ops Approval Access
1. Login as `ops1`
2. Navigate to Applications
3. **Expected**: See all applications
4. Open an application in "PendingVerification" status
5. Navigate to Underwriting
6. **Expected**: Can approve/reject
7. Try to approve
8. **Expected**: Success (ops can approve)
9. **Result**: ✅ Ops has approval rights

### Scenario 4: RM Cannot See Others' Data
1. Login as `rm1`
2. Try to access an application not assigned to them
3. **Expected**: 403 Forbidden or application not found
4. **Result**: ✅ RM data isolation enforced

---

## 🐛 Troubleshooting

### Issue: RM sees all applications
**Check:**
- Verify user has `rm` or `relationship_manager` role in Keycloak
- Check `assigned_to` field in applications table
- Verify application service is checking `X-User-Id` header

### Issue: Admin cannot see all applications
**Check:**
- Verify user has `admin` role in Keycloak
- Check gateway is forwarding user roles correctly
- Verify application service role checking logic

### Issue: Ops cannot approve
**Check:**
- Verify user has `checker` or `ops` role
- Check underwriting service role permissions
- Verify API endpoint authentication

---

## 📝 Notes

- **PII Masking**: Users without `pii:read` role will see masked PAN/Aadhaar
- **Persona Routing**: Frontend persona routing can be overridden via `VITE_PERSONA` env var
- **Role Inheritance**: Admin role automatically includes all permissions
- **Data Filtering**: Happens at database query level for performance

---

## ✅ Success Criteria

✅ RM can only see assigned applications  
✅ Admin can see and manage all applications  
✅ Ops can see all but has restricted management  
✅ Data filtering works correctly  
✅ UI features match role permissions  
✅ API endpoints enforce access control  

