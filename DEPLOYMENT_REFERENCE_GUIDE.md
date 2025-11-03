# LoS Deployment Reference Guide (Single Source)

This guide consolidates all deployment steps, prerequisites, environments, and operational handoffs into one document for the deployment team.

- Audience: DevOps/Platform/Deployment teams
- Scope: Serverless on Google Cloud (Cloud Run) with optional GKE notes
- Source of Truth: This document + repository root

---

## 1) Prerequisites & Access

- GitHub repository access (read/clone)
- Google Cloud project with Owner or sufficient IAM roles
  - Roles: Artifact Registry Admin, Cloud Run Admin, Cloud Build Editor, Secret Manager Admin, Cloud SQL Admin, Service Account Admin, Viewer
- Tools installed:
  - gcloud SDK, Docker, Git, jq
- Enable APIs:
  ```bash
  gcloud services enable \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    secretmanager.googleapis.com \
    sqladmin.googleapis.com \
    iam.googleapis.com
  ```
- Set project/region:
  ```bash
  gcloud auth login
  gcloud auth application-default login
  gcloud config set project <PROJECT_ID>
  export REGION=us-central1
  ```

---

## 2) Environments & Secrets

Populate production environment variables using `infra/env.prod.template` as reference. Store in Secret Manager:

Required secrets (minimum):
- `DATABASE_URL` (or use Cloud SQL Connector)
- `JWT_SECRET` (if applicable)
- Third-party keys (scoring/analytics), e.g. `EXPERIAN_API_KEY` (optional)

Create secrets:
```bash
# Example values; replace accordingly
printf "%s" "postgres://USER:PASS@HOST:5432/los" | gcloud secrets create LOS_DATABASE_URL --data-file=-
# Repeat per secret
```

Optional variables per service are documented in service READMEs.

---

## 3) Build & Push Container Images (Artifact Registry)

Create Artifact Registry:
```bash
gcloud artifacts repositories create los-repo \
  --repository-format=docker --location=${REGION} --description="LoS images"
```

Build & push (root):
```bash
REG=${REGION}-docker.pkg.dev/$(gcloud config get-value project)/los-repo

# Gateway + core services
gcloud builds submit --pack image=$REG/gateway:latest gateway/
gcloud builds submit --pack image=$REG/application:latest services/application/
gcloud builds submit --pack image=$REG/kyc:latest services/customer-kyc/
gcloud builds submit --pack image=$REG/document:latest services/document/
gcloud builds submit --pack image=$REG/underwriting:latest services/underwriting/

gcloud builds submit --pack image=$REG/reporting:latest reporting/

gcloud builds submit --pack image=$REG/scoring:latest services/scoring/
gcloud builds submit --pack image=$REG/analytics:latest services/analytics/
# Add others as needed (sanction-offer, payments, disbursement, etc.)
```

---

## 4) Database (Cloud SQL Postgres)

Option A: Use existing Postgres → set `DATABASE_URL` secret.

Option B: Provision Cloud SQL:
```bash
gcloud sql instances create los-pg \
  --database-version=POSTGRES_15 --tier=db-custom-2-4096 --region=${REGION}

gcloud sql databases create los --instance=los-pg
# Set password for postgres (or create a dedicated user)
gcloud sql users set-password postgres --instance=los-pg --password <PASSWORD>
```
Connect from Cloud Run using Connector or direct IP:
- If using Cloud SQL Connector: add `--add-cloudsql-instances=<PROJECT>:${REGION}:los-pg` and set connector env/socket if applicable.

Run migrations (example):
```bash
# Run per service or central script if available
# Example using application service migration tool (adjust to your tooling)
# pnpm -w run migrate
```

---

## 5) Serverless Deployment (Cloud Run)

Create service account (optional but recommended):
```bash
PROJECT_ID=$(gcloud config get-value project)
SERVICE_ACCOUNT=los-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com

gcloud iam service-accounts create los-cloud-run --display-name "LoS Cloud Run"
```
Grant access (secrets, cloudsql, artifact registry):
```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$SERVICE_ACCOUNT \
  --role=roles/run.admin

# Add roles: secretmanager.secretAccessor, cloudsql.client, artifactregistry.reader
```

Deploy core services:
```bash
REG=${REGION}-docker.pkg.dev/$(gcloud config get-value project)/los-repo

# Application
gcloud run deploy application \
  --image=$REG/application:latest \
  --region=${REGION} --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 --max-instances=10 \
  --cpu=1 --memory=512Mi \
  --set-env-vars="PORT=3001" \
  --set-secrets="DATABASE_URL=LOS_DATABASE_URL:latest"

# Gateway (reference application URL)
APP_URL=$(gcloud run services describe application --region ${REGION} --format='value(status.url)')

gcloud run deploy gateway \
  --image=$REG/gateway:latest \
  --region=${REGION} --platform=managed \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=20 \
  --cpu=2 --memory=1Gi \
  --set-env-vars="PORT=3000,APPLICATION_SERVICE_URL=${APP_URL}"

# Repeat for other services (kyc, document, underwriting, reporting, scoring, analytics)
```

Verify:
```bash
gcloud run services list --region ${REGION}
curl -s $(gcloud run services describe gateway --region ${REGION} --format='value(status.url)')/health
```

---

## 6) Custom Domain & SSL (Optional)

- Create HTTPS Load Balancer for Cloud Run or map domain directly per-service
- Use Managed SSL Certificates
- Optionally set up Cloud DNS zone and records for your domain

---

## 7) Observability & Ops

Logging & Monitoring
- Cloud Logging: view logs per service
- Cloud Monitoring: set uptime checks and alerting

Security
- Rotate secrets in Secret Manager
- Lock down service-to-service calls with IAM or signed JWT (optionally)
- If using Keycloak, provision it as a Cloud Run service and configure realms/users

Scaling
- Tune `min-instances` for cold start vs cost trade-offs
- Adjust concurrency and `max-instances` to protect downstream services

Backups & DR
- Cloud SQL automated backups + point-in-time recovery (enable)
- Export periodic backups to Cloud Storage

---

## 8) GKE (Optional Path)

If you outgrow Cloud Run:
- Create GKE cluster (zonal/regional)
- Use Helm charts or YAML in `infra/k8s` (if provided)
- Add HTTP(S) Load Balancer via Ingress
- Prefer managed Postgres (Cloud SQL) over self-hosted

---

## 9) Handover Checklist (to Deployment Team)

- [ ] GitHub repo URL and access confirmed
- [ ] GCP project ID and billing enabled
- [ ] APIs enabled (see Section 1)
- [ ] Artifact Registry created and images pushed
- [ ] Secrets created in Secret Manager
- [ ] Cloud SQL provisioned and migrations run
- [ ] Cloud Run services deployed (gateway + core)
- [ ] Health checks verified (gateway `/health`)
- [ ] Domain/SSL configured (optional)
- [ ] Logging/Monitoring alerts configured
- [ ] Runbooks for rollback and incident handling

---

## 10) Quick Commands (Copy/Paste)

Enable APIs & set project/region:
```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com
PROJECT_ID=<YOUR_PROJECT_ID>
gcloud config set project $PROJECT_ID
export REGION=us-central1
```

Create Artifact Registry & push images:
```bash
gcloud artifacts repositories create los-repo --repository-format=docker --location=${REGION}
REG=${REGION}-docker.pkg.dev/$PROJECT_ID/los-repo
gcloud builds submit --pack image=$REG/gateway:latest gateway/
# ...submit other services
```

Deploy Application + Gateway:
```bash
gcloud run deploy application --image=$REG/application:latest --region=${REGION} --allow-unauthenticated --set-secrets="DATABASE_URL=LOS_DATABASE_URL:latest" --set-env-vars="PORT=3001"
APP_URL=$(gcloud run services describe application --region ${REGION} --format='value(status.url)')
gcloud run deploy gateway --image=$REG/gateway:latest --region=${REGION} --allow-unauthenticated --set-env-vars="PORT=3000,APPLICATION_SERVICE_URL=${APP_URL}"
```

---

## 11) References

- Cost & sizing: `GCP_SERVERLESS_COST_ESTIMATE.md`
- Local quick start: `QUICK_START_FULL_STACK.md`
- Project README: `README.md`
- GCP helper scripts: `infra/gcp/` (e.g., `deploy-services.sh`)

---

Prepared for: Deployment Team  
Repository: Provide GitHub URL with read access
