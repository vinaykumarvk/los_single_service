# Step-by-Step Guide: Running Full Stack Locally

## Prerequisites

### Required Software

1. **Node.js 20+** 
   ```bash
   node --version  # Should be v20.x or higher
   ```

2. **pnpm**
   ```bash
   npm install -g pnpm
   pnpm --version  # Should be 9.x
   ```

3. **Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Verify installation:
     ```bash
     docker --version
     docker compose version
     ```

4. **PostgreSQL Client (Optional)**
   - For database migrations and debugging
   - `psql` command line tool or pgAdmin

### Required Ports

Ensure these ports are available:
- `3000` - Gateway
- `3001-3020` - Backend services
- `5173` - Frontend (Vite dev server)
- `5432` - PostgreSQL
- `8080` - Keycloak
- `9000` - MinIO
- `9001` - MinIO Console
- `19092` - Kafka/Redpanda

---

## Step 1: Clone and Setup Project

```bash
# Navigate to project directory
cd /Users/n15318/LoS

# Install all dependencies (if not already done)
pnpm -w install

# This installs dependencies for:
# - All backend services
# - Gateway
# - Frontend
# - Shared libraries
```

**Expected output**: All dependencies installed successfully

---

## Step 2: Start Infrastructure Services (Docker)

Infrastructure services are required for the application to work:
- PostgreSQL (database)
- Redpanda/Kafka (event streaming)
- MinIO (document storage)
- Keycloak (authentication)

### Start Docker Desktop
1. Open Docker Desktop application
2. Wait for Docker to be fully started (whale icon in menu bar should be stable)

### Start Infrastructure

```bash
# Navigate to infra directory
cd infra

# Start all infrastructure services
docker compose up -d

# Verify services are running
docker compose ps
```

**Expected output**: All services show "Up" status
```
NAME              STATUS
los-postgres      Up
los-redpanda      Up
los-minio         Up
los-keycloak      Up
```

### Wait for Services to be Ready

Infrastructure services need ~30 seconds to initialize:

```bash
# Check PostgreSQL is ready
docker compose logs postgres | tail -5

# Check Keycloak is ready (look for "started" message)
docker compose logs keycloak | tail -10

# All services should be healthy after ~30 seconds
docker compose ps
```

---

## Step 3: Setup Database

### Create Database Schema

```bash
# From project root
cd /Users/n15318/LoS

# Connect to PostgreSQL and create schemas
psql -h localhost -U los -d los -f services/masters/schema.sql
psql -h localhost -U los -d los -f services/application/schema.sql
psql -h localhost -U los -d los -f services/customer-kyc/schema.sql
psql -h localhost -U los -d los -f services/document/schema.sql
psql -h localhost -U los -d los -f services/orchestrator/schema.sql

# Run migrations (if any)
# Each service may have migrations in services/[service]/migrations/

# Seed initial data (optional)
psql -h localhost -U los -d los -f infra/seed.sql
```

**If psql is not available**, you can use Docker:

```bash
# Run migrations via Docker
docker exec -i los-postgres psql -U los -d los < services/masters/schema.sql
docker exec -i los-postgres psql -U los -d los < services/application/schema.sql
docker exec -i los-postgres psql -U los -d los < services/customer-kyc/schema.sql
docker exec -i los-postgres psql -U los -d los < services/document/schema.sql
docker exec -i los-postgres psql -U los -d los < services/orchestrator/schema.sql
docker exec -i los-postgres psql -U los -d los < infra/seed.sql
```

---

## Step 4: Setup Keycloak (Authentication)

### Access Keycloak Admin Console

1. Open browser: http://localhost:8080
2. Login with:
   - Username: `admin`
   - Password: `admin`

### Import Realm Configuration

1. Click **"Add realm"** or use existing `los` realm
2. If `los` realm doesn't exist:
   - Click "Add realm"
   - Upload `infra/keycloak-realm.json` OR create manually:
     - Realm name: `los`
     - Enabled: ON
     - Click "Create"

3. Create a client for the frontend:
   - Go to **Clients** → **Create**
   - Client ID: `los-ui`
   - Client Protocol: `openid-connect`
   - Root URL: `http://localhost:5173`
   - Valid Redirect URIs: `http://localhost:5173/*`
   - Web Origins: `http://localhost:5173`
   - Click "Save"

4. Create test users (optional):
   - Go to **Users** → **Add user**
   - Username: `maker1`, Password: `maker1` (Temporary password, set password on first login)
   - Username: `checker1`, Password: `checker1`
   - Username: `admin1`, Password: `admin1`

---

## Step 5: Configure Environment Variables

### Create .env Files (Optional)

Services use default values, but you can override them:

```bash
# From project root, create .env files if needed
# Most services work with defaults:
# DATABASE_URL=postgres://los:los@localhost:5432/los
# KAFKA_BROKERS=localhost:19092
# KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/los
```

### Verify Key Environment Variables

```bash
# Check if services can connect
# These should be set (or use defaults):
# - DATABASE_URL=postgres://los:los@localhost:5432/los
# - KAFKA_BROKERS=localhost:19092
# - KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/los
# - KEYCLOAK_JWKS_URI=http://localhost:8080/realms/los/protocol/openid-connect/certs
# - KEYCLOAK_CLIENT_ID=los-ui
```

---

## Step 6: Build Services

```bash
# From project root
cd /Users/n15318/LoS

# Build all services
pnpm -w build

# This compiles TypeScript for all services:
# - Gateway
# - All backend services (15 services)
# - Shared libraries
```

**Note**: If you encounter TypeScript errors, they may need fixing first. Most services should build successfully.

**Expected output**: 
```
✅ Built successfully
```

---

## Step 7: Start All Services

You have two options:

### Option A: Start All Services in Parallel (Recommended)

```bash
# From project root
pnpm -w --parallel run dev

# This starts all services simultaneously:
# - Gateway (port 3000)
# - Application (3001)
# - Customer-KYC (3002)
# - Document (3003)
# - Masters (3004)
# - Underwriting (3006)
# - Sanction-Offer (3007)
# - Payments (3008)
# - Disbursement (3009)
# - Orchestrator (3010)
# - Notifications (3011)
# - Audit (3012)
# - Bureau (3013)
# - Verification (3014)
# - Reporting (3015)
# - Auth (3016)
# - Leads (3017)
# - Scoring (3018)
# - Analytics (3019)
# - Integration Hub (3020)
```

### Option B: Start Services in Separate Terminals (For Debugging)

Open multiple terminals and run:

**Terminal 1 - Gateway:**
```bash
cd gateway
pnpm dev
```

**Terminal 2 - Core Services:**
```bash
cd services/application
pnpm dev
```

**Terminal 3 - More Services:**
```bash
cd services/customer-kyc
pnpm dev
```

**... and so on for each service**

**Terminal N - Frontend:**
```bash
cd web
pnpm dev
```

---

## Step 8: Start Frontend

```bash
# Open a new terminal
cd web

# Start frontend dev server
pnpm dev
```

**Expected output**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 9: Verify All Services are Running

### Check Service Health Endpoints

```bash
# Gateway
curl http://localhost:3000/health
# Expected: OK

# Application Service
curl http://localhost:3001/health
# Expected: OK

# Scoring Service (new)
curl http://localhost:3018/health
# Expected: OK

# Analytics Service (new)
curl http://localhost:3019/health
# Expected: OK

# Customer-KYC
curl http://localhost:3002/health
# Expected: OK

# ... test other services similarly
```

### Check Infrastructure Services

```bash
# PostgreSQL
docker exec los-postgres pg_isready -U los
# Expected: accepting connections

# Keycloak
curl http://localhost:8080/health
# Expected: {"status":"UP"}

# MinIO
curl http://localhost:9000/minio/health/live
# Expected: OK
```

### Verify in Browser

1. **Frontend**: http://localhost:5173
   - Should show login page or application UI

2. **Keycloak**: http://localhost:8080
   - Should show Keycloak login page

3. **MinIO Console**: http://localhost:9001
   - Login: `minio` / `minio123`
   - Should show MinIO dashboard

---

## Step 10: Test the Application

### Test New Features

#### Scoring Service

```bash
# Get available scoring providers
curl http://localhost:3018/api/scoring/providers

# Calculate score (example)
curl -X POST http://localhost:3018/api/scoring/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "123e4567-e89b-12d3-a456-426614174000",
    "applicantId": "223e4567-e89b-12d3-a456-426614174000",
    "monthlyIncome": 50000,
    "existingEmi": 10000,
    "proposedAmount": 1000000,
    "tenureMonths": 60,
    "applicantAgeYears": 35,
    "creditScore": 750
  }'
```

#### Analytics Service

```bash
# Get predictive approval rate
curl "http://localhost:3019/api/analytics/predictive/approval-rate?timeframe=30d"

# Build custom report
curl -X POST http://localhost:3019/api/analytics/reports/build \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Report",
    "metrics": ["totalApplications", "approvalRate"],
    "dimensions": ["status", "channel"],
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    }
  }'
```

### Test Full Workflow

1. **Login**: http://localhost:5173
   - Use Keycloak credentials created earlier

2. **Create Application**: Navigate to "New Application"
   - Fill in required fields
   - Submit application

3. **Check Application Status**: View in dashboard

---

## Troubleshooting

### Issue: Services won't start

**Solution**: 
```bash
# Check if ports are already in use
lsof -i :3000
lsof -i :3018
# Kill processes if needed: kill -9 <PID>

# Or change ports in service configuration
```

### Issue: Database connection errors

**Solution**:
```bash
# Verify PostgreSQL is running
docker compose -f infra/docker-compose.yml ps

# Check database connection
docker exec los-postgres psql -U los -d los -c "SELECT 1;"

# If connection fails, restart PostgreSQL
docker compose -f infra/docker-compose.yml restart postgres
```

### Issue: Keycloak connection errors

**Solution**:
```bash
# Wait for Keycloak to fully start (takes ~60 seconds)
docker compose -f infra/docker-compose.yml logs keycloak | grep "started"

# Verify Keycloak is accessible
curl http://localhost:8080/health

# Check realm configuration
# Access http://localhost:8080 and verify `los` realm exists
```

### Issue: Kafka/Redpanda errors

**Solution**:
```bash
# Check Redpanda is running
docker compose -f infra/docker-compose.yml ps redpanda

# Restart Redpanda if needed
docker compose -f infra/docker-compose.yml restart redpanda
```

### Issue: Service builds fail

**Solution**:
```bash
# Clean and rebuild
pnpm -w clean  # If clean script exists
rm -rf node_modules
rm -rf */node_modules
rm -rf services/*/node_modules
pnpm -w install
pnpm -w build
```

### Issue: Frontend won't connect to backend

**Solution**:
```bash
# Check Gateway is running
curl http://localhost:3000/health

# Verify CORS settings in gateway/src/server.ts
# Default allows: http://localhost:5173

# Check browser console for errors
```

---

## Stopping the Application

### Stop Services

```bash
# Press Ctrl+C in terminal running services
# Or kill processes:
pkill -f "pnpm dev"
pkill -f "tsx watch"
pkill -f "ts-node-dev"
```

### Stop Infrastructure

```bash
cd infra
docker compose down

# To remove all data (⚠️ deletes database):
docker compose down -v
```

---

## Quick Reference: Service URLs

| Service | URL | Health Check |
|---------|-----|--------------|
| Gateway | http://localhost:3000 | /health |
| Frontend | http://localhost:5173 | - |
| Application | http://localhost:3001 | /health |
| Scoring | http://localhost:3018 | /health |
| Analytics | http://localhost:3019 | /health |
| Keycloak | http://localhost:8080 | /health |
| MinIO Console | http://localhost:9001 | - |
| PostgreSQL | localhost:5432 | - |

---

## Next Steps

Once everything is running:

1. ✅ Test scoring service with different scenarios
2. ✅ Test analytics service reports
3. ✅ Create test applications
4. ✅ Verify mobile PWA functionality
5. ✅ Test third-party integrations (if configured)

---

## Summary

✅ **Full Stack Running Locally!**

All services should now be operational:
- ✅ Infrastructure (Docker)
- ✅ Backend Services (17 services)
- ✅ Frontend (React)
- ✅ New Services (Scoring & Analytics)

Access the application at: **http://localhost:5173**

