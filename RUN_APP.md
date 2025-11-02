# Running the Application

## Status

✅ **TypeScript errors fixed** - Masters service type annotations added

⚠️ **Docker not available** - Infrastructure (PostgreSQL, Kafka, etc.) needs Docker to run

## Quick Start Options

### Option 1: Development Mode (Without Docker)

If you don't have Docker, you can still run services that don't require infrastructure:

1. **Start services individually:**
   ```bash
   # Terminal 1: Gateway
   cd gateway && pnpm dev
   
   # Terminal 2: Scoring Service
   cd services/scoring && pnpm dev
   
   # Terminal 3: Analytics Service  
   cd services/analytics && pnpm dev
   
   # Terminal 4: Frontend
   cd web && pnpm dev
   ```

2. **Or use parallel command:**
   ```bash
   pnpm -w --filter "./gateway" --filter "./services/scoring" --filter "./services/analytics" --parallel run dev
   ```

### Option 2: Full Stack (Requires Docker)

1. **Start Infrastructure:**
   ```bash
   cd infra
   docker compose up -d
   ```

2. **Wait for services (30 seconds)**
   ```bash
   sleep 30
   ```

3. **Start All Services:**
   ```bash
   pnpm -w --parallel run dev
   ```

## Service URLs

Once running:
- **Gateway**: http://localhost:3000
- **Scoring**: http://localhost:3018
- **Analytics**: http://localhost:3019
- **Frontend**: http://localhost:5173

## Health Checks

```bash
curl http://localhost:3000/health  # Gateway
curl http://localhost:3018/health  # Scoring
curl http://localhost:3019/health  # Analytics
```

## Note

The application is **ready to run** but requires:
- ✅ **Dependencies installed** (done)
- ✅ **TypeScript errors fixed** (done)
- ⚠️ **Docker for infrastructure** (PostgreSQL, Kafka, MinIO, Keycloak)
- ⚠️ **Database migrations** (if using database-dependent services)

For testing scoring and analytics services independently, Docker is not required!

