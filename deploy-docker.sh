#!/bin/bash
# Quick deployment script for Docker

set -e

echo "🚀 Starting LOS Docker Deployment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ ERROR: Docker is not running!"
  echo "   Please start Docker Desktop and try again"
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Start infrastructure
echo "📦 Starting infrastructure services..."
docker compose -f infra/docker-compose.monolith.yml up -d postgres redpanda minio keycloak

echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if postgres is ready
echo "🔍 Checking PostgreSQL..."
until docker exec los-postgres pg_isready -U los > /dev/null 2>&1; do
  echo "   Waiting for postgres..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"
echo ""

# Run migrations
if [ -f "scripts/run-migrations-docker.sh" ]; then
  echo "📝 Running database migrations..."
  ./scripts/run-migrations-docker.sh
else
  echo "⚠️  Migration script not found, skipping migrations"
fi
echo ""

# Build and start monolith
echo "🏗️  Building monolith (this may take a few minutes)..."
docker compose -f infra/docker-compose.monolith.yml build monolith

echo "🚀 Starting monolith..."
docker compose -f infra/docker-compose.monolith.yml up -d monolith

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Services:"
docker ps --filter "name=los-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 Access the application at:"
echo "   Frontend + API: http://localhost:3000"
echo "   Keycloak: http://localhost:8080"
echo "   MinIO Console: http://localhost:9001 (minio/minio123)"
echo ""
echo "📋 View logs:"
echo "   docker logs los-monolith -f"
echo ""
