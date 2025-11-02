# Quick Start Guide

## Prerequisites
- Docker Desktop running
- Node.js 20+ and pnpm installed
- Ports 3000-3020, 5173, 5432, 8080, 9000 available

## Start Application

### Option 1: Automated Script (Recommended)
```bash
./start-app.sh
```

### Option 2: Manual Start

1. **Start Infrastructure:**
   ```bash
   cd infra
   docker compose up -d
   cd ..
   ```

2. **Install Dependencies:**
   ```bash
   pnpm -w install
   ```

3. **Build Services:**
   ```bash
   pnpm -w build
   ```

4. **Start Services (in separate terminals or use `pnpm -w --parallel run dev`):**
   ```bash
   # Terminal 1: Gateway
   cd gateway && pnpm dev
   
   # Terminal 2: Core Services
   pnpm -w --filter "./services/*" --parallel run dev
   
   # Terminal 3: Frontend
   cd web && pnpm dev
   ```

## Service URLs

### Backend Services
- **Gateway**: http://localhost:3000
- **Scoring**: http://localhost:3018
- **Analytics**: http://localhost:3019
- **Application**: http://localhost:3001
- **Auth**: http://localhost:3016
- **KYC**: http://localhost:3002
- **Document**: http://localhost:3003

### Frontend
- **Web UI**: http://localhost:5173

### Infrastructure
- **Keycloak**: http://localhost:8080 (admin/admin)
- **MinIO Console**: http://localhost:9001 (minio/minio123)
- **PostgreSQL**: localhost:5432 (los/los)

## Health Checks

```bash
# Check all services
curl http://localhost:3000/health  # Gateway
curl http://localhost:3018/health  # Scoring
curl http://localhost:3019/health  # Analytics
curl http://localhost:3001/health  # Application
```

## Stop Application

```bash
# Stop all services
pkill -f "pnpm dev"

# Stop infrastructure
cd infra
docker compose down
```

## Troubleshooting

1. **Port already in use**: Stop the conflicting service or change port in `.env`
2. **Docker not running**: Start Docker Desktop
3. **Database connection error**: Wait for PostgreSQL to be ready (30 seconds after start)
4. **Build errors**: Run `pnpm -w install` again

