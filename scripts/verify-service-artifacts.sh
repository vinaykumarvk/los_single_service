#!/bin/bash

# Verifies that all critical microservices have build artifacts before deployment

set -euo pipefail

REQUIRED_SERVICES=(
  "services/underwriting"
  "services/sanction-offer"
  "services/payments"
  "services/disbursement"
  "services/orchestrator"
  "services/notifications"
  "services/audit"
  "services/bureau"
  "services/verification"
  "services/scoring"
  "services/analytics"
)

missing=()

for service in "${REQUIRED_SERVICES[@]}"; do
  if [ ! -d "$service" ]; then
    missing+=("$service (directory missing)")
    continue
  fi

  if [ ! -f "$service/package.json" ] && [ ! -f "$service/Dockerfile" ]; then
    missing+=("$service (package.json or Dockerfile missing)")
    continue
  fi

  if [ ! -d "$service/src" ] && [ ! -d "$service/dist" ]; then
    missing+=("$service (no src/ or dist/ directory found)")
  fi
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "❌ Missing build artifacts for the following required services:"
  for entry in "${missing[@]}"; do
    echo "   - $entry"
  done
  echo ""
  echo "Please implement these services or remove them from REQUIRED_SERVICES if they are intentionally stubbed."
  exit 1
fi

echo "✅ All required services have build artifacts."
