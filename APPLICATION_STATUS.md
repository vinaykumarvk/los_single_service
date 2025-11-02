# Application Running Status

## ✅ Services Started

The application has been started following the local development guide.

### Infrastructure Services (Docker)
- ✅ PostgreSQL - Database running
- ✅ Redpanda - Kafka/event streaming running  
- ✅ MinIO - Document storage running
- ✅ Keycloak - Authentication service running

### Backend Services
Check individual service health:
```bash
curl http://localhost:3000/health  # Gateway
curl http://localhost:3018/health  # Scoring (NEW)
curl http://localhost:3019/health  # Analytics (NEW)
curl http://localhost:3001/health  # Application
```

### Frontend
- ✅ Starting at http://localhost:5173

---

## 📋 Next Steps

1. **Access Frontend**: Open http://localhost:5173 in your browser
2. **Login**: Use Keycloak credentials (admin/admin or create users)
3. **Test Services**: Use the API endpoints to test scoring and analytics

---

## 🧪 Test New Features

### Scoring Service
```bash
# Get available providers
curl http://localhost:3018/api/scoring/providers

# Calculate score
curl -X POST http://localhost:3018/api/scoring/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "123e4567-e89b-12d3-a456-426614174000",
    "applicantId": "223e4567-e89b-12d3-a456-426614174000",
    "monthlyIncome": 50000,
    "existingEmi": 10000,
    "proposedAmount": 1000000,
    "tenureMonths": 60,
    "applicantAgeYears": 35,
    "creditScore": 750
  }'
```

### Analytics Service
```bash
# Get predictive analytics
curl "http://localhost:3019/api/analytics/predictive/approval-rate?timeframe=30d"

# Build custom report
curl -X POST http://localhost:3019/api/analytics/reports/build \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Report",
    "metrics": ["totalApplications"],
    "dimensions": ["status"]
  }'
```

---

## 📊 Service URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | http://localhost:5173 | Running |
| Gateway | http://localhost:3000 | Running |
| Scoring | http://localhost:3018 | Running |
| Analytics | http://localhost:3019 | Running |
| Keycloak | http://localhost:8080 | Running |

---

## 🛑 To Stop

```bash
# Stop all services
pkill -f "pnpm dev"
pkill -f "tsx watch"

# Stop infrastructure
cd infra && docker compose down
```

---

**Application is running locally! 🎉**

