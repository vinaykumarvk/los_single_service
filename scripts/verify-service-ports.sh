#!/bin/bash

# Verify that all services are running on the ports the gateway expects
# This prevents port mismatches that cause timeouts

set -e

echo "🔍 Service Port Verification"
echo "============================"
echo ""

ERRORS=0

# Check Gateway expects vs actual service ports
check_port() {
  local service_name=$1
  local expected_port=$2
  local service_url="http://localhost:${expected_port}/health"
  
  if curl -s "$service_url" > /dev/null 2>&1; then
    echo "✅ $service_name: Running on port $expected_port (matches gateway)"
  else
    echo "❌ $service_name: NOT running on port $expected_port (gateway expects this port)"
    ERRORS=$((ERRORS + 1))
  fi
}

# Services that gateway routes to
check_port "Auth Service" "3016"
check_port "Application Service" "3001"
check_port "KYC Service" "3003"
check_port "Document Service" "3004"
check_port "Masters Service" "3005"
check_port "Underwriting Service" "3006"
check_port "Sanction Service" "3007"
check_port "Payments Service" "3008"
check_port "Disbursement Service" "3009"
check_port "Reporting Service" "3015"

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ All services are running on correct ports!"
  exit 0
else
  echo "❌ $ERRORS service(s) are not on expected ports"
  echo ""
  echo "Fix: Run ./scripts/start-all-services.sh to ensure correct ports"
  exit 1
fi

