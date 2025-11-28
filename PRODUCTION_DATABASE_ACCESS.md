# Production Database Access Guide

This guide explains how to access and manage the database in production environments.

## 🎯 Overview

In production, you'll use a **managed database service** rather than running PostgreSQL locally. This provides:
- ✅ High availability and automatic backups
- ✅ Scalability and performance optimization
- ✅ Security and compliance features
- ✅ Managed maintenance and updates

## ☁️ Cloud Database Options

### Option 1: Google Cloud SQL (Recommended for GCP)

#### Setup
```bash
# Create Cloud SQL instance
gcloud sql instances create los-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create los --instance=los-db

# Create user
gcloud sql users create los \
  --instance=los-db \
  --password=YOUR_SECURE_PASSWORD
```

#### Connection String
```bash
# For Cloud Run / App Engine
DATABASE_URL=postgres://los:password@/los?host=/cloudsql/PROJECT_ID:REGION:los-db

# For external access (with Cloud SQL Proxy)
DATABASE_URL=postgres://los:password@127.0.0.1:5432/los
```

#### Access Methods

**1. Cloud SQL Proxy (Recommended for local access)**
```bash
# Install Cloud SQL Proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Connect
./cloud-sql-proxy PROJECT_ID:REGION:los-db

# Now connect via localhost:5432
psql -h 127.0.0.1 -U los -d los
```

**2. Direct Connection (with authorized networks)**
```bash
# Add your IP to authorized networks
gcloud sql instances patch los-db \
  --authorized-networks=YOUR_IP_ADDRESS/32

# Connect directly
psql -h CLOUD_SQL_IP -U los -d los
```

**3. gcloud CLI**
```bash
gcloud sql connect los-db --user=los --database=los
```

### Option 2: AWS RDS PostgreSQL

#### Setup
```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier los-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username los \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name default
```

#### Connection String
```bash
DATABASE_URL=postgres://los:password@los-db.xxxxx.us-east-1.rds.amazonaws.com:5432/los
```

#### Access Methods

**1. Direct Connection**
```bash
psql -h los-db.xxxxx.us-east-1.rds.amazonaws.com -U los -d los
```

**2. AWS Systems Manager Session Manager** (for EC2)
```bash
# Connect to EC2 instance, then:
psql -h localhost -U los -d los
```

### Option 3: Azure Database for PostgreSQL

#### Setup
```bash
# Using Azure CLI
az postgres flexible-server create \
  --resource-group los-rg \
  --name los-db \
  --location eastus \
  --admin-user los \
  --admin-password YOUR_SECURE_PASSWORD \
  --sku-name Standard_B1ms \
  --version 15 \
  --storage-size 32
```

#### Connection String
```bash
DATABASE_URL=postgres://los:password@los-db.postgres.database.azure.com:5432/los
```

## 🔐 Security Best Practices

### 1. Use Connection Pooling

```typescript
// In your application
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Use SSL/TLS Connections

```bash
# Add SSL requirement to connection string
DATABASE_URL=postgres://los:password@host:5432/los?sslmode=require
```

### 3. Use Secret Management

**Google Cloud Secret Manager:**
```bash
# Store database URL
echo -n "postgres://los:password@host:5432/los" | \
  gcloud secrets create database-url --data-file=-

# Access in application
DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url)
```

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name los/database-url \
  --secret-string "postgres://los:password@host:5432/los"
```

### 4. Use Read Replicas for Reporting

```bash
# Create read replica
gcloud sql instances create los-db-replica \
  --master-instance-name=los-db \
  --tier=db-f1-micro \
  --region=us-central1

# Use for read-only queries
READ_DATABASE_URL=postgres://los:password@los-db-replica:5432/los
```

## 📊 Database Management

### Running Migrations in Production

#### Option 1: From CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: |
    cd services/monolith
    pnpm migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

#### Option 2: Manual Migration
```bash
# Connect via Cloud SQL Proxy
./cloud-sql-proxy PROJECT_ID:REGION:los-db

# In another terminal
export DATABASE_URL="postgres://los:password@127.0.0.1:5432/los"
cd services/monolith
pnpm migrate
```

#### Option 3: Using Cloud Build
```yaml
# cloudbuild.yaml
steps:
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        cd services/monolith
        pnpm install
        pnpm migrate
    env:
      - 'DATABASE_URL=$$DATABASE_URL'
```

### Database Backup & Restore

#### Cloud SQL Backups
```bash
# Automatic backups (enabled by default)
gcloud sql backups list --instance=los-db

# Manual backup
gcloud sql backups create --instance=los-db

# Restore from backup
gcloud sql backups restore BACKUP_ID --backup-instance=los-db
```

#### Manual Backup
```bash
# Export database
pg_dump -h HOST -U los -d los -F c -f los_backup.dump

# Restore database
pg_restore -h HOST -U los -d los los_backup.dump
```

### Monitoring & Performance

#### Cloud SQL Insights
```bash
# View performance insights
gcloud sql instances describe los-db

# Enable query insights
gcloud sql instances patch los-db \
  --database-flags=log_statement=all,log_min_duration_statement=1000
```

#### Connection Monitoring
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check connection details
SELECT pid, usename, application_name, client_addr, state 
FROM pg_stat_activity 
WHERE datname = 'los';
```

## 🔄 Local Development with Production Database

### Using Cloud SQL Proxy

```bash
# 1. Start Cloud SQL Proxy
./cloud-sql-proxy PROJECT_ID:REGION:los-db

# 2. Connect via localhost
export DATABASE_URL="postgres://los:password@127.0.0.1:5432/los"

# 3. Run your application
cd services/monolith
pnpm dev
```

### Using Port Forwarding (SSH Tunnel)

```bash
# Create SSH tunnel
ssh -L 5432:localhost:5432 user@production-server

# Connect via localhost
export DATABASE_URL="postgres://los:password@127.0.0.1:5432/los"
```

## 📝 Environment Variables

### Production Configuration

```bash
# Database
DATABASE_URL=postgres://los:password@host:5432/los?sslmode=require

# Connection Pooling
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Read Replica (optional)
READ_DATABASE_URL=postgres://los:password@replica-host:5432/los?sslmode=require
```

## 🚨 Troubleshooting

### Connection Issues

**Error: "connection refused"**
- Check firewall rules allow your IP
- Verify database is running
- Check connection string is correct

**Error: "password authentication failed"**
- Verify username and password
- Check user exists in database
- Verify user has proper permissions

**Error: "database does not exist"**
- Create database: `CREATE DATABASE los;`
- Grant permissions: `GRANT ALL ON DATABASE los TO los;`

### Performance Issues

**Slow Queries**
- Enable query logging
- Use EXPLAIN ANALYZE
- Add indexes for frequently queried columns
- Consider read replicas for reporting

**Connection Pool Exhaustion**
- Increase pool size
- Check for connection leaks
- Use connection pooling (PgBouncer)

## 📚 Additional Resources

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs/postgres)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [Azure Database Documentation](https://docs.microsoft.com/azure/postgresql/)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/admin.html)

