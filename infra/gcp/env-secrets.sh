#!/bin/bash

# Helper script to manage Secret Manager secrets for LOS services
# Usage: ./env-secrets.sh [command] [secret-name] [value]

set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT}
REGION=${1:-us-central1}

if [ -z "$PROJECT_ID" ]; then
  echo "Error: GOOGLE_CLOUD_PROJECT not set"
  exit 1
fi

case "${1}" in
  create)
    SECRET_NAME=$2
    SECRET_VALUE=$3
    
    if [ -z "$SECRET_NAME" ] || [ -z "$SECRET_VALUE" ]; then
      echo "Usage: $0 create <secret-name> <value>"
      exit 1
    fi
    
    echo -n "${SECRET_VALUE}" | gcloud secrets create "${SECRET_NAME}" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="${PROJECT_ID}"
    ;;
    
  update)
    SECRET_NAME=$2
    SECRET_VALUE=$3
    
    if [ -z "$SECRET_NAME" ] || [ -z "$SECRET_VALUE" ]; then
      echo "Usage: $0 update <secret-name> <value>"
      exit 1
    fi
    
    echo -n "${SECRET_VALUE}" | gcloud secrets versions add "${SECRET_NAME}" \
      --data-file=- \
      --project="${PROJECT_ID}"
    ;;
    
  get)
    SECRET_NAME=$2
    
    if [ -z "$SECRET_NAME" ]; then
      echo "Usage: $0 get <secret-name>"
      exit 1
    fi
    
    gcloud secrets versions access latest \
      --secret="${SECRET_NAME}" \
      --project="${PROJECT_ID}"
    ;;
    
  list)
    gcloud secrets list --project="${PROJECT_ID}"
    ;;
    
  *)
    echo "Usage: $0 {create|update|get|list} [args...]"
    echo ""
    echo "Commands:"
    echo "  create <name> <value>  - Create a new secret"
    echo "  update <name> <value>  - Add new version to existing secret"
    echo "  get <name>             - Retrieve secret value"
    echo "  list                   - List all secrets"
    exit 1
    ;;
esac


