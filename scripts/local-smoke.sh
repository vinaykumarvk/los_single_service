#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.local-smoke-logs"
mkdir -p "$LOG_DIR"

echo "[1/8] Starting local infra (Docker Compose)"
if [ "${SKIP_INFRA:-0}" = "1" ]; then
  echo "SKIP_INFRA=1 set; skipping docker compose up"
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker is not installed or not on PATH (unset SKIP_INFRA or install Docker)" >&2
    exit 1
  fi
  pushd "$ROOT_DIR/infra" >/dev/null
  docker compose up -d
  popd >/dev/null
fi

echo "[2/8] Installing deps and running DB setup"
pushd "$ROOT_DIR" >/dev/null
export DATABASE_URL=${DATABASE_URL:-"postgres://los:los@localhost:5432/los"}
if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm is not installed. Install Node 20+ and run: corepack enable && corepack prepare pnpm@9.0.0 --activate" >&2
  exit 1
fi
pnpm -w install
make db-setup
popd >/dev/null

echo "[3/8] Ensuring MinIO bucket exists (los-docs)"
if [ "${SKIP_INFRA:-0}" = "1" ]; then
  echo "SKIP_INFRA=1 set; skipping MinIO bucket creation via docker. Ensure bucket 'los-docs' exists manually."
else
  docker run --rm \
    -e MC_HOST_local=http://minio:minio123@host.docker.internal:9000 \
    minio/mc mb --ignore-existing local/los-docs >/dev/null 2>&1 || true
fi

echo "[4/8] Exporting env for Document uploads"
export MINIO_ENDPOINT=${MINIO_ENDPOINT:-localhost}
export MINIO_PORT=${MINIO_PORT:-9000}
export MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minio}
export MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minio123}
export MINIO_REGION=${MINIO_REGION:-us-east-1}
export MINIO_USE_SSL=${MINIO_USE_SSL:-false}
export MINIO_BUCKET=${MINIO_BUCKET:-los-docs}

healthcheck() {
  local url=$1
  local name=$2
  local tries=60
  until curl -sf "$url" >/dev/null 2>&1 || [ $tries -eq 0 ]; do
    printf "."; sleep 1; tries=$((tries-1))
  done
  echo
  if [ $tries -eq 0 ]; then
    echo "ERROR: $name not responding at $url" >&2
    exit 1
  fi
}

echo "[5/8] Waiting for core services (ensure you started them in separate terminals)"
healthcheck http://localhost:3001/health application
healthcheck http://localhost:3002/health customer-kyc
healthcheck http://localhost:3003/health document
healthcheck http://localhost:3006/health underwriting
healthcheck http://localhost:3007/health sanction-offer
healthcheck http://localhost:3008/health payments
healthcheck http://localhost:3009/health disbursement

echo "[6/8] Running smoke flow"
APP_LOG="$LOG_DIR/app-create.json"
APP_JSON='{"applicantId":"3b1d23ce-1111-4444-8888-aaaaaaaaaaaa","channel":"Online","productCode":"HOME_LOAN_V1","requestedAmount":800000,"requestedTenureMonths":120}'
curl -s -X POST http://localhost:3001/api/applications -H 'Content-Type: application/json' -d "$APP_JSON" | tee "$APP_LOG" >/dev/null
APPLICATION_ID=$(sed -E 's/.*"applicationId":"([^"]+)".*/\1/' "$APP_LOG")
if [[ -z "$APPLICATION_ID" || "$APPLICATION_ID" == "$APP_LOG" ]]; then
  echo "ERROR: Failed to parse applicationId" >&2; exit 1
fi
echo "applicationId=$APPLICATION_ID"

curl -s -X PUT http://localhost:3002/api/applicants/3b1d23ce-1111-4444-8888-aaaaaaaaaaaa \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Asha","lastName":"R","mobile":"9123456780","email":"asha@example.com","pan":"ABCDE1234F","aadhaarMasked":"123456789012"}' >/dev/null

curl -s -X POST http://localhost:3002/api/applicants/3b1d23ce-1111-4444-8888-aaaaaaaaaaaa/consent \
  -H 'Content-Type: application/json' -d '{"purpose":"KYC"}' >/dev/null

curl -s -X POST http://localhost:3002/api/kyc/$APPLICATION_ID/start >/dev/null

DOC_LOG="$LOG_DIR/doc-upload.json"
SAMPLE_DOC="$ROOT_DIR/infra/seed.sql" # any small file present in repo; replace with a PDF if desired
curl -s -X POST http://localhost:3003/api/applications/$APPLICATION_ID/documents \
  -F docType=PAN -F file=@"$SAMPLE_DOC" | tee "$DOC_LOG" >/dev/null
DOC_ID=$(sed -E 's/.*"docId":"([^"]+)".*/\1/' "$DOC_LOG")
if [[ -z "$DOC_ID" || "$DOC_ID" == "$DOC_LOG" ]]; then
  echo "ERROR: Failed to parse docId" >&2; exit 1
fi
echo "docId=$DOC_ID"

curl -s -X PATCH http://localhost:3003/api/documents/$DOC_ID/verify -H 'Content-Type: application/json' -d '{"remarks":"OK"}' >/dev/null

UW_LOG="$LOG_DIR/uw.json"
UW_BODY='{"monthlyIncome":120000,"existingEmi":5000,"proposedAmount":800000,"tenureMonths":120,"annualRate":12,"propertyValue":1100000,"applicantAgeYears":32,"product":{"maxFOIR":0.5,"maxLTV":0.8,"maxAgeAtMaturity":70}}'
curl -s -X POST http://localhost:3006/api/applications/$APPLICATION_ID/underwrite -H 'Content-Type: application/json' -d "$UW_BODY" | tee "$UW_LOG" >/dev/null
echo "Underwriting: $(cat "$UW_LOG")"

SANCTION_LOG="$LOG_DIR/sanction.json"
curl -s -X POST http://localhost:3007/api/applications/$APPLICATION_ID/sanction \
  -H 'Content-Type: application/json' \
  -d '{"sanctionedAmount":750000,"tenureMonths":120,"rateAnnual":11.25}' | tee "$SANCTION_LOG" >/dev/null
SANCTION_ID=$(sed -E 's/.*"sanctionId":"([^"]+)".*/\1/' "$SANCTION_LOG")
if [[ -z "$SANCTION_ID" || "$SANCTION_ID" == "$SANCTION_LOG" ]]; then
  echo "ERROR: Failed to parse sanctionId" >&2; exit 1
fi
echo "sanctionId=$SANCTION_ID"

curl -s -X POST http://localhost:3007/api/applications/$APPLICATION_ID/offer/accept -H 'Content-Type: application/json' -d '{"sanctionId":"'$SANCTION_ID'"}' >/dev/null

curl -s -X POST http://localhost:3008/api/applications/$APPLICATION_ID/fees/calculate -H 'Content-Type: application/json' -d '{"amount":750000,"config":{"type":"percent","percent":1.0,"min":2500}}' >/dev/null
curl -s -X POST http://localhost:3008/api/applications/$APPLICATION_ID/fees/capture -H 'Content-Type: application/json' -d '{"fee":7500,"currency":"INR"}' >/dev/null

curl -s -X POST http://localhost:3009/api/applications/$APPLICATION_ID/disburse \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: abc-123' \
  -d '{"amount":750000,"beneficiaryAccount":"001122334455","ifsc":"HDFC0001234"}' >/dev/null

echo "[7/8] Checking metrics"
curl -s http://localhost:3001/metrics | head -n 5 || true

echo "[8/8] Done. Logs in $LOG_DIR"
echo "Application: $APPLICATION_ID"
echo "Document: $DOC_ID"
echo "Sanction:  $SANCTION_ID"


