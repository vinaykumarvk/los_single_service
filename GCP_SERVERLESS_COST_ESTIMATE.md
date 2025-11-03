# Google Cloud Serverless Deployment - Monthly Cost Estimate

**Deployment Model**: Fully Serverless (Cloud Run)  
**Date**: November 2024  
**Pricing Region**: us-central1 (Iowa)

---

## 📊 Service Inventory

### Microservices (15 services)
1. **gateway** - API Gateway (port 3000)
2. **application** - Application management (port 3001)
3. **auth** - Authentication (port 3002)
4. **kyc** - KYC verification (port 3003)
5. **document** - Document management with OCR (port 3004)
6. **masters** - Master data (port 3005)
7. **underwriting** - Underwriting decisions (port 3006)
8. **sanction** - Sanction screening (port 3007)
9. **payments** - Payment processing (port 3008)
10. **disbursement** - Disbursement management (port 3009)
11. **reporting** - Reporting service (port 3015)
12. **scoring** - AI/ML scoring (port 3018)
13. **analytics** - Advanced analytics (port 3019)
14. **frontend** - React web app (static hosting on Cloud Run or Cloud Storage)

**Plus Infrastructure**:
- Cloud SQL PostgreSQL
- Cloud Pub/Sub (event streaming)
- Cloud Storage (documents)
- Cloud Build (CI/CD)
- Secret Manager
- Cloud Logging/Monitoring

---

## 💰 Monthly Cost Breakdown

### Scenario 1: Low Traffic (Development/Small Scale)
**Assumptions**:
- 100 active users/month
- 5,000 API requests/day (average ~167 requests/hour)
- 500 document uploads/month
- 200 underwriting decisions/month

---

#### 1. **Cloud Run Services** (15 services)

**Pricing**: $0.40 per million requests + $0.0000025 per vCPU-second + $0.0000025 per GiB-second

**Service Sizing**:
| Service | vCPU | Memory | Min Instances | Requests/Month | vCPU-hrs/Month | Memory-GiB-hrs/Month |
|---------|------|--------|---------------|----------------|----------------|---------------------|
| gateway | 1 | 512 MB | 0 | 150,000 | 150 | 75 |
| application | 1 | 1 GB | 0 | 120,000 | 120 | 120 |
| auth | 1 | 512 MB | 0 | 50,000 | 50 | 25 |
| kyc | 1 | 1 GB | 0 | 30,000 | 30 | 30 |
| document | 2 | 2 GB | 0 | 5,000 | 10 | 10 |
| masters | 1 | 512 MB | 0 | 20,000 | 20 | 10 |
| underwriting | 2 | 2 GB | 0 | 6,000 | 12 | 12 |
| sanction | 1 | 1 GB | 0 | 4,000 | 4 | 4 |
| payments | 1 | 1 GB | 0 | 3,000 | 3 | 3 |
| disbursement | 1 | 1 GB | 0 | 2,000 | 2 | 2 |
| reporting | 2 | 2 GB | 0 | 10,000 | 20 | 20 |
| scoring | 2 | 2 GB | 0 | 3,000 | 6 | 6 |
| analytics | 2 | 2 GB | 0 | 5,000 | 10 | 10 |
| **TOTALS** | - | - | - | **408,000** | **437** | **327** |

**Cloud Run Costs**:
- Request costs: 408,000 requests × $0.40/1M = **$0.16/month**
- vCPU costs: 437 vCPU-hours × $0.0000025 × 3600 = **$3.93/month**
- Memory costs: 327 GiB-hours × $0.0000025 × 3600 = **$2.94/month**
- **Subtotal: $7.03/month**

---

#### 2. **Cloud SQL for PostgreSQL**

**Instance**: `db-custom-2-4096` (2 vCPU, 4 GB RAM)  
**Storage**: 100 GB SSD  
**Backups**: Automated daily backups (7-day retention)

**Pricing**:
- Compute: 2 vCPU × 730 hours × $0.0970/vCPU-hour = **$141.62/month**
- Storage: 100 GB × $0.17/GB = **$17.00/month**
- Backups: 100 GB × 7 days × $0.08/GB = **$0.56/month**
- **Subtotal: $159.18/month**

---

#### 3. **Cloud Pub/Sub** (Event Streaming)

**Topics**: 10 topics (application, kyc, document, underwriting, etc.)  
**Messages**: 50,000 messages/month  
**Subscription**: 15 subscriptions

**Pricing**:
- Message storage: 50,000 × 0.5 KB average = 25 MB (free tier covers)
- Message delivery: 50,000 × $0.40/1M = **$0.02/month**
- **Subtotal: $0.02/month**

---

#### 4. **Cloud Storage** (Document Storage)

**Buckets**: 1 bucket  
**Storage**: 50 GB average  
**Operations**: 500 writes, 2,000 reads/month  
**Egress**: 10 GB/month (document downloads)

**Pricing**:
- Storage: 50 GB × $0.020/GB = **$1.00/month**
- Class A operations: 500 × $0.05/10K = **$0.003/month**
- Class B operations: 2,000 × $0.004/10K = **$0.001/month**
- Egress: 10 GB × $0.12/GB = **$1.20/month**
- **Subtotal: $2.20/month**

---

#### 5. **Cloud Build** (CI/CD)

**Builds**: 10 builds/month  
**Build time**: 5 minutes average × 15 services = 75 minutes/month

**Pricing**:
- Build minutes: 75 minutes × $0.003/minute = **$0.23/month**
- **Subtotal: $0.23/month**

---

#### 6. **Secret Manager**

**Secrets**: 20 secrets (DB credentials, API keys, JWT secrets)  
**Access operations**: 100,000/month (service startups)

**Pricing**:
- Storage: 20 × $0.06 = **$1.20/month**
- Access operations: 100,000 × $0.03/10K = **$0.30/month**
- **Subtotal: $1.50/month**

---

#### 7. **Cloud Logging**

**Log volume**: ~5 GB/month (from 15 services)  
**Log ingestion**: 5 GB/month

**Pricing**:
- First 50 GB free tier
- **Subtotal: $0.00/month**

---

#### 8. **Cloud Monitoring**

**Metrics**: Standard metrics included  
**Custom metrics**: Minimal usage

**Pricing**:
- First 150 MB free
- **Subtotal: $0.00/month**

---

#### 9. **Artifact Registry** (Docker Images)

**Storage**: 15 GB (15 services × 1 GB average)  
**Egress**: Minimal (internal to GCP)

**Pricing**:
- Storage: 15 GB × $0.10/GB = **$1.50/month**
- **Subtotal: $1.50/month**

---

#### 10. **Cloud Load Balancer** (Optional - for custom domain)

**HTTP(S) Load Balancing**: 
- **Subtotal: $18.00/month** (base charge)

---

#### 11. **Cloud DNS** (Optional - for custom domain)

**Zones**: 1 zone  
**Queries**: 10,000/month

**Pricing**:
- Zones: 1 × $0.20 = **$0.20/month**
- Queries: 10,000 × $0.40/1M = **$0.004/month**
- **Subtotal: $0.20/month**

---

### 📊 **TOTAL MONTHLY COST - Low Traffic**

| Service | Monthly Cost |
|---------|--------------|
| Cloud Run (15 services) | $7.03 |
| Cloud SQL PostgreSQL | $159.18 |
| Cloud Pub/Sub | $0.02 |
| Cloud Storage | $2.20 |
| Cloud Build | $0.23 |
| Secret Manager | $1.50 |
| Cloud Logging | $0.00 |
| Cloud Monitoring | $0.00 |
| Artifact Registry | $1.50 |
| Load Balancer (optional) | $18.00 |
| Cloud DNS (optional) | $0.20 |
| **TOTAL** | **$190.86/month** |
| **TOTAL (without LB/DNS)** | **$171.66/month** |

---

### Scenario 2: Medium Traffic (Production - Moderate Scale)
**Assumptions**:
- 1,000 active users/month
- 100,000 API requests/day (average ~4,167 requests/hour)
- 5,000 document uploads/month
- 2,000 underwriting decisions/month

---

#### 1. **Cloud Run Services** (15 services)

**Updated Sizing**:
| Service | vCPU | Memory | Min Instances | Requests/Month | vCPU-hrs/Month | Memory-GiB-hrs/Month |
|---------|------|--------|---------------|----------------|----------------|---------------------|
| gateway | 1 | 512 MB | 1 | 3,000,000 | 2,000 | 1,000 |
| application | 1 | 1 GB | 1 | 2,500,000 | 1,800 | 1,800 |
| auth | 1 | 512 MB | 1 | 500,000 | 400 | 200 |
| kyc | 1 | 1 GB | 0 | 300,000 | 300 | 300 |
| document | 2 | 2 GB | 0 | 50,000 | 100 | 100 |
| masters | 1 | 512 MB | 1 | 200,000 | 200 | 100 |
| underwriting | 2 | 2 GB | 0 | 60,000 | 120 | 120 |
| sanction | 1 | 1 GB | 0 | 40,000 | 40 | 40 |
| payments | 1 | 1 GB | 0 | 30,000 | 30 | 30 |
| disbursement | 1 | 1 GB | 0 | 20,000 | 20 | 20 |
| reporting | 2 | 2 GB | 0 | 100,000 | 200 | 200 |
| scoring | 2 | 2 GB | 0 | 30,000 | 60 | 60 |
| analytics | 2 | 2 GB | 0 | 50,000 | 100 | 100 |
| **TOTALS** | - | - | - | **6,880,000** | **5,370** | **4,070** |

**Cloud Run Costs**:
- Request costs: 6,880,000 requests × $0.40/1M = **$2.75/month**
- vCPU costs: 5,370 vCPU-hours × $0.0000025 × 3600 = **$48.33/month**
- Memory costs: 4,070 GiB-hours × $0.0000025 × 3600 = **$36.63/month**
- **Subtotal: $87.71/month**

---

#### 2. **Cloud SQL for PostgreSQL**

**Instance**: `db-custom-4-8192` (4 vCPU, 8 GB RAM)  
**Storage**: 200 GB SSD  
**Backups**: Automated daily backups (7-day retention)

**Pricing**:
- Compute: 4 vCPU × 730 hours × $0.0970/vCPU-hour = **$283.24/month**
- Storage: 200 GB × $0.17/GB = **$34.00/month**
- Backups: 200 GB × 7 days × $0.08/GB = **$1.12/month**
- **Subtotal: $318.36/month**

---

#### 3. **Cloud Pub/Sub**

**Messages**: 500,000 messages/month

**Pricing**:
- Message delivery: 500,000 × $0.40/1M = **$0.20/month**
- **Subtotal: $0.20/month**

---

#### 4. **Cloud Storage**

**Storage**: 200 GB average  
**Operations**: 5,000 writes, 20,000 reads/month  
**Egress**: 50 GB/month

**Pricing**:
- Storage: 200 GB × $0.020/GB = **$4.00/month**
- Class A operations: 5,000 × $0.05/10K = **$0.03/month**
- Class B operations: 20,000 × $0.004/10K = **$0.01/month**
- Egress: 50 GB × $0.12/GB = **$6.00/month**
- **Subtotal: $10.04/month**

---

#### 5. **Cloud Build**

**Builds**: 50 builds/month  
**Build time**: 5 minutes average × 15 services = 375 minutes/month

**Pricing**:
- Build minutes: 375 minutes × $0.003/minute = **$1.13/month**
- **Subtotal: $1.13/month**

---

#### 6. **Secret Manager**

**Access operations**: 500,000/month

**Pricing**:
- Storage: 20 × $0.06 = **$1.20/month**
- Access operations: 500,000 × $0.03/10K = **$1.50/month**
- **Subtotal: $2.70/month**

---

#### 7. **Cloud Logging**

**Log volume**: ~50 GB/month

**Pricing**:
- First 50 GB free tier
- **Subtotal: $0.00/month**

---

#### 8. **Cloud Monitoring**

**Metrics**: Standard metrics included

**Pricing**:
- First 150 MB free
- **Subtotal: $0.00/month**

---

#### 9. **Artifact Registry**

**Storage**: 30 GB (updated images + tags)

**Pricing**:
- Storage: 30 GB × $0.10/GB = **$3.00/month**
- **Subtotal: $3.00/month**

---

#### 10. **Cloud Load Balancer**

**Subtotal: $18.00/month**

---

#### 11. **Cloud DNS**

**Queries**: 100,000/month

**Pricing**:
- Zones: 1 × $0.20 = **$0.20/month**
- Queries: 100,000 × $0.40/1M = **$0.04/month**
- **Subtotal: $0.24/month**

---

### 📊 **TOTAL MONTHLY COST - Medium Traffic**

| Service | Monthly Cost |
|---------|--------------|
| Cloud Run (15 services) | $87.71 |
| Cloud SQL PostgreSQL | $318.36 |
| Cloud Pub/Sub | $0.20 |
| Cloud Storage | $10.04 |
| Cloud Build | $1.13 |
| Secret Manager | $2.70 |
| Cloud Logging | $0.00 |
| Cloud Monitoring | $0.00 |
| Artifact Registry | $3.00 |
| Load Balancer (optional) | $18.00 |
| Cloud DNS (optional) | $0.24 |
| **TOTAL** | **$441.38/month** |
| **TOTAL (without LB/DNS)** | **$423.14/month** |

---

## 🎯 Cost Optimization Tips

### 1. **Cloud SQL Optimization**
- Start with `db-f1-micro` for development ($7/month) → Upgrade to `db-custom-2-4096` for production
- Use read replicas for reporting/analytics (separate compute from writes)
- Enable query insights and optimize slow queries

### 2. **Cloud Run Optimization**
- Set appropriate `min-instances=0` for non-critical services (saves idle costs)
- Use `max-instances` to prevent runaway scaling
- Optimize cold starts (keep essential services warm with min-instances=1)
- Use Cloud CDN for static assets (frontend)

### 3. **Storage Optimization**
- Use Cloud Storage Lifecycle policies to move old documents to Coldline/Nearline
- Compress documents before upload
- Use Cloud CDN for document downloads (reduces egress costs)

### 4. **Monitoring & Logging**
- Set up log exclusions for verbose logs
- Use Cloud Monitoring alerting to catch cost anomalies early

---

## 📋 Provisioning Checklist

### Must Provision:
1. ✅ **Cloud SQL** - PostgreSQL instance (primary cost driver)
2. ✅ **Cloud Run** - 15 service deployments
3. ✅ **Cloud Storage** - Document storage bucket
4. ✅ **Cloud Pub/Sub** - Topics and subscriptions
5. ✅ **Secret Manager** - Secrets for credentials
6. ✅ **Artifact Registry** - Docker image repository
7. ✅ **Cloud Build** - CI/CD pipeline

### Optional (for production):
8. ⚪ **Cloud Load Balancer** - Custom domain + SSL
9. ⚪ **Cloud DNS** - Domain management
10. ⚪ **Cloud CDN** - Static asset acceleration
11. ⚪ **Cloud Armor** - DDoS protection
12. ⚪ **VPC Connector** - Private Cloud SQL access

---

## 💡 Recommendations

### Development Environment
- **Estimated Cost**: ~$172/month (without LB/DNS)
- Use smaller Cloud SQL instance (`db-f1-micro` or `db-custom-1-3840`)
- Set all Cloud Run services to `min-instances=0`
- Use Cloud Run direct URLs (no Load Balancer)

### Production Environment
- **Estimated Cost**: ~$423/month (without LB/DNS)
- Use production-grade Cloud SQL (`db-custom-4-8192` or higher)
- Keep critical services warm (`min-instances=1` for gateway, application, auth)
- Use Load Balancer + Cloud DNS for custom domain
- Enable Cloud Armor for security

### Scale-Up Scenarios
- **High Traffic (10,000 users)**: ~$800-1,200/month
- **Enterprise Scale (100,000 users)**: ~$3,000-5,000/month

---

## 📝 Notes

- All prices are for **us-central1** region (cheapest)
- Prices may vary by region (+10-30%)
- Cloud SQL is the largest cost component (60-75% of total)
- Cloud Run scales to zero when idle (significant savings)
- Free tier credits may apply ($300 credit for new accounts)

---

**Last Updated**: November 2024  
**Pricing Source**: [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)

