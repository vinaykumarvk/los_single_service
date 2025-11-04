# RM Login Credentials Reference

## 🔑 Quick Reference

### Primary Test RM Users

| Username | Password | Email | Roles | Applications Assigned |
|----------|----------|-------|-------|----------------------|
| **rm1** | `rm1` | rm1@los.local | rm, relationship_manager | 10-27 applications |
| **rm2** | `rm2` | rm2@los.local | rm, relationship_manager | 10-27 applications |
| **rm3** | `rm3` | rm3@los.local | rm, relationship_manager | 10-27 applications |
| **rm4** | `rm4` | rm4@los.local | rm, relationship_manager | ~10 applications |
| **rm5** | `rm5` | rm5@los.local | rm, relationship_manager | ~10 applications |
| **rm6** | `rm6` | rm6@los.local | rm, relationship_manager | ~10 applications |
| **rm7** | `rm7` | rm7@los.local | rm, relationship_manager | ~10 applications |
| **rm8** | `rm8` | rm8@los.local | rm, relationship_manager | ~10 applications |
| **rm9** | `rm9` | rm9@los.local | rm, relationship_manager | ~10 applications |
| **rm10** | `rm10` | rm10@los.local | rm, relationship_manager | ~10 applications |

---

## 📋 Password Patterns

### Pattern 1: Username = Password (Most Common)
- **rm1** / **rm1**
- **rm2** / **rm2**
- **rm3** / **rm3**
- **rm4** / **rm4**
- **rm5** / **rm5**
- **rm6** / **rm6**
- **rm7** / **rm7**
- **rm8** / **rm8**
- **rm9** / **rm9**
- **rm10** / **rm10**

### Pattern 2: Standard Password (If changed)
- **Password**: `RM@123456`
- **Note**: This is the bcrypt hash used in some migrations

---

## 🎯 Recommended Test Users

For testing, use these three RMs:

### RM1 (Primary Test User)
- **Username**: `rm1`
- **Password**: `rm1`
- **Expected**: 10-27 applications assigned
- **Use for**: Primary RM testing, dashboard verification

### RM2 (Secondary Test User)
- **Username**: `rm2`
- **Password**: `rm2`
- **Expected**: 10-27 applications assigned
- **Use for**: Data isolation testing, cross-RM verification

### RM3 (Tertiary Test User)
- **Username**: `rm3`
- **Password**: `rm3`
- **Expected**: 10-27 applications assigned
- **Use for**: Multiple RM testing, assignment verification

---

## 🔍 How to Verify Credentials

### Check RM Users in Database

```bash
psql -U los -d los -c "
SELECT 
  username, 
  email, 
  designation,
  employee_id,
  reports_to
FROM users 
WHERE designation = 'Relationship Manager'
ORDER BY username;
"
```

### Check RM Assignments

```bash
psql -U los -d los -c "
SELECT 
  u.username,
  COUNT(a.application_id) as application_count
FROM users u
LEFT JOIN applications a ON a.assigned_to = u.user_id
WHERE u.designation = 'Relationship Manager'
GROUP BY u.username
ORDER BY u.username;
"
```

---

## 🧪 Testing Scenarios

### Scenario 1: Data Isolation Test
1. Login as **rm1** → Should see only rm1's applications
2. Login as **rm2** → Should see only rm2's applications (different from rm1)
3. Verify: Cannot see each other's applications

### Scenario 2: Assignment Test
1. Login as **admin** or use API
2. Assign application to **rm1**
3. Login as **rm1** → Should see the newly assigned application

### Scenario 3: Dashboard Test
1. Login as **rm1** → Dashboard shows stats for rm1's applications only
2. Login as **rm2** → Dashboard shows different stats for rm2's applications

---

## ⚠️ Important Notes

1. **Password Format**: Most RMs use the same username as password (e.g., `rm1`/`rm1`)
2. **Database vs Keycloak**: If using Keycloak, credentials should match Keycloak users
3. **JWT Auth**: If using JWT authentication, credentials are validated against the database
4. **Password Hash**: Database stores bcrypt hashed passwords, not plain text

---

## 🔧 Troubleshooting

### If Login Fails

1. **Check if user exists**:
   ```bash
   psql -U los -d los -c "SELECT username FROM users WHERE username = 'rm1';"
   ```

2. **Check password hash** (if using database auth):
   ```bash
   psql -U los -d los -c "SELECT username, password_hash FROM users WHERE username = 'rm1';"
   ```

3. **Reset password** (if needed):
   ```sql
   -- Update password hash for rm1 (password: rm1)
   UPDATE users 
   SET password_hash = '$2b$10$z5zUq9tjxA0d2n5H7uUnR.EUf3LxeRpALmIJ/kgvDflWnjNL1Ty.i'
   WHERE username = 'rm1';
   ```

---

## 📝 Quick Login Test

```bash
# Test login via API
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rm1","password":"rm1"}'
```

---

## ✅ Verification Checklist

- [ ] rm1 can login with password `rm1`
- [ ] rm2 can login with password `rm2`
- [ ] rm3 can login with password `rm3`
- [ ] Each RM sees only their assigned applications
- [ ] Dashboard stats are correct for each RM
- [ ] Cannot access other RMs' applications


