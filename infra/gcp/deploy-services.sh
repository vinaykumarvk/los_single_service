#!/bin/bash

# Cloud Run Deployment Script for LOS Services
# Usage: ./deploy-services.sh [service-name] [region] [project-id]

set -e

SERVICE_NAME=${1:-all}
REGION=${2:-us-central1}
PROJECT_ID=${3:-$GOOGLE_CLOUD_PROJECT}
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

# Deploy all services or a specific one
if [ "$SERVICE_NAME" = "all" ]; then
  echo "Deploying all services to Cloud Run..."
  
  # Gateway (higher resources, always-on)
  deploy_service "gateway" "3000" "latest" "1" "20" "1Gi" "2" "100"
  
  # Core services
  deploy_service "application" "3001" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "customer-kyc" "3002" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "document" "3003" "latest" "0" "10" "1Gi" "2" "40"  # More memory for file handling
  deploy_service "masters" "3004" "latest" "0" "5" "256Mi" "1" "100"
  
  # Business logic services
  deploy_service "underwriting" "3006" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "sanction-offer" "3007" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "payments" "3008" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "disbursement" "3009" "latest" "0" "10" "512Mi" "1" "80"
  
  # System services
  deploy_service "orchestrator" "3010" "latest" "0" "5" "512Mi" "1" "80"
  deploy_service "notifications" "3011" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "audit" "3012" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "bureau" "3013" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "verification" "3014" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "reporting" "3015" "latest" "0" "10" "512Mi" "1" "80"
  deploy_service "integration-hub" "3020" "latest" "0" "10" "512Mi" "1" "80"
  
  echo "✓ All services deployed!"
else
  # Deploy specific service (you may need to adjust resources per service)
  case $SERVICE_NAME in
    gateway)
      deploy_service "gateway" "3000" "latest" "1" "20" "1Gi" "2" "100"
      ;;
    document)
      deploy_service "document" "3003" "latest" "0" "10" "1Gi" "2" "40"
      ;;
    *)
      deploy_service "$SERVICE_NAME" "3001" "latest" "0" "10" "512Mi" "1" "80"
      ;;
  esac
fi

echo ""
echo "Deployment complete!"
echo "View services at: https://console.cloud.google.com/run?project=${PROJECT_ID}"


