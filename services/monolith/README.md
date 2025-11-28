# LOS Monolith Service

A consolidated monolithic service that combines all LOS microservices into a single deployable unit for simplified deployment and easier management.

## 🎯 Purpose

This monolith consolidates the following services:
- **Application Service** - Loan application management
- **Auth Service** - Authentication and user management
- **Customer KYC Service** - Customer data and KYC workflows
- **Document Service** - Document upload and management
- **Masters Service** - Product catalog and master data

All functionality is available through a single API endpoint on port **3000**.

## 🚀 Quick Start

### Local Development

```bash
# 1. Start infrastructure (PostgreSQL, Redpanda, MinIO, Keycloak)
cd infra
docker compose -f docker-compose.monolith.yml up -d
cd ..

# 2. Run migrations
cd services/monolith
pnpm migrate
cd ../..

# 3. Start monolith service
cd services/monolith
pnpm dev
```

Or use the convenience script:
```bash
./start-monolith.sh
```

### Production Deployment

#### Using Docker Compose

```bash
cd infra
docker compose -f docker-compose.monolith.yml up -d
```

#### Using Docker

```bash
# Build image
docker build -f services/monolith/Dockerfile -t los-monolith:latest .

# Run container
docker run -d \
  --name los-monolith \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://los:los@postgres:5432/los \
  -e KAFKA_BROKERS=redpanda:9092 \
  -e MINIO_ENDPOINT=minio \
  -e MINIO_PORT=9000 \
  -e MINIO_ACCESS_KEY=minio \
  -e MINIO_SECRET_KEY=minio123 \
  los-monolith:latest
```

## 📋 API Endpoints

All endpoints are available at `http://localhost:3000`:

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application
- `POST /api/applications/:id/submit` - Submit application

### Applicants/KYC
- `GET /api/applicants/:id` - Get applicant details
- `PUT /api/applicants/:id` - Update applicant data

### Documents
- `POST /api/applications/:id/documents` - Upload document
- `GET /api/applications/:id/documents` - List documents
- `DELETE /api/applications/:id/documents/:docId` - Delete document

### Masters
- `GET /api/masters/products` - List products
- `GET /api/masters/products/:code` - Get product details
- `GET /api/masters/calendar/is-business-day` - Check business day
- `GET /api/masters/calendar/holidays` - List holidays

### Health & Metrics
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://los:los@localhost:5432/los` |
| | **Supports:** Local PostgreSQL, Supabase, Cloud SQL, RDS, Azure | |
| `KAFKA_BROKERS` | Kafka/Redpanda brokers | `localhost:19092` |
| `MINIO_ENDPOINT` | MinIO endpoint | `localhost` |
| `MINIO_PORT` | MinIO port | `9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minio` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minio123` |
| `MINIO_BUCKET` | MinIO bucket name | `los-docs` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |
| `JWT_SECRET` | JWT signing secret | (required in production) |
| `JWT_REFRESH_SECRET` | JWT refresh secret | (required in production) |

## 📦 Database Migrations

Run migrations before starting the service:

```bash
cd services/monolith
pnpm migrate
```

This will run all migrations from:
- Application service migrations
- Customer KYC migrations
- Auth service migrations
- Masters service migrations

### Using Supabase

Supabase is fully supported! See [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) for details.

Quick setup:
```bash
# Set Supabase connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?sslmode=require"

# Run migrations
cd services/monolith
pnpm migrate
```

Or use the helper script:
```bash
./switch-to-supabase.sh
```

## 🏗️ Architecture

### Benefits of Monolith

1. **Simplified Deployment** - Single service to deploy and manage
2. **Easier Development** - No need to coordinate multiple services
3. **Reduced Complexity** - No service discovery or inter-service communication
4. **Better Performance** - No network latency between services
5. **Easier Debugging** - All code in one place

### When to Use Monolith

- ✅ Initial development and MVP
- ✅ Small to medium teams
- ✅ Simple deployment requirements
- ✅ Lower traffic volumes
- ✅ Faster time to market

### When to Consider Microservices

- ⚠️ Large, distributed teams
- ⚠️ Need for independent scaling
- ⚠️ Different technology stacks per service
- ⚠️ Very high traffic requiring horizontal scaling
- ⚠️ Complex deployment pipelines

## 🔄 Migration Path

You can easily migrate from monolith to microservices later:

1. **Extract Services** - Split monolith routes into separate services
2. **Update Gateway** - Point gateway to new service endpoints
3. **Deploy Gradually** - Deploy services one at a time
4. **Monitor** - Ensure functionality is preserved

The codebase is structured to make this transition straightforward.

## 📝 Notes

- The monolith uses the same database schema as microservices
- All API contracts remain the same
- Frontend code works without changes
- Can be deployed alongside microservices for gradual migration

## 🐛 Troubleshooting

### Service won't start
- Check Docker is running
- Verify database is accessible
- Check port 3000 is not in use

### Database connection errors
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database credentials

### Migration errors
- Ensure database exists
- Check user has CREATE permissions
- Review migration logs

## 📚 Related Documentation

- [Main README](../../README.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [API Documentation](./openapi.yaml) (if available)

