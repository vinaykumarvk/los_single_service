Infra

Helm charts, K8s manifests, CI/CD pipelines, observability configs.

## Local Development (Docker Compose)

- Requires Docker Desktop.
- From `infra/`: `docker compose up -d`
- Services:
  - Postgres: `localhost:5432` (los/los)
  - Redpanda (Kafka): broker `localhost:19092`
  - MinIO: S3 `http://localhost:9000` (minio/minio123), console `http://localhost:9001`
  - Keycloak: `http://localhost:8080` (admin/admin)

### Environment examples (service .env):

```
DATABASE_URL=postgres://los:los@localhost:5432/los
KAFKA_BROKERS=localhost:19092
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_REGION=us-east-1
MINIO_USE_SSL=false
MINIO_BUCKET=los-docs
KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/los
KEYCLOAK_JWKS_URI=http://localhost:8080/realms/los/protocol/openid-connect/certs
KEYCLOAK_CLIENT_ID=los-ui
```

## Production Deployment (Docker Compose)

The production docker-compose file (`docker-compose.prod.yml`) includes all services with:
- Health checks for all services
- Proper service dependencies
- Restart policies
- Production-ready configuration
- Isolated network

### Usage

1. **Prepare environment variables:**
   ```bash
   cd infra
   cp .env.prod.example .env.prod
   # Edit .env.prod with your production values
   ```

2. **Build and start all services:**
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

3. **Check service status:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

4. **View logs:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f [service-name]
   ```

5. **Stop services:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

### Required Environment Variables

- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `MINIO_ROOT_PASSWORD` - MinIO root password
- `KEYCLOAK_ADMIN_PASSWORD` - Keycloak admin password
- `WEBHOOK_SECRET` - Secret for webhook signature verification
- `CORS_ORIGIN` - Allowed CORS origins for gateway

### Service Health Checks

All services include health checks that can be monitored:
- HTTP endpoint: `http://localhost:<port>/health`
- Docker health status: `docker inspect --format='{{.State.Health.Status}}' <container>`

## CI/CD Pipelines

GitHub Actions workflows are configured in `.github/workflows/`:

- **ci.yml** - Lint, test, and build validation
- **docker-build.yml** - Build and push Docker images to GHCR
- **integration-test.yml** - Run integration tests with test database

### Building Docker Images Locally

```bash
# Build a specific service
docker build -f services/application/Dockerfile -t los-application:latest .

# Build all services (using production compose)
docker compose -f docker-compose.prod.yml build
```

### Image Registry

Images are automatically built and pushed to GitHub Container Registry (GHCR) on:
- Push to main/develop branches
- Pull requests (build only, no push)
- Tags (v* pattern)

Image naming: `ghcr.io/<owner>/<repo>-<service-name>:<tag>`

## Google Cloud Run Deployment

For deploying to Google Cloud Run, see [gcp/README.md](gcp/README.md).

The `gcp/` directory contains:
- **cloudbuild.yaml** - Cloud Build configuration for building all Docker images
- **setup-gcp-resources.sh** - Script to create required GCP resources (Cloud SQL, Artifact Registry, etc.)
- **deploy-services.sh** - Script to deploy all services to Cloud Run
- **env-secrets.sh** - Helper script for managing Secret Manager secrets
- **README.md** - Complete Cloud Run deployment guide

### Quick Cloud Run Setup

```bash
# 1. Setup GCP resources
cd infra/gcp
./setup-gcp-resources.sh us-central1 your-project-id

# 2. Build images
gcloud builds submit --config=infra/gcp/cloudbuild.yaml

# 3. Deploy services
./deploy-services.sh all us-central1 your-project-id
```

See [gcp/README.md](gcp/README.md) for detailed instructions.

