#!/bin/bash

# Setup script for GCP resources required for LOS deployment
# This script creates:
# - Cloud SQL PostgreSQL instance
# - Artifact Registry for Docker images
# - Pub/Sub topics (optional, for event streaming)
# - Cloud Storage bucket (for documents)
# - Secret Manager secrets
# - Service account for Cloud Run
# - IAM bindings

set -e

REGION=${1:-us-central1}
PROJECT_ID=${2:-$GOOGLE_CLOUD_PROJECT}
DB_INSTANCE_NAME=${3:-los-db}
DB_NAME=${4:-los}
DB_USER=${5:-los}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID is required. Set GOOGLE_CLOUD_PROJECT or pass as argument."
  exit 1
fi

echo "Setting up GCP resources for project: ${PROJECT_ID} in region: ${REGION}"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  pubsub.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  --project="${PROJECT_ID}"

# Create Artifact Registry for Docker images
echo "Creating Artifact Registry..."
gcloud artifacts repositories create los-images \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --description="LOS microservices Docker images" || echo "Artifact Registry may already exist"

# Create Cloud SQL PostgreSQL instance
echo "Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create "${DB_INSTANCE_NAME}" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --root-password="CHANGE_ME_INSTANCE_PASSWORD" \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --deletion-protection || echo "Cloud SQL instance may already exist"

# Create database
echo "Creating database..."
gcloud sql databases create "${DB_NAME}" \
  --instance="${DB_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" || echo "Database may already exist"

# Create database user
echo "Creating database user..."
DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create "${DB_USER}" \
  --instance="${DB_INSTANCE_NAME}" \
  --password="${DB_PASSWORD}" \
  --project="${PROJECT_ID}" || echo "User may already exist"

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe "${DB_INSTANCE_NAME}" \
  --project="${PROJECT_ID}" \
  --format="value(connectionName)")

echo "Database connection name: ${CONNECTION_NAME}"

# Create Cloud Storage bucket for documents
echo "Creating Cloud Storage bucket..."
BUCKET_NAME="${PROJECT_ID}-los-documents"
gsutil mb -p "${PROJECT_ID}" -l "${REGION}" "gs://${BUCKET_NAME}/" || echo "Bucket may already exist"

# Create Pub/Sub topics for events (optional - if using Pub/Sub instead of Kafka)
echo "Creating Pub/Sub topics..."
TOPICS=(
  "los.application.ApplicationCreated.v1"
  "los.application.ApplicationSubmitted.v1"
  "los.kyc.KYCStarted.v1"
  "los.document.DocumentUploaded.v1"
  "los.underwriting.UnderwritingCompleted.v1"
  "los.sanction.SanctionIssued.v1"
  "los.disbursement.DisbursementRequested.v1"
)

for topic in "${TOPICS[@]}"; do
  gcloud pubsub topics create "${topic}" \
    --project="${PROJECT_ID}" || echo "Topic ${topic} may already exist"
done

# Create service account for Cloud Run
echo "Creating service account..."
gcloud iam service-accounts create los-cloud-run \
  --display-name="LOS Cloud Run Service Account" \
  --description="Service account for LOS microservices on Cloud Run" \
  --project="${PROJECT_ID}" || echo "Service account may already exist"

SERVICE_ACCOUNT="los-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant permissions
echo "Granting IAM permissions..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/pubsub.publisher"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/pubsub.subscriber"

# Create secrets in Secret Manager
echo "Creating secrets in Secret Manager..."

# Database URL secret
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"
echo -n "${DATABASE_URL}" | gcloud secrets create database-url \
  --data-file=- \
  --replication-policy="automatic" \
  --project="${PROJECT_ID}" || \
  echo "${DATABASE_URL}" | gcloud secrets versions add database-url \
    --data-file=- \
    --project="${PROJECT_ID}"

# Kafka brokers (for now, use placeholder - update when Kafka is deployed)
echo -n "kafka-cluster:9092" | gcloud secrets create kafka-brokers \
  --data-file=- \
  --replication-policy="automatic" \
  --project="${PROJECT_ID}" || \
  echo "kafka-cluster:9092" | gcloud secrets versions add kafka-brokers \
    --data-file=- \
    --project="${PROJECT_ID}"

# Keycloak configuration (update with your Keycloak URL)
KEYCLOAK_CONFIG="{\"issuerUrl\":\"https://keycloak.example.com/realms/los\",\"jwksUri\":\"https://keycloak.example.com/realms/los/protocol/openid-connect/certs\",\"clientId\":\"los-ui\"}"
echo -n "${KEYCLOAK_CONFIG}" | gcloud secrets create keycloak-config \
  --data-file=- \
  --replication-policy="automatic" \
  --project="${PROJECT_ID}" || \
  echo "${KEYCLOAK_CONFIG}" | gcloud secrets versions add keycloak-config \
    --data-file=- \
    --project="${PROJECT_ID}"

# Grant service account access to secrets
echo "Granting secret access..."
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}"

gcloud secrets add-iam-policy-binding kafka-brokers \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}"

gcloud secrets add-iam-policy-binding keycloak-config \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="${PROJECT_ID}"

echo ""
echo "✓ GCP resources setup complete!"
echo ""
echo "Summary:"
echo "  Project ID: ${PROJECT_ID}"
echo "  Region: ${REGION}"
echo "  Cloud SQL Instance: ${DB_INSTANCE_NAME}"
echo "  Connection Name: ${CONNECTION_NAME}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Password: ${DB_PASSWORD} (save this securely!)"
echo "  Storage Bucket: gs://${BUCKET_NAME}"
echo "  Service Account: ${SERVICE_ACCOUNT}"
echo ""
echo "Next steps:"
echo "1. Update database password if needed:"
echo "   gcloud sql users set-password ${DB_USER} --instance=${DB_INSTANCE_NAME} --password=<new-password>"
echo ""
echo "2. Run database migrations:"
echo "   Connect to Cloud SQL and run schema.sql files from each service"
echo ""
echo "3. Build and deploy services:"
echo "   gcloud builds submit --config=infra/gcp/cloudbuild.yaml"
echo "   ./infra/gcp/deploy-services.sh all ${REGION} ${PROJECT_ID}"

