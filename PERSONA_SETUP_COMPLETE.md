# ✅ Persona Testing Setup Complete

## 🎭 Test Users Created in Keycloak

### 1. Relationship Manager (RM)
- **Username**: `rm1`
- **Password**: `rm1`
- **Email**: rm1@los.test
- **Roles**: `rm`, `relationship_manager`
- **Keycloak User ID**: (Get via Keycloak Admin Console)

### 2. Administrator (Admin)
- **Username**: `admin1`
- **Password**: `admin1`
- **Email**: admin1@los.test
- **Roles**: `admin`, `pii:read`
- **Access**: Full system access

### 3. Operations Officer (Ops)
- **Username**: `ops1`
- **Password**: `ops1`
- **Email**: ops1@los.test
- **Roles**: `ops`, `checker`
- **Access**: Can approve/reject, view all applications

---

## 📋 Manual RM Assignment (If Needed)

If applications weren't automatically assigned to RM1, run:

```bash
# Get RM1 User ID from Keycloak
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" -d "password=admin" \
  -d "grant_type=password" -d "client_id=admin-cli" \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

RM1_ID=$(curl -s -X GET "http://localhost:8080/admin/realms/los/users?username=rm1" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "import sys, json; users=json.load(sys.stdin); print(users[0]['id'] if users else '')")

# Assign applications
docker exec los-postgres psql -U los -d los -c \
  "UPDATE applications SET assigned_to = '${RM1_ID}' \
   WHERE application_id IN (SELECT application_id FROM applications ORDER BY created_at LIMIT 10);"
```

---

## 🧪 Testing Guide

See **PERSONA_TESTING_GUIDE.md** for complete testing scenarios.

Quick test:
1. Login as `rm1` → Should see 10 applications
2. Login as `admin1` → Should see all applications
3. Login as `ops1` → Should see all applications, can approve

---

## ✅ What Was Done

- ✅ Created 3 test users in Keycloak
- ✅ Assigned appropriate roles to each user
- ✅ Created RM-customer assignment script
- ✅ Created comprehensive testing documentation

**Ready to test!** 🚀

