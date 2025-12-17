#!/bin/bash

# Cloud Run Deployment Script for LOS Monolith
# Usage: ./deploy-services.sh [region] [project-id]
# 
# Note: This script now only deploys the monolith service.
# All individual microservices have been consolidated into the monolith.

set -e

REGION=${1:-us-central1}
PROJECT_ID=${2:-$GOOGLE_CLOUD_PROJECT}
ARTIFACT_REGISTRY="los-images"
IMAGE_REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REGISTRY}"

if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID is required. Set GOOGLE_CLOUD_PROJECT or pass as argument."
  exit 1
fi

# Common environment variables (stored in Secret Manager)
# You'll need to create these secrets first
DB_SECRET="projects/${PROJECT_ID}/secrets/database-url/versions/latest"
KAFKA_SECRET="projects/${PROJECT_ID}/secrets/kafka-brokers/versions/latest"
KEYCLOAK_SECRET="projects/${PROJECT_ID}/secrets/keycloak-config/versions/latest"

# Cloud SQL connection name (update with your instance)
CLOUD_SQL_INSTANCE="${PROJECT_ID}:${REGION}:los-db"

# Service account for Cloud Run (create this service account)
SERVICE_ACCOUNT="los-cloud-run@${PROJECT_ID}.iam.gserviceaccount.com"

deploy_service() {
  local service=$1
  local port=$2
  local image_tag=${3:-latest}
  local min_instances=${4:-0}
  local max_instances=${5:-10}
  local memory=${6:-512Mi}
  local cpu=${7:-1}
  local concurrency=${8:-80}

  echo "Deploying ${service} service..."

  gcloud run deploy los-${service} \
    --image="${IMAGE_REGISTRY}/${service}:${image_tag}" \
    --region="${REGION}" \
    --platform=managed \
    --project="${PROJECT_ID}" \
    --port="${port}" \
    --memory="${memory}" \
    --cpu="${cpu}" \
    --concurrency="${concurrency}" \
    --min-instances="${min_instances}" \
    --max-instances="${max_instances}" \
    --service-account="${SERVICE_ACCOUNT}" \
    --add-cloudsql-instances="${CLOUD_SQL_INSTANCE}" \
    --set-env-vars="NODE_ENV=production,PORT=${port}" \
    --set-secrets="DATABASE_URL=${DB_SECRET},KAFKA_BROKERS=${KAFKA_SECRET}" \
    --allow-unauthenticated \
    --timeout=300 \
    --cpu-throttling \
    --execution-environment=gen2

  echo "✓ ${service} deployed"
}

# Deploy monolith service only
echo "Deploying LOS Monolith service to Cloud Run..."
deploy_service "monolith" "3000" "latest" "1" "20" "2Gi" "2" "100"
echo "✓ Monolith service deployed!"

echo ""
echo "Deployment complete!"
echo "View services at: https://console.cloud.google.com/run?project=${PROJECT_ID}"


