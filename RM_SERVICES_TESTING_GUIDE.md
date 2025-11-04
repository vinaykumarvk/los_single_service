# RM Services Testing Guide

## Overview
This guide helps you test the 6 essential RM services one by one to ensure stability before activating additional services.

## Essential Services (6)

1. **Gateway** (3000) - API routing
2. **Auth** (3016) - Authentication
3. **Masters** (3005) - Reference data
4. **Customer KYC** (3003) - Customer data
5. **Application** (3001) - Application management
6. **Document** (3004) - Document upload

## Step-by-Step Testing Process

### Step 1: Start Services
```bash
./scripts/start-rm-services.sh
```

Wait 10-15 seconds for services to initialize.

### Step 2: Test Service Health
```bash
./scripts/test-rm-services.sh
```

This will test each service one by one and report status.

### Step 3: Manual Testing (One by One)

#### Test 1: Gateway Service
```bash
curl http://localhost:3000/health
```
**Expected**: `OK` or `200 OK`

**If it fails**:
- Check if port 3000 is in use: `lsof -i :3000`
- Check logs: `tail -f /tmp/los-services/gateway.log`

#### Test 2: Auth Service
```bash
curl http://localhost:3016/health
```
**Expected**: `OK` or `200 OK`

**Test login endpoint**:
```bash
curl -X POST http://localhost:3016/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"rm1","password":"rm1Rm@123456"}'
```
**Expected**: JSON with `accessToken`

**If it fails**:
- Check database connection
- Verify user exists in database
- Check logs: `tail -f /tmp/los-services/auth.log`

#### Test 3: Masters Service
```bash
curl http://localhost:3005/health
```
**Expected**: `OK` or `200 OK`

**Test products endpoint**:
```bash
curl http://localhost:3005/api/masters/products
```
**Expected**: JSON array of products

**If it fails**:
- Check database connection
- Verify seed data exists
- Check logs: `tail -f /tmp/los-services/masters.log`

#### Test 4: Customer KYC Service
```bash
curl http://localhost:3003/health
```
**Expected**: `OK` or `200 OK`

**If it fails**:
- Check database connection
- Check logs: `tail -f /tmp/los-services/customer-kyc.log`

#### Test 5: Application Service
```bash
curl http://localhost:3001/health
```
**Expected**: `OK` or `200 OK`

**If it fails**:
- Check database connection
- Verify dependencies (masters service)
- Check logs: `tail -f /tmp/los-services/application.log`

#### Test 6: Document Service
```bash
curl http://localhost:3004/health
```
**Expected**: `OK` or `200 OK`

**If it fails**:
- Check file storage configuration
- Check logs: `tail -f /tmp/los-services/document.log`

### Step 4: End-to-End Testing

#### Test 1: Login Flow
1. Open browser: `http://localhost:5173/login`
2. Enter credentials: `rm1` / `rm1Rm@123456`
3. **Expected**: Redirect to dashboard

**If it fails**:
- Check browser console for errors
- Verify auth service is running
- Check gateway logs

#### Test 2: Dashboard Load
1. After login, verify dashboard loads
2. **Expected**: See dashboard with stats (Total, Draft, Submitted, etc.)

**If it fails**:
- Check application service is running
- Check gateway routing
- Verify user has applications assigned

#### Test 3: Create New Application
1. Click "New Application" button
2. Fill form:
   - Loan Type: Home Loan
   - Amount: 500000
   - Tenure: 20 years
   - Channel: Mobile
3. Click "Create Application"
4. **Expected**: Navigate to personal information page

**If it fails**:
- Check application service logs
- Verify applicant creation (KYC service)
- Check gateway routing

#### Test 4: Fill Personal Information
1. Fill personal details form
2. Click "Save" or "Save as Draft"
3. **Expected**: Data saved successfully

**If it fails**:
- Check KYC service logs
- Verify database connection
- Check API response in browser console

#### Test 5: Upload Document
1. Navigate to Documents tab
2. Upload a document (e.g., PAN card)
3. **Expected**: Document uploaded and listed

**If it fails**:
- Check document service logs
- Verify file storage permissions
- Check file size limits

## Troubleshooting

### Service Not Starting
1. Check if port is already in use: `lsof -i :<port>`
2. Kill existing process: `kill -9 <PID>`
3. Check service logs: `tail -f /tmp/los-services/<service-name>.log`
4. Verify database is running: `docker ps | grep postgres`

### Service Not Responding
1. Wait 10-15 seconds after startup (services need time to initialize)
2. Check if service is actually running: `ps aux | grep node`
3. Check for errors in logs
4. Verify environment variables (DATABASE_URL, PORT)

### Database Connection Issues
1. Verify PostgreSQL is running: `docker ps | grep postgres`
2. Check connection string: `echo $DATABASE_URL`
3. Test connection: `psql $DATABASE_URL -c "SELECT 1"`

### Gateway Routing Issues
1. Check gateway routes: `cat gateway/src/server.ts | grep target`
2. Verify service ports match gateway configuration
3. Check gateway logs: `tail -f /tmp/los-services/gateway.log`

## Success Criteria

✅ All 6 services pass health checks
✅ Login works with valid credentials
✅ Dashboard loads with data
✅ Can create new application
✅ Can save personal information
✅ Can upload documents

Once all these pass, the system is stable and ready for additional services.

## Next Steps

After essential services are stable:
1. Add Integration Hub (3020) for PAN/Aadhaar/Bank verification
2. Test integration features
3. Gradually add other services as needed

