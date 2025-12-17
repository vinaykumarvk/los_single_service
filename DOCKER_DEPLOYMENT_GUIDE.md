# Docker Deployment Guide

## Prerequisites

1. **Docker Desktop** must be running on your Mac
   - Check: Docker icon in menu bar should be running
   - If not running: Open Docker Desktop application

2. **Ports Available** (optional check):
   - 3000 - Monolith service
   - 5432 - PostgreSQL
   - 19092 - Redpanda (Kafka)
   - 9000 - MinIO
   - 8080 - Keycloak

## Quick Start

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running on your Mac.

### Step 2: Start Infrastructure Services
```bash
cd /Users/n15318/LoS
docker compose -f infra/docker-compose.monolith.yml up -d postgres redpanda minio keycloak
```

Wait for services to be healthy (about 30 seconds):
```bash
docker ps
# Should show: los-postgres, los-redpanda, los-minio, los-keycloak
```

### Step 3: Run Database Migrations
```bash
./scripts/run-migrations-docker.sh
```

This will:
- Wait for PostgreSQL to be ready
- Run all migrations in order
- Set up the database schema

### Step 4: Build and Start Monolith
```bash
docker compose -f infra/docker-compose.monolith.yml up --build monolith
```

This will:
- Build the monolith image (includes frontend + backend)
- Start the monolith service
- Connect to all infrastructure services

### Step 5: Access the Application
- **Frontend + API**: http://localhost:3000
- **Keycloak**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (minio/minio123)

## All-in-One Command

If you want to start everything at once:

```bash
cd /Users/n15318/LoS

# Start infrastructure
docker compose -f infra/docker-compose.monolith.yml up -d postgres redpanda minio keycloak

# Wait for postgres
sleep 10

# Run migrations
./scripts/run-migrations-docker.sh

# Build and start monolith
docker compose -f infra/docker-compose.monolith.yml up --build monolith
```

## Verify Deployment

### Check Services
```bash
docker ps
```

Should show:
- los-postgres
- los-redpanda
- los-minio
- los-keycloak
- los-monolith

### Test Health Endpoint
```bash
curl http://localhost:3000/health
# Should return: OK
```

### Test Frontend
```bash
curl http://localhost:3000/ | head -20
# Should return HTML
```

### Test API
```bash
curl http://localhost:3000/api/health
# Should return: OK
```

## Troubleshooting

### Docker Daemon Not Running
```
Error: Cannot connect to the Docker daemon
```
**Solution**: Start Docker Desktop application

### Port Already in Use
```
Error: bind: address already in use
```
**Solution**: 
```bash
# Find and kill process using the port
lsof -ti:3000 | xargs kill -9
# Or use different ports in docker-compose.yml
```

### Migration Errors
```
Error: relation already exists
```
**Solution**: This is normal if migrations were already run. The script handles this.

### Build Failures
```
Error: failed to build
```
**Solution**: 
```bash
# Clean build
docker compose -f infra/docker-compose.monolith.yml build --no-cache monolith
```

### Frontend Not Loading
```bash
# Check if web-dist exists in container
docker exec los-monolith ls -la /app/services/web-dist

# Check logs
docker logs los-monolith
```

## Stop Services

```bash
# Stop all services
docker compose -f infra/docker-compose.monolith.yml down

# Stop and remove volumes (clean slate)
docker compose -f infra/docker-compose.monolith.yml down -v
```

## View Logs

```bash
# All services
docker compose -f infra/docker-compose.monolith.yml logs -f

# Specific service
docker logs los-monolith -f
docker logs los-postgres -f
```

## Restart Services

```bash
# Restart monolith
docker compose -f infra/docker-compose.monolith.yml restart monolith

# Rebuild and restart
docker compose -f infra/docker-compose.monolith.yml up --build -d monolith
```

## Environment Variables

The docker-compose file uses defaults, but you can override with a `.env` file:

```bash
# Create .env file (optional)
POSTGRES_USER=los
POSTGRES_PASSWORD=los
POSTGRES_DB=los
JWT_SECRET=your-secret-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-here-min-32-chars
```

## Next Steps

After deployment:
1. Access http://localhost:3000
2. Login with test credentials (if configured)
3. Test the application features
4. Check logs if issues occur

## Production-Like Testing

This Docker setup matches production exactly:
- Same build process
- Same file structure
- Same static file serving
- Same API routing
- Same environment variables

Use this to test production builds before deploying!

