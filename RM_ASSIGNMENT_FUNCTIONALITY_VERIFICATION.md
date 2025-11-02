# RM Assignment Functionality Verification

**Date**: $(date)

---

## ✅ Confirmation: Assignment Functionality EXISTS

Yes, there is already a functionality to assign customers/applications to different RMs. This can be done by admin or ops users.

---

## Existing Assignment Endpoint

### Endpoint: `PATCH /api/applications/:id/assign`

**Location**: `services/application/src/server.ts` (lines 1047-1113)

**Purpose**: Assign application to a user (RM, maker, checker, etc.)

**Request Body**:
```json
{
  "assignedTo": "uuid-of-rm-user"
}
```

**Current Functionality**:
1. ✅ Validates application exists
2. ✅ Prevents assignment if application is in final status (Withdrawn, Disbursed, Closed)
3. ✅ Updates `assigned_to` field in applications table
4. ✅ Records `assigned_at` timestamp
5. ✅ Publishes outbox event: `los.application.ApplicationAssigned.v1`
6. ✅ Records application history with assignment details

**Current Access Control**: ⚠️ **NOT RESTRICTED** - Any authenticated user can assign

---

## ⚠️ Issue Identified: Missing Role-Based Access Control

The current implementation does **NOT** restrict assignment to admin/ops users only. Any authenticated user can assign applications.

### Current Code:
```typescript
// PATCH /api/applications/:id/assign
app.patch('/api/applications/:id/assign', async (req, res) => {
  // No role check - anyone authenticated can assign
  // Should restrict to admin/ops only
});
```

---

## Required Enhancement

The assignment endpoint should be restricted to:
- **Admin users** (roles: `['admin']`)
- **Operations users** (roles: `['ops', 'operations']`)

RM users should **NOT** be able to assign applications to themselves or others.

---

## Recommendation

Add role-based access control to the assignment endpoint:

```typescript
// PATCH /api/applications/:id/assign - assign application to RM (admin/ops only)
app.patch('/api/applications/:id/assign', async (req, res) => {
  // Check user roles
  const userRoles = (req as any).user?.roles || [];
  const isAdmin = userRoles.includes('admin');
  const isOps = userRoles.includes('ops') || userRoles.includes('operations');
  
  if (!isAdmin && !isOps) {
    return res.status(403).json({ 
      error: 'Access denied. Only admin or operations users can assign applications.' 
    });
  }
  
  // Rest of the assignment logic...
});
```

---

## Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Assignment Endpoint | ✅ **EXISTS** | `PATCH /api/applications/:id/assign` |
| Assignment Logic | ✅ **COMPLETE** | Updates DB, publishes events, records history |
| Role-Based Access Control | ⚠️ **MISSING** | Currently allows any authenticated user |
| Admin/Ops Restriction | ❌ **NOT IMPLEMENTED** | Needs to be added |

---

## Next Steps

1. ✅ **Verify**: Assignment endpoint exists and works
2. ⚠️ **Enhance**: Add role-based access control to restrict to admin/ops only
3. ✅ **Test**: Ensure RM users cannot assign applications

---

**Status**: Assignment functionality exists but needs access control enhancement.

