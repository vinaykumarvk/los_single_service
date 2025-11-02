# Loan Origination System (LoS)

A comprehensive, enterprise-grade Loan Origination System built with microservices architecture, featuring relationship manager dashboards, hierarchical reporting, and advanced analytics.

## 🏗️ Architecture

- **Microservices**: 15+ independent services
- **Event-Driven**: Kafka-based event streaming with Outbox Pattern
- **API Gateway**: Centralized routing with authentication
- **Database**: PostgreSQL (database per service)
- **Frontend**: React.js with TypeScript
- **Authentication**: Keycloak SSO integration

## 🚀 Key Features

### Core Functionality
- ✅ Application lifecycle management (Draft → Submitted → Approved/Rejected)
- ✅ KYC (Know Your Customer) verification
- ✅ Document management with OCR
- ✅ Underwriting with rule engine
- ✅ Sanction screening
- ✅ Payment processing
- ✅ Disbursement management

### Advanced Features
- ✅ **Hierarchical Dashboards**: RM, SRM, and Regional Head dashboards with drill-down
- ✅ **Dynamic Aggregation**: Runtime computation based on reporting hierarchy
- ✅ **AI/ML Scoring**: Flexible credit scoring (internal ML or third-party integration)
- ✅ **Advanced Analytics**: Custom reports, predictive analytics, portfolio risk analysis
- ✅ **Mobile Optimization**: Progressive Web App (PWA) with offline support
- ✅ **Role-Based Access Control**: Persona-based access (RM, Admin, Operations)
- ✅ **Data Entitlements**: RMs can only access assigned customers

## 📋 Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 14+
- Docker & Docker Compose
- Keycloak (for authentication)

## 🛠️ Installation

### Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Kafka, Keycloak)
docker-compose -f infra/docker-compose.prod.yml up -d

# Run database migrations
pnpm run migrate

# Start all services
./scripts/start-all-services.sh
```

### Local Development

See [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md) for detailed setup instructions.

## 📁 Project Structure

```
├── services/          # Microservices
│   ├── auth/         # Authentication service
│   ├── application/   # Application management
│   ├── kyc/          # KYC verification
│   ├── document/     # Document management
│   ├── underwriting/  # Underwriting decisions
│   ├── scoring/      # AI/ML scoring
│   ├── analytics/    # Advanced analytics
│   └── ...
├── gateway/          # API Gateway
├── web/             # React frontend
├── shared/          # Shared libraries
└── infra/           # Infrastructure configs
```

## 🔧 Configuration

### Environment Variables

Copy `infra/env.prod.template` to `.env` and configure:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/los
KAFKA_BROKERS=localhost:9092
KEYCLOAK_URL=http://localhost:8080
# ... other service URLs
```

## 🧪 Testing

### Run All Tests
```bash
pnpm test
```

### Functional Tests
```bash
./scripts/comprehensive-functional-tests.sh
```

### Edge Case Tests
```bash
./scripts/edge-case-tests.sh
```

## 📊 API Documentation

### Main Endpoints

- **Applications**: `GET /api/applications`, `POST /api/applications`
- **RM Dashboard**: `GET /api/dashboard/rm/:userId`
- **SRM Dashboard**: `GET /api/dashboard/srm/:srmId?includeReportees=true`
- **Regional Head**: `GET /api/dashboard/regional-head/:headId?includeReportees=true`
- **Hierarchy Drill-down**: `GET /api/hierarchy/reportees/:managerId`

See individual service READMEs for detailed API documentation.

## 🔐 Security Features

- ✅ JWT-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Data entitlements (RM access control)
- ✅ PII masking and encryption
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation (Zod schemas)
- ✅ UUID format validation

## 📈 Production Deployment

### Using Docker Compose

```bash
docker-compose -f infra/docker-compose.prod.yml up -d
```

### Kubernetes (Optional)

Helm charts available in `infra/helm/`

## 🧹 Maintenance

### Cleanup Script
```bash
./CLEANUP_SCRIPT.sh
```

### Database Migrations
```bash
pnpm run migrate
```

## 📚 Documentation

- [Local Development Guide](./LOCAL_DEVELOPMENT_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_READY.md)
- [API Documentation](./API_DOCUMENTATION.md) (if available)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Submit a pull request

## 📝 License

[Your License Here]

## 🆘 Support

For issues and questions, please open an issue in the GitHub repository.

---

**Built with**: TypeScript, Node.js, React, PostgreSQL, Kafka, Docker
