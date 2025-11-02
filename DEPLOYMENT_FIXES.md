# Deployment Fixes Required

## 1. Gateway Configuration Updates

### Add Scoring Service Route
**File**: `gateway/src/server.ts`

Add after line 149 (after reporting route):
```typescript
app.use('/scoring', requireAuth, createProxyMiddleware({ 
  target: 'http://localhost:3018', 
  changeOrigin: true, 
  pathRewrite: { '^/scoring': '' } 
}));
```

### Add Analytics Service Route
Add after scoring route:
```typescript
app.use('/analytics', requireAuth, createProxyMiddleware({ 
  target: 'http://localhost:3019', 
  changeOrigin: true, 
  pathRewrite: { '^/analytics': '' } 
}));
```

---

## 2. Dockerfiles for New Services

### Scoring Service Dockerfile
**File**: `services/scoring/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3018
CMD ["node", "dist/server.js"]
```

### Analytics Service Dockerfile
**File**: `services/analytics/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3019
CMD ["node", "dist/server.js"]
```

---

## 3. Docker Compose Updates

### Add to `infra/docker-compose.prod.yml`

Add after integration-hub service (around line 493):

```yaml
  scoring:
    build:
      context: ..
      dockerfile: services/scoring/Dockerfile
    container_name: los-scoring-prod
    environment:
      NODE_ENV: production
      PORT: 3018
      SCORING_SERVICE_URL: http://scoring:3018
      DATABASE_URL: postgres://${POSTGRES_USER:-los}:${POSTGRES_PASSWORD:-los}@postgres:5432/${POSTGRES_DB:-los}
      # Third-party provider configs (optional)
      EXPERIAN_SCORING_API_URL: ${EXPERIAN_SCORING_API_URL:-}
      EXPERIAN_API_KEY: ${EXPERIAN_API_KEY:-}
      EQUIFAX_SCORING_API_URL: ${EQUIFAX_SCORING_API_URL:-}
      EQUIFAX_API_KEY: ${EQUIFAX_API_KEY:-}
      FICO_SCORING_API_URL: ${FICO_SCORING_API_URL:-}
      FICO_API_KEY: ${FICO_API_KEY:-}
    ports:
      - "${SCORING_PORT:-3018}:3018"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3018/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    networks:
      - los-network

  analytics:
    build:
      context: ..
      dockerfile: services/analytics/Dockerfile
    container_name: los-analytics-prod
    environment:
      NODE_ENV: production
      PORT: 3019
      DATABASE_URL: postgres://${POSTGRES_USER:-los}:${POSTGRES_PASSWORD:-los}@postgres:5432/${POSTGRES_DB:-los}
    ports:
      - "${ANALYTICS_PORT:-3019}:3019"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3019/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
    networks:
      - los-network
```

---

## 4. Environment Variables Template

### Update `infra/env.prod.template`

Add after INTEGRATION_HUB_PORT:
```bash
# Scoring Service
SCORING_PORT=3018
SCORING_SERVICE_URL=http://scoring:3018

# Third-Party Scoring Providers (optional)
EXPERIAN_SCORING_API_URL=https://api.experian.com/scoring
EXPERIAN_API_KEY=your_key_here
EQUIFAX_SCORING_API_URL=https://api.equifax.com/scoring
EQUIFAX_API_KEY=your_key_here
FICO_SCORING_API_URL=https://api.fico.com/scoring
FICO_API_KEY=your_key_here
CUSTOM_SCORING_API_URL=https://api.custom.com/scoring
CUSTOM_SCORING_API_KEY=your_key_here

# Analytics Service
ANALYTICS_PORT=3019
```

---

## 5. Underwriting Service Update

### Update Underwriting to use Scoring Service URL

**File**: `services/underwriting/src/scoring-integration.ts`

Update line 51:
```typescript
const scoringServiceUrl = process.env.SCORING_SERVICE_URL || 'http://localhost:3018';
```

This allows configuration via environment variable.

---

## 6. Package.json Scripts

### Add build scripts for new services

Verify that `services/scoring/package.json` and `services/analytics/package.json` have:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

---

## 7. Workspace Configuration

### Verify root package.json includes new services

The workspaces should automatically pick up new services in `services/*`, but verify:
```json
{
  "workspaces": [
    "services/*"
  ]
}
```

This should automatically include `services/scoring` and `services/analytics`.

---

## 8. Database Migrations (Optional)

If you want to store scoring history or saved reports:

### Scoring History Table
```sql
CREATE TABLE IF NOT EXISTS scoring_history (
  scoring_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  provider_used TEXT NOT NULL,
  factors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_scoring_application (application_id),
  INDEX idx_scoring_created (created_at)
);
```

### Saved Reports Table
```sql
CREATE TABLE IF NOT EXISTS saved_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  INDEX idx_reports_created_by (created_by)
);
```

---

## 9. Health Check Verification

All services should have `/health` endpoint. Verify:
- ✅ Scoring: `GET /health` returns 200 OK
- ✅ Analytics: `GET /health` returns 200 OK

---

## 10. Quick Verification Commands

After deployment, verify:

```bash
# Check service health
curl http://localhost:3018/health  # Scoring
curl http://localhost:3019/health  # Analytics

# Check gateway routing
curl -H "Authorization: Bearer <token>" http://localhost:3000/scoring/health
curl -H "Authorization: Bearer <token>" http://localhost:3000/analytics/health

# Check service providers
curl -H "Authorization: Bearer <token>" http://localhost:3000/scoring/api/scoring/providers
```

---

## Summary

1. ✅ Update Gateway routes (2 routes)
2. ✅ Create Dockerfiles (2 files)
3. ✅ Update docker-compose.prod.yml (2 services)
4. ✅ Update env.prod.template (environment variables)
5. ✅ Verify package.json scripts
6. ⚠️ Optional: Database migrations for history/reports
7. ✅ Test health endpoints

**Estimated Time**: 30-45 minutes for all fixes

