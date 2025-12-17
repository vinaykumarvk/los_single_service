# Monolith-Only Deployment Simplification

## Summary
All deployment configurations have been simplified to deploy **only the monolith service**, removing all individual microservices from the deployment path. This eliminates port conflicts and simplifies the deployment process.

## Changes Made

### 1. Root Dockerfile (`/Dockerfile`)
- **Before**: Built monolith + web frontend
- **After**: Builds only the monolith service
- **Removed**: Web frontend build steps
- **Result**: Faster builds, smaller images, no frontend deployment conflicts

### 2. Production Docker Compose (`infra/docker-compose.prod.yml`)
- **Before**: Deployed 15+ individual services (gateway, application, customer-kyc, document, masters, underwriting, sanction-offer, payments, disbursement, orchestrator, notifications, audit, bureau, verification, reporting, integration-hub, scoring, analytics)
- **After**: Deploys only infrastructure (postgres, redpanda, minio, keycloak) + monolith
- **Result**: Single service deployment, no port conflicts, simpler configuration

### 3. GCP Deployment Script (`infra/gcp/deploy-services.sh`)
- **Before**: Deployed all individual services to Cloud Run with different ports and configurations
- **After**: Deploys only the monolith service
- **Result**: Single Cloud Run service, simplified deployment process

### 4. Root Cloud Build (`cloudbuild.yaml`)
- **Before**: Generic build configuration
- **After**: Explicitly uses `services/monolith/Dockerfile`
- **Result**: Consistent monolith-only builds

## Benefits

1. **No Port Conflicts**: Only one service (monolith) runs on port 3000
2. **Simpler Deployment**: Single service to deploy instead of 15+
3. **Faster Builds**: No need to build individual service Dockerfiles
4. **Easier Maintenance**: One service to monitor and update
5. **Reduced Resource Usage**: Single container instead of multiple containers

## Deployment Files

### For Local Development:
- `infra/docker-compose.monolith.yml` - Already monolith-only ✅
- `services/monolith/Dockerfile` - Monolith-specific Dockerfile ✅

### For Production:
- `infra/docker-compose.prod.yml` - Now monolith-only ✅
- `Dockerfile` (root) - Now monolith-only ✅
- `infra/gcp/cloudbuild.yaml` - Already monolith-only ✅
- `infra/gcp/deploy-services.sh` - Now monolith-only ✅
- `cloudbuild.yaml` (root) - Now uses monolith Dockerfile ✅

## What Was Removed

All individual service deployments:
- gateway
- application
- customer-kyc
- document
- masters
- underwriting
- sanction-offer
- payments
- disbursement
- orchestrator
- notifications
- audit
- bureau
- verification
- reporting
- integration-hub
- scoring
- analytics

**Note**: The source code for these services still exists in the repository, but they are no longer deployed individually. All functionality is now consolidated in the monolith service.

## Next Steps

1. Test local deployment: `docker-compose -f infra/docker-compose.monolith.yml up`
2. Test production deployment: `docker-compose -f infra/docker-compose.prod.yml up`
3. Deploy to GCP: Use `infra/gcp/deploy-services.sh` or `infra/gcp/cloudbuild.yaml`

## Verification

To verify the simplification worked:
```bash
# Check that only monolith is in docker-compose.prod.yml
grep -A 5 "monolith:" infra/docker-compose.prod.yml

# Check that deploy script only deploys monolith
grep "deploy_service" infra/gcp/deploy-services.sh

# Check that root Dockerfile doesn't build web
grep -i "web" Dockerfile
```
