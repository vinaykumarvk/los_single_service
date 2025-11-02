# RM User IDs for Testing

This document contains the Keycloak user IDs for different RM users to test data isolation.

## 🔑 RM User Credentials

| Username | Password | User ID | Assigned Applications |
|----------|----------|---------|---------------------|
| **rm1** | rm1 | See below | 10 applications |
| **rm2** | rm2 | See below | 10 applications |
| **rm3** | rm3 | See below | 10 applications |

---

## 📋 Getting RM User IDs

Run this command to get all RM user IDs:

```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" -d "password=admin" \
  -d "grant_type=password" -d "client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

curl -s -X GET "http://localhost:8080/admin/realms/los/users?briefRepresentation=true" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys, json
users = json.load(sys.stdin)
rm_users = [u for u in users if u.get('username', '').startswith('rm')]
for u in rm_users:
    print(f\"{u['username']}: {u['id']}\")
"
```

Or use the simplified script:
```bash
./scripts/get-rm-ids.sh
```

---

## 🧪 Verification Queries

### Check Assignments by RM

```sql
-- Get RM IDs first, then:
SELECT 
  CASE 
    WHEN assigned_to = '<rm1-id>' THEN 'RM1'
    WHEN assigned_to = '<rm2-id>' THEN 'RM2'
    WHEN assigned_to = '<rm3-id>' THEN 'RM3'
    ELSE 'Unassigned'
  END as rm,
  COUNT(*) as application_count,
  array_agg(application_id ORDER BY created_at) as application_ids
FROM applications
GROUP BY assigned_to
ORDER BY rm;
```

### Verify RM Can Only See Assigned Applications

```bash
# As RM1 (should return only 10)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm1-token>"

# As RM2 (should return different 10)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <rm2-token>"

# As Admin (should return all)
curl http://localhost:3001/api/applications \
  -H "Authorization: Bearer <admin1-token>"
```

---

## 📊 Expected Results

### RM1 Login (`rm1` / `rm1`)
- **Dashboard**: Shows stats for 10 applications
- **Applications List**: Shows exactly 10 applications
- **Cannot see**: Applications assigned to RM2 or RM3

### RM2 Login (`rm2` / `rm2`)
- **Dashboard**: Shows stats for 10 DIFFERENT applications
- **Applications List**: Shows exactly 10 applications (different from RM1)
- **Cannot see**: Applications assigned to RM1 or RM3

### RM3 Login (`rm3` / `rm3`)
- **Dashboard**: Shows stats for 10 DIFFERENT applications
- **Applications List**: Shows exactly 10 applications (different from RM1 and RM2)
- **Cannot see**: Applications assigned to RM1 or RM2

### Admin Login (`admin1` / `admin1`)
- **Dashboard**: Shows stats for ALL applications (30+)
- **Applications List**: Shows ALL applications
- **Can see**: All RM assignments

---

## 🔍 Quick Test Script

```bash
# Get all RM IDs
./scripts/get-rm-ids.sh

# Verify assignments
docker exec los-postgres psql -U los -d los -c \
  "SELECT assigned_to, COUNT(*) FROM applications WHERE assigned_to IS NOT NULL GROUP BY assigned_to;"

# Test each RM login and verify they only see their assigned applications
```

