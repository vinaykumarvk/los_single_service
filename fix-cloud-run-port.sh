#!/bin/bash

# Fix Cloud Run service port configuration
# Run this after the Docker image is built and pushed

PROJECT_ID="wealth-report"
REGION="europe-west1"
SERVICE_NAME="los-single-service"
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/los_single_service/los-single-service:latest"

echo "Updating Cloud Run service with correct port configuration..."

gcloud run services update ${SERVICE_NAME} \
  --project=${PROJECT_ID} \
  --region=${REGION} \
  --image=${IMAGE_URL} \
  --port=3000 \
  --memory=2Gi \
  --cpu=2 \
  --max-instances=10 \
  --min-instances=0 \
  --timeout=300 \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production \
  --update-secrets=DATABASE_URL=database-url:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest

echo "✅ Cloud Run service updated successfully"
echo "Service URL: https://los-single-service-<hash>-ew.a.run.app"

