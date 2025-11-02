# Cloud Run Deployment Checklist

Use this checklist to ensure all steps are completed for deploying LOS to Google Cloud Run.

## Pre-Deployment

- [ ] Google Cloud Project created
- [ ] Billing enabled on project
- [ ] gcloud CLI installed and authenticated (`gcloud auth login`)
- [ ] Project ID identified and set: `export GOOGLE_CLOUD_PROJECT=your-project-id`
- [ ] Region selected (recommended: `us-central1`)

## Infrastructure Setup

- [ ] Run `./setup-gcp-resources.sh [REGION] [PROJECT_ID]`
- [ ] Cloud SQL PostgreSQL instance created
- [ ] Artifact Registry repository created
- [ ] Cloud Storage bucket created
- [ ] Secret Manager secrets created:
  - [ ] `database-url`
  - [ ] `kafka-brokers`
  - [ ] `keycloak-config`
- [ ] Service account created: `los-cloud-run@[PROJECT_ID].iam.gserviceaccount.com`
- [ ] Service account has required IAM roles
- [ ] Database password saved securely

## Database Setup

- [ ] Cloud SQL instance is running
- [ ] Database created: `los`
- [ ] Database user created with appropriate permissions
- [ ] Database migrations run:
  - [ ] `services/application/schema.sql`
  - [ ] `services/customer-kyc/schema.sql`
  - [ ] `services/document/schema.sql`
  - [ ] `services/sanction-offer/schema.sql`
  - [ ] `services/payments/schema.sql`
  - [ ] `services/disbursement/schema.sql`
  - [ ] `services/masters/schema.sql`
  - [ ] `services/orchestrator/schema.sql`
  - [ ] `services/audit/schema.sql`
  - [ ] `services/bureau/schema.sql`
  - [ ] `services/verification/schema.sql`
  - [ ] `services/notifications/schema.sql`
- [ ] Seed data loaded (if applicable): `infra/seed.sql`

## Image Building

- [ ] All Dockerfiles present and valid
- [ ] Cloud Build configuration reviewed (`cloudbuild.yaml`)
- [ ] Images built successfully:
  ```bash
  gcloud builds submit --config=infra/gcp/cloudbuild.yaml
  ```
- [ ] Images pushed to Artifact Registry
- [ ] Images verified in Artifact Registry console

## Service Deployment

- [ ] All services deployed to Cloud Run:
  - [ ] Gateway
  - [ ] Application
  - [ ] Customer KYC
  - [ ] Document
  - [ ] Masters
  - [ ] Underwriting
  - [ ] Sanction Offer
  - [ ] Payments
  - [ ] Disbursement
  - [ ] Orchestrator
  - [ ] Notifications
  - [ ] Audit
  - [ ] Bureau
  - [ ] Verification
  - [ ] Reporting
  - [ ] Integration Hub

- [ ] Service URLs collected and documented
- [ ] Gateway URL is accessible
- [ ] All services showing healthy status

## Configuration

- [ ] Environment variables set correctly
- [ ] Secrets accessible to all services
- [ ] Cloud SQL connection configured (Unix socket)
- [ ] Cloud Storage bucket accessible
- [ ] Keycloak URL configured (if using external Keycloak)
- [ ] Kafka/Pub/Sub endpoints configured
- [ ] CORS origins configured for gateway

## Testing

- [ ] Health checks pass: `curl https://[SERVICE_URL]/health`
- [ ] Gateway accessible and routing correctly
- [ ] Database connections working
- [ ] Can create test application
- [ ] Can upload test document
- [ ] Event publishing/consumption working
- [ ] Integration hub endpoints accessible

## Security

- [ ] Service accounts have least privilege access
- [ ] Secrets stored in Secret Manager (not env vars)
- [ ] Database password rotated and updated
- [ ] API authentication configured (if needed)
- [ ] CORS configured correctly
- [ ] HTTPS-only enforced (default for Cloud Run)

## Monitoring

- [ ] Cloud Logging enabled and accessible
- [ ] Cloud Monitoring dashboards created (optional)
- [ ] Alert policies configured (optional)
- [ ] Service health endpoints monitoring (optional)

## Cost Optimization

- [ ] Min instances set appropriately (0 for most services, 1 for gateway)
- [ ] Max instances capped appropriately
- [ ] CPU throttling enabled
- [ ] Request timeouts configured
- [ ] Unused services removed (if any)

## Documentation

- [ ] Service URLs documented
- [ ] Database connection details documented
- [ ] Secrets location documented
- [ ] Deployment process documented
- [ ] Rollback procedure documented (if needed)

## Post-Deployment

- [ ] Smoke tests passed
- [ ] Integration tests passed
- [ ] Performance baseline established
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented
- [ ] Team trained on Cloud Run deployment

## Optional Enhancements

- [ ] Custom domain configured for gateway
- [ ] Cloud CDN enabled for static assets
- [ ] Load testing completed
- [ ] Auto-scaling policies tuned
- [ ] CI/CD pipeline configured for auto-deployment
- [ ] Blue-green deployment strategy (if needed)
- [ ] Canary deployments (if needed)

## Troubleshooting Resources

- [ ] Know where to find Cloud Run logs
- [ ] Know how to view Secret Manager secrets
- [ ] Know how to check Cloud SQL status
- [ ] Have access to Cloud Console
- [ ] Know how to rollback a deployment

---

**Last Updated**: After initial deployment
**Deployed By**: ________________
**Deployment Date**: ________________


