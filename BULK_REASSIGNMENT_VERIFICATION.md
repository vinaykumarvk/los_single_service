# Bulk Reassignment Verification

**Date**: $(date)

---

## Question

Can applications be reassigned only one-by-one, or is bulk reassignment also possible?

---

## Answer

✅ **BOTH options are available:**

1. ✅ **One-by-One Assignment** (existing)
2. ✅ **Bulk Assignment** (newly implemented)

---

## Current Status

### ✅ Single Assignment (Existing)

**Endpoint**: `PATCH /api/applications/:id/assign`

**Request**:
```json
{
  "assignedTo": "00000001-0000-0000-0000-000000000001"
}
```

**Use Case**: Assign one application at a time

---

### ✅ Bulk Assignment (Newly Added)

**Endpoint**: `PATCH /api/applications/bulk-assign`

**Request**:
```json
{
  "applicationIds": [
    "app-id-1",
    "app-id-2",
    "app-id-3",
    "..."
  ],
  "assignedTo": "00000001-0000-0000-0000-000000000001"
}
```

**Features**:
- ✅ Assign up to **100 applications** at once
- ✅ **Transaction-based**: All succeed or all rollback
- ✅ **Individual tracking**: Success/failure for each application
- ✅ **Previous assignee tracking**: Records who each app was assigned to before
- ✅ **Events published**: Outbox event for each assignment
- ✅ **History recorded**: Application history for each assignment
- ✅ **Access control**: Admin/Ops only

**Response Example**:
```json
{
  "assignedTo": "00000001-0000-0000-0000-000000000002",
  "total": 10,
  "success": 8,
  "failed": 2,
  "results": [
    {
      "applicationId": "app-1",
      "status": "success",
      "previousAssignee": "00000001-0000-0000-0000-000000000001"
    },
    {
      "applicationId": "app-2",
      "status": "failed",
      "error": "Application is Withdrawn, cannot assign."
    },
    ...
  ]
}
```

---

## Example Use Cases

### Use Case 1: Bulk Reassign from RM1 to RM2

**Scenario**: Admin wants to move 50 applications from RM1 to RM2

```bash
PATCH /api/applications/bulk-assign
{
  "applicationIds": ["app-1", "app-2", ..., "app-50"],
  "assignedTo": "00000001-0000-0000-0000-000000000002"  # RM2
}
```

**Result**:
- ✅ All 50 applications reassigned to RM2
- ✅ RM1 loses access to all 50
- ✅ RM2 gains access to all 50
- ✅ Previous assignee (RM1) tracked for each
- ✅ Events and history recorded for each

### Use Case 2: Partial Success

**Scenario**: Admin tries to assign 10 applications, 2 are in final status

**Response**:
```json
{
  "assignedTo": "rm2-id",
  "total": 10,
  "success": 8,
  "failed": 2,
  "results": [
    {"applicationId": "app-1", "status": "success"},
    {"applicationId": "app-2", "status": "failed", "error": "Application is Disbursed, cannot assign."},
    ...
  ]
}
```

---

## Comparison

| Feature | Single Assignment | Bulk Assignment |
|---------|------------------|-----------------|
| **Endpoint** | `PATCH /api/applications/:id/assign` | `PATCH /api/applications/bulk-assign` |
| **Applications per request** | 1 | Up to 100 |
| **Request Body** | `{ "assignedTo": "uuid" }` | `{ "applicationIds": [...], "assignedTo": "uuid" }` |
| **Transaction** | Single application | All applications in one transaction |
| **Error Handling** | Returns error immediately | Tracks individual success/failure |
| **Events** | 1 event per request | 1 event per application |
| **History** | 1 history record | 1 history record per application |
| **Performance** | Good for 1-10 apps | Better for 10+ apps |

---

## Restrictions

### Single Assignment:
- ❌ Cannot assign if status = Withdrawn/Disbursed/Closed
- ❌ Only admin/ops can assign

### Bulk Assignment:
- ❌ Same restrictions as single assignment
- ❌ Maximum 100 applications per request
- ❌ Applications in final status are skipped (tracked as failed)
- ❌ Each application validated individually

---

## Summary

✅ **Single Assignment**: Available and working  
✅ **Bulk Assignment**: Now implemented and available

**Conclusion**: Applications can be reassigned either:
- **One-by-one** using `PATCH /api/applications/:id/assign`
- **In bulk** using `PATCH /api/applications/bulk-assign` (up to 100 at once)

Both methods are fully functional with proper access control, event publishing, and history tracking.

---

**Status**: ✅ **COMPLETE** - Both single and bulk reassignment available!

