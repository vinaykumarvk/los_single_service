# Quick Start: Full Stack in 3 Commands

## 🚀 Fastest Way to Start

### Option 1: Automated Script (Recommended)

```bash
# Make scripts executable (first time only)
chmod +x scripts/*.sh

# Start everything
./scripts/start-full-stack.sh

# In a new terminal, start frontend
cd web && pnpm dev
```

### Option 2: Manual Steps

```bash
# 1. Install dependencies
pnpm -w install

# 2. Start infrastructure
cd infra && docker compose up -d && cd ..

# 3. Wait 30 seconds for infrastructure to initialize

# 4. Build services
pnpm -w build

# 5. Start all services
pnpm -w --parallel run dev

# 6. In new terminal: Start frontend
cd web && pnpm dev
```

---

## 📋 What Gets Started

### Infrastructure (Docker)
- ✅ PostgreSQL (port 5432)
- ✅ Redpanda/Kafka (port 19092)
- ✅ MinIO (ports 9000, 9001)
- ✅ Keycloak (port 8080)

### Backend Services (17 services)
- ✅ Gateway (3000)
- ✅ Application (3001)
- ✅ Customer-KYC (3002)
- ✅ Document (3003)
- ✅ Masters (3004)
- ✅ Underwriting (3006)
- ✅ Sanction-Offer (3007)
- ✅ Payments (3008)
- ✅ Disbursement (3009)
- ✅ Orchestrator (3010)
- ✅ Notifications (3011)
- ✅ Audit (3012)
- ✅ Bureau (3013)
- ✅ Verification (3014)
- ✅ Reporting (3015)
- ✅ Auth (3016)
- ✅ Leads (3017)
- ✅ **Scoring (3018)** ← New!
- ✅ **Analytics (3019)** ← New!
- ✅ Integration Hub (3020)

### Frontend
- ✅ Web UI (port 5173)

---

## 🔍 Verify Everything is Running

```bash
# Check infrastructure
docker compose -f infra/docker-compose.yml ps

# Check backend services
curl http://localhost:3000/health  # Gateway
curl http://localhost:3018/health  # Scoring
curl http://localhost:3019/health  # Analytics

# Open in browser
open http://localhost:5173  # Frontend
```

---

## 🛑 Stop Everything

```bash
# Stop services
./scripts/stop-full-stack.sh

# Or manually:
pkill -f "pnpm dev"
cd infra && docker compose down
```

---

## ⚡ Troubleshooting Quick Fixes

### Port already in use
```bash
lsof -i :3000  # Find process
kill -9 <PID>  # Kill it
```

### Docker not running
```bash
# Start Docker Desktop, then:
cd infra && docker compose up -d
```

### Database connection errors
```bash
# Restart PostgreSQL
docker compose -f infra/docker-compose.yml restart postgres
sleep 10
```

### Services won't build
```bash
# Clean and rebuild
rm -rf node_modules */node_modules services/*/node_modules
pnpm -w install
pnpm -w build
```

---

## 📚 Detailed Guide

For step-by-step instructions with explanations, see:
- **`LOCAL_DEVELOPMENT_GUIDE.md`** - Comprehensive guide

---

**That's it! Your full stack is running locally! 🎉**

