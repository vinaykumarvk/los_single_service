# API Testing Guide - Cloud Run Deployment

**Deployed Service**: Your LOS Monolith API on Google Cloud Run

## Quick Health Check

```bash
# Should return: OK
curl https://YOUR-SERVICE-URL/health
```

## Authentication & Testing Flow

### Step 1: Login to Get Auth Token

```bash
curl -X POST https://YOUR-SERVICE-URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "rm1",
    "password": "Pass@1234"
  }'
```

**Response will include:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "rm1",
    "roles": ["rm"]
  }
}
```

**Save the token and userId for next steps!**

### Step 2: Access Protected Endpoints

Replace `YOUR_TOKEN` and `USER_ID` with values from login response:

#### Get User's Dashboard
```bash
curl https://YOUR-SERVICE-URL/api/dashboard/rm/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### List Applications
```bash
curl https://YOUR-SERVICE-URL/api/applications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Specific Application
```bash
curl https://YOUR-SERVICE-URL/api/applications/APP_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Test Users Available

Based on your seed data, these test users should exist:

| Username | Password | Role | Use Case |
|----------|----------|------|----------|
| rm1 | Pass@1234 | RM | Relationship Manager |
| rm2 | Pass@1234 | RM | Relationship Manager |
| srm1 | Pass@1234 | SRM | Senior RM |
| admin | Pass@1234 | Admin | Administrator |

## Common Endpoints

### Public Endpoints (No Auth Required)
- `GET /` - API info
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Auth Endpoints
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Application Endpoints (Auth Required)
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application
- `GET /api/applications/:id/history` - Get application history

### Dashboard Endpoints (Auth Required)
- `GET /api/dashboard/rm/:userId` - RM dashboard
- `GET /api/dashboard/srm/:srmId` - Senior RM dashboard
- `GET /api/dashboard/regional-head/:headId` - Regional head dashboard

### Masters Data (Auth Required)
- `GET /api/masters/products` - List loan products
- `GET /api/masters/branches` - List branches

## Example: Full Test Workflow

```bash
# 1. Save your Cloud Run URL
export API_URL="https://your-service-url"

# 2. Login
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rm1","password":"Pass@1234"}')

# 3. Extract token (requires jq)
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.userId')

echo "Token: $TOKEN"
echo "User ID: $USER_ID"

# 4. Get dashboard
curl -s $API_URL/api/dashboard/rm/$USER_ID \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. List applications
curl -s $API_URL/api/applications \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Troubleshooting

### "Invalid user ID format"
- User ID must be a valid UUID
- Get it from the login response: `user.userId`

### "Unauthorized" or "Invalid token"
- Token expired (15 min default)
- Use the refresh token endpoint or login again

### "Cannot find module" errors in logs
- Check Cloud Run logs for startup errors
- Verify secrets are properly configured

## Next Steps

1. ✅ Backend API is deployed and working
2. Deploy frontend web application
3. Configure frontend to use this API URL
4. Set up custom domain (optional)
5. Configure CI/CD for automatic deployments

