# Persona-Based Access Demonstration

## 🎭 Test Users

### 1. Relationship Manager (RM)
- **Username**: `rm1`
- **Password**: `rm1`
- **Login URL**: http://localhost:5173/login
- **Roles**: `rm`, `relationship_manager`

### 2. Administrator (Admin)
- **Username**: `admin1`
- **Password**: `admin1`
- **Login URL**: http://localhost:5173/login
- **Roles**: `admin`, `pii:read`

### 3. Operations Officer (Ops)
- **Username**: `ops1`
- **Password**: `ops1`
- **Login URL**: http://localhost:5173/login
- **Roles**: `ops`, `checker`

---

## 📊 Expected Behaviors

### RM Persona View

**Dashboard:**
- ✅ Shows statistics ONLY for 10 assigned applications
- ✅ Total Applications: 10
- ✅ Pipeline breakdown filtered to assigned apps
- ✅ Cannot see other RMs' data

**Applications List:**
- ✅ Shows ONLY 10 applications (assigned to rm1)
- ✅ Filter: "Assigned to me"
- ❌ Cannot see unassigned applications
- ❌ Cannot see other RMs' applications

**Functional Access:**
- ✅ Can create new applications (auto-assigned to them)
- ✅ Can view assigned application details
- ✅ Can edit assigned applications (Draft status only)
- ✅ Can upload documents
- ❌ Cannot approve/reject applications
- ❌ Cannot view all applications
- ❌ Cannot see PII (masked)
- ❌ Cannot access admin features

**API Calls:**
```bash
# RM API automatically filters by assigned_to
GET /api/applications
# Returns: Only 10 applications where assigned_to = rm1-user-id
```

---

### Admin Persona View

**Dashboard:**
- ✅ Shows statistics for ALL applications (115+)
- ✅ Complete pipeline overview
- ✅ Full system metrics
- ✅ User management stats
- ✅ Rule management stats

**Applications List:**
- ✅ Shows ALL applications (no filtering)
- ✅ Can see all assigned and unassigned
- ✅ Can filter and reassign
- ✅ Export functionality available

**Functional Access:**
- ✅ Can create new applications
- ✅ Can view ALL application details
- ✅ Can edit any application
- ✅ Can approve/reject applications
- ✅ Can view PII (unmasked PAN, Aadhaar)
- ✅ Can manage users (full CRUD)
- ✅ Can manage rules
- ✅ Can view audit logs
- ✅ Can export data
- ✅ Full admin dashboard access

**API Calls:**
```bash
# Admin API returns all data
GET /api/applications
# Returns: All 115+ applications
```

---

### Operations Persona View

**Dashboard:**
- ✅ Shows statistics for ALL applications
- ✅ Operations-focused metrics
- ✅ Disbursement pipeline
- ✅ Processing TAT metrics

**Applications List:**
- ✅ Shows ALL applications
- ✅ Can filter by status
- ✅ Can view all application details

**Functional Access:**
- ✅ Can view all application details
- ✅ Can approve/reject applications (checker role)
- ✅ Can view reports and analytics
- ✅ Can view audit logs
- ✅ Can export data
- ✅ Can access disbursement features
- ✅ Can process payments
- ❌ Cannot manage users
- ❌ Cannot manage rules
- ❌ Cannot view PII (unless granted)
- ❌ Cannot delete applications

**API Calls:**
```bash
# Ops API returns all data
GET /api/applications
# Returns: All applications

# Can approve applications
POST /api/applications/{id}/underwrite
# Requires: checker role
```

---

## 🔍 Verification Steps

### Step 1: Login as RM1

1. Open http://localhost:5173
2. Click "Login"
3. Enter `rm1` / `rm1`
4. Navigate to Dashboard

**Verify:**
- Dashboard shows "Total Applications: 10" (not 115+)
- Applications list shows exactly 10 applications
- Cannot access other applications

### Step 2: Login as Admin1

1. Logout from RM1
2. Login with `admin1` / `admin1`
3. Navigate to Dashboard

**Verify:**
- Dashboard shows "Total Applications: 115+" (all applications)
- Applications list shows all applications
- Can see admin menu items
- Can reassign applications

### Step 3: Login as Ops1

1. Logout from Admin1
2. Login with `ops1` / `ops1`
3. Navigate to Dashboard

**Verify:**
- Dashboard shows all applications
- Applications list shows all applications
- Can approve/reject applications
- Cannot see admin menu items

---

## 📋 Quick Test Commands

### Check User Roles (from Browser Console)
```javascript
// After login, check user roles
fetch('http://localhost:3000/api/user/roles', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log)
```

### Test RM Filtering (from Terminal)
```bash
# Get RM1 token first, then:
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>"
# Should return only 10 applications
```

### Test Admin Access
```bash
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <admin1-token>"
# Should return all applications
```

---

## ✅ Success Criteria

- [x] RM sees only assigned applications (10 apps)
- [x] Admin sees all applications (115+ apps)
- [x] Ops sees all applications but limited functionality
- [x] Data filtering works at API level
- [x] UI features match role permissions
- [x] PII masking works (admin can see, others cannot)
- [x] Functional access matches role definitions

---

## 🎯 Testing Scenarios

### Scenario 1: RM Cannot See Others' Data
1. Login as rm1
2. Try to access application not in assigned list
3. **Expected**: 403 Forbidden or not found
4. **Result**: ✅ Data isolation enforced

### Scenario 2: Admin Can Reassign
1. Login as admin1
2. View applications list
3. Reassign an application from rm1 to another RM
4. **Expected**: Success
5. **Result**: ✅ Admin has reassignment rights

### Scenario 3: Ops Can Approve
1. Login as ops1
2. Find application in "PendingVerification"
3. Navigate to Underwriting
4. Approve application
5. **Expected**: Success
6. **Result**: ✅ Ops has approval rights

---

## 📝 Notes

- **Keycloak Realm**: `los`
- **Client ID**: `los-ui`
- **Default Redirect**: http://localhost:5173/callback
- **RM Assignments**: Stored in `applications.assigned_to` field
- **Role-Based Filtering**: Applied in `services/application/src/server.ts`

