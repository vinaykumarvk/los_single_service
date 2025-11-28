# Monolith Deployment Guide

This guide explains how to deploy LOS as a single monolithic service instead of multiple microservices.

## 🎯 Overview

The monolith consolidates all services into one application:
- **Single Service** - All functionality in one process
- **Single Port** - All APIs on port 3000
- **Simplified Deployment** - One container/service to manage
- **Same Functionality** - All features preserved

## 🚀 Quick Start

### Option 1: Using Startup Script (Recommended)

```bash
# Start everything (infrastructure + monolith)
./start-monolith.sh
```

This will:
1. Start Docker infrastructure (PostgreSQL, Redpanda, MinIO, Keycloak)
2. Run database migrations
3. Start the monolith service on port 3000

### Option 2: Manual Steps

```bash
# 1. Start infrastructure
cd infra
docker compose -f docker-compose.monolith.yml up -d
cd ..

# 2. Run migrations
cd services/monolith
pnpm migrate
cd ../..

# 3. Start service
cd services/monolith
pnpm dev
```

## 📦 Docker Deployment

### Build Image

```bash
docker build -f services/monolith/Dockerfile -t los-monolith:latest .
```

### Run Container

```bash
docker run -d \
  --name los-monolith \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://los:los@host.docker.internal:5432/los \
  -e KAFKA_BROKERS=host.docker.internal:19092 \
  -e MINIO_ENDPOINT=host.docker.internal \
  -e MINIO_PORT=9000 \
  los-monolith:latest
```

### Using Docker Compose

```bash
cd infra
docker compose -f docker-compose.monolith.yml up -d
```

## ☁️ Cloud Deployment

### Single Cloud Run Service

Deploy to Google Cloud Run:

```bash
# Build and push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT/los-monolith

# Deploy to Cloud Run
gcloud run deploy los-monolith \
  --image gcr.io/YOUR_PROJECT/los-monolith \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars="DATABASE_URL=postgres://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE" \
  --add-cloudsql-instances=PROJECT:REGION:INSTANCE
```

### Single EC2/VM Instance

1. **Provision VM** (e.g., AWS EC2, Azure VM, GCP Compute Engine)
2. **Install Docker** on the VM
3. **Deploy using Docker Compose**:
   ```bash
   # Copy files to VM
   scp -r . user@vm-ip:/opt/los
   
   # SSH into VM
   ssh user@vm-ip
   
   # Start services
   cd /opt/los/infra
   docker compose -f docker-compose.monolith.yml up -d
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Database
DATABASE_URL=postgres://los:los@localhost:5432/los

# Event Streaming
KAFKA_BROKERS=localhost:19092

# Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=los-docs

# Security
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# CORS
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

## 📊 Comparison: Monolith vs Microservices

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Deployment** | Single service | Multiple services |
| **Complexity** | Lower | Higher |
| **Scaling** | Vertical | Horizontal per service |
| **Development** | Easier | More coordination needed |
| **Debugging** | Simpler | More complex |
| **Resource Usage** | Single process | Multiple processes |
| **Startup Time** | Faster | Slower (multiple services) |
| **Cost** | Lower (single instance) | Higher (multiple instances) |

## 🔄 Migration Strategy

### From Microservices to Monolith

If you're currently using microservices and want to consolidate:

1. **Stop microservices**:
   ```bash
   ./stop-local.sh
   ```

2. **Start monolith**:
   ```bash
   ./start-monolith.sh
   ```

3. **Update frontend** (if using gateway):
   - Point API calls directly to `http://localhost:3000`
   - Or update gateway to proxy to monolith

### From Monolith to Microservices

When you're ready to scale:

1. **Extract services** from monolith codebase
2. **Deploy services** individually
3. **Update gateway** to route to new services
4. **Gradually migrate** traffic

## ✅ Benefits

1. **Simpler Deployment** - One service, one container
2. **Easier Development** - All code in one place
3. **Faster Startup** - Single process initialization
4. **Lower Resource Usage** - Shared memory and connections
5. **Easier Debugging** - Single codebase to trace
6. **Cost Effective** - Single instance deployment

## ⚠️ Considerations

1. **Scaling** - Scales as a single unit (vertical scaling)
2. **Deployment** - Entire service redeploys for any change
3. **Technology** - All features must use same tech stack
4. **Team Coordination** - Multiple teams work on same codebase

## 📝 Next Steps

1. **Test locally** using `./start-monolith.sh`
2. **Deploy to staging** using Docker Compose
3. **Deploy to production** using your preferred cloud platform
4. **Monitor** service health and performance
5. **Scale** as needed (vertical scaling or multiple instances)

## 🆘 Support

For issues or questions:
- Check [services/monolith/README.md](services/monolith/README.md)
- Review logs in `logs/monolith.log`
- Check service health: `curl http://localhost:3000/health`

