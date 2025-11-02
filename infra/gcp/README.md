# Google Cloud Run Deployment

This directory contains all artifacts needed to deploy LOS microservices to Google Cloud Run.

## Prerequisites

1. **Google Cloud Project** - Create or select a GCP project
2. **gcloud CLI** - Install and authenticate: `gcloud auth login`
3. **Billing enabled** - Cloud Run requires billing
4. **Required APIs enabled** - Run setup script or enable manually:
   - Cloud Run API
   - Cloud SQL Admin API
   - Artifact Registry API
   - Secret Manager API
   - Cloud Build API
   - Pub/Sub API (optional)
   - Cloud Storage API

## Quick Start

### 1. Setup GCP Resources

```bash
cd infra/gcp
chmod +x setup-gcp-resources.sh
./setup-gcp-resources.sh [REGION] [PROJECT_ID]
```

This creates:
- Cloud SQL PostgreSQL instance
- Artifact Registry for Docker images
- Cloud Storage bucket for documents
- Pub/Sub topics for events
- Secret Manager secrets
- Service account with proper IAM roles

**Important:** Save the database password displayed at the end!

### 2. Build Docker Images

Build and push all service images to Artifact Registry:

```bash
# From project root
gcloud builds submit --config=infra/gcp/cloudbuild.yaml \
  --substitutions=_GCP_REGION=us-central1,_ARTIFACT_REGISTRY=los-images
```

Or build individual services:
```bash
gcloud builds submit --config=infra/gcp/cloudbuild.yaml \
  --substitutions=_GCP_REGION=us-central1,_ARTIFACT_REGISTRY=los-images \
  --no-source
```

### 3. Deploy Services to Cloud Run

```bash
cd infra/gcp
chmod +x deploy-services.sh
./deploy-services.sh all [REGION] [PROJECT_ID]
```

Or deploy a specific service:
```bash
./deploy-services.sh gateway us-central1 my-project-id
```

## Architecture

### Services

All 16 services are deployed as separate Cloud Run services:
- **Gateway** (port 3000) - API gateway, always-on with min instances
- **Application** (port 3001) - Loan applications
- **Customer KYC** (port 3002) - KYC workflows
- **Document** (port 3003) - Document storage
- **Masters** (port 3004) - Product catalog
- **Underwriting** (port 3006) - Underwriting logic
- **Sanction Offer** (port 3007) - Sanctions and offers
- **Payments** (port 3008) - Payment processing
- **Disbursement** (port 3009) - Loan disbursement
- **Orchestrator** (port 3010) - Saga orchestrator
- **Notifications** (port 3011) - Notifications
- **Audit** (port 3012) - Audit logging
- **Bureau** (port 3013) - Credit bureau integration
- **Verification** (port 3014) - Verification workflows
- **Reporting** (port 3015) - Analytics and reporting
- **Integration Hub** (port 3020) - External integrations

### Infrastructure Components

#### Cloud SQL PostgreSQL
- Managed PostgreSQL instance
- Connection via Unix socket (`/cloudsql/[CONNECTION_NAME]`)
- Automatic backups enabled
- High availability options available

#### Artifact Registry
- Stores Docker images for all services
- Region-specific for low latency
- Integrated with Cloud Build

#### Secret Manager
- Stores sensitive configuration:
  - `database-url` - PostgreSQL connection string
  - `kafka-brokers` - Kafka/event broker endpoints
  - `keycloak-config` - Keycloak configuration

#### Cloud Storage
- Stores document uploads
- Replaces MinIO in Cloud Run deployment
- Service account has object admin access

#### Pub/Sub (Optional)
- Event streaming alternative to Kafka
- Topics created for each event type
- Can be used instead of Kafka brokers

## Configuration

### Environment Variables

Services receive environment variables through:
1. **Direct env vars** - Non-sensitive config (e.g., `NODE_ENV`, `PORT`)
2. **Secret Manager** - Sensitive data (database, credentials)

Update secrets:
```bash
# Update database URL
echo -n "postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE" | \
  gcloud secrets versions add database-url --data-file=-

# Update Kafka brokers
echo -n "kafka-cluster:9092" | \
  gcloud secrets versions add kafka-brokers --data-file=-
```

### Service-Specific Configuration

Some services may need additional environment variables:
- **Document Service**: Cloud Storage bucket name
- **Notification Service**: Email/SMS provider credentials
- **Integration Hub**: External API keys

Add these as secrets or environment variables:
```bash
gcloud run services update los-document \
  --set-env-vars="STORAGE_BUCKET=${PROJECT_ID}-los-documents" \
  --region=us-central1
```

## Database Migrations

Run migrations after deploying services:

```bash
# Get Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe los-db --format="value(connectionName)")

# Connect to Cloud SQL
gcloud sql connect los-db --user=los

# Run migrations (from psql)
\i services/application/schema.sql
\i services/customer-kyc/schema.sql
\i services/document/schema.sql
# ... etc
```

Or use Cloud SQL Proxy locally:
```bash
cloud_sql_proxy -instances=${CONNECTION_NAME}=tcp:5432
# Then run migrations locally pointing to localhost:5432
```

## Monitoring and Logging

### Cloud Logging
All services automatically send logs to Cloud Logging:
- View logs: `gcloud logging read "resource.type=cloud_run_revision"`
- Filter by service: Add `resource.labels.service_name=los-gateway`

### Monitoring
- Cloud Run metrics in Cloud Monitoring
- Service health endpoints: `https://[SERVICE_URL]/health`
- Custom metrics via Prometheus endpoints (if configured)

## Scaling

Cloud Run automatically scales services based on traffic:
- **Gateway**: Min 1 instance (always available)
- **Other services**: Min 0 (scale to zero)
- Max instances configured per service

Adjust scaling:
```bash
gcloud run services update los-gateway \
  --min-instances=2 \
  --max-instances=50 \
  --region=us-central1
```

## Costs Optimization

1. **Min instances = 0** for non-critical services
2. **CPU throttling** enabled (reduces costs when idle)
3. **Request timeout** set to 300s (prevents long-running requests)
4. **Concurrency** tuned per service (fewer instances needed)
5. **Cloud SQL** - Use appropriate tier (f1-micro for dev, higher for prod)

## Security

- **Service accounts** - Each service uses dedicated service account
- **IAM bindings** - Least privilege access
- **Secret Manager** - Secrets encrypted at rest
- **VPC** - Cloud SQL uses private IP (when available)
- **HTTPS only** - All Cloud Run services use HTTPS
- **Authentication** - Configure as needed (allow-unauthenticated for public APIs)

## Troubleshooting

### Service won't start
1. Check logs: `gcloud logging read "resource.labels.service_name=los-gateway" --limit=50`
2. Verify secrets are accessible
3. Check Cloud SQL connection
4. Verify service account permissions

### Database connection issues
1. Ensure Cloud SQL instance is running
2. Verify connection name format
3. Check service account has `cloudsql.client` role
4. Test connection manually

### Image build failures
1. Check Cloud Build logs in console
2. Verify Dockerfile paths are correct
3. Ensure Artifact Registry exists

## CI/CD Integration

Integrate with Cloud Build triggers:
```bash
gcloud builds triggers create github \
  --name="los-deploy" \
  --repo-name="los" \
  --repo-owner="your-org" \
  --branch-pattern="^main$" \
  --build-config="infra/gcp/cloudbuild.yaml" \
  --substitutions="_GCP_REGION=us-central1,_ARTIFACT_REGISTRY=los-images"
```

## Next Steps

1. Configure custom domain for gateway
2. Set up monitoring alerts
3. Configure auto-scaling policies
4. Set up CI/CD pipelines
5. Enable Cloud CDN for static assets
6. Configure backup and disaster recovery


