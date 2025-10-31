# LOS (Loan Origination System) Monorepo

## Overview

This is a comprehensive microservices-based Loan Origination System built with TypeScript and Node.js. The project uses a monorepo structure managed by pnpm workspaces.

### Purpose
- Full-featured loan origination platform with 15+ microservices
- Event-driven architecture with Kafka/outbox pattern
- React-based web UI for loan application management
- API Gateway with Keycloak authentication

### Current State
- **Frontend**: React + Vite application running on port 5000
- **Backend**: 15 microservices (gateway, application, KYC, document, underwriting, payments, etc.)
- **Database**: PostgreSQL (Replit managed) - configured and ready
- **Status**: Frontend configured and running in Replit environment

## Recent Changes

**October 31, 2025 - Replit Environment Setup**
- Installed Node.js 20 and pnpm 9.0.0
- Installed all workspace dependencies (518+ packages)
- Configured Vite for Replit proxy environment:
  - Updated to port 5000 with 0.0.0.0 binding
  - Added HMR configuration for WebSocket support
  - Installed @vitejs/plugin-react
- Set up PostgreSQL database with Replit integration
- Updated .gitignore for Node.js/TypeScript best practices
- Created web workflow for frontend development
- Configured deployment settings for autoscale

## Project Architecture

### Directory Structure
```
.
├── gateway/              # API Gateway & BFF (port 3000)
├── services/             # Microservices directory
│   ├── application/      # Application service (port 3001)
│   ├── customer-kyc/     # KYC service (port 3002)
│   ├── document/         # Document service (port 3003)
│   ├── underwriting/     # Underwriting service (port 3006)
│   ├── sanction-offer/   # Sanction service (port 3007)
│   ├── payments/         # Payments service (port 3008)
│   ├── disbursement/     # Disbursement service (port 3009)
│   ├── orchestrator/     # Saga orchestrator (port 3010)
│   ├── bureau/           # Bureau service (port 3013)
│   ├── verification/     # Verification service (port 3014)
│   ├── reporting/        # Reporting service (port 3015)
│   └── ... (and more)
├── shared/               # Shared libraries and event schemas
├── web/                  # React frontend (port 5000)
├── infra/                # Infrastructure (Docker, Keycloak, seed data)
└── reporting/            # Reporting service
```

### Technology Stack
- **Frontend**: React 18, Vite 5, TailwindCSS, React Router
- **Backend**: Node.js 20, Express, TypeScript
- **Database**: PostgreSQL (Replit managed)
- **Package Manager**: pnpm 9.0.0 (workspaces)
- **Authentication**: Keycloak (OAuth/OIDC) - configured separately
- **Events**: Kafka/Redpanda (optional, via KAFKA_BROKERS env)

## Development

### Running in Replit

The web frontend is configured to run automatically via the workflow:
- Port: 5000 (required for Replit webview)
- Host: 0.0.0.0 (allows proxy access)
- HMR: Configured for WSS on port 443

To start development:
1. The web workflow runs automatically (`cd web && pnpm dev`)
2. Frontend available at the Replit webview URL

### Local Development (Outside Replit)

For full local development with all services:

1. **Start infrastructure**:
   ```bash
   cd infra
   docker compose up -d
   ```

2. **Setup databases**:
   ```bash
   make db-setup
   # Or manually run schema migrations
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Start all services**:
   ```bash
   # Start individual services in separate terminals
   cd gateway && pnpm dev         # Port 3000
   cd services/application && pnpm dev   # Port 3001
   # ... (see README.md for full list)
   ```

### Environment Variables

The following are available in Replit:
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - DB credentials

For full local setup, each service needs:
- `DATABASE_URL=postgres://los:los@localhost:5432/los`
- `KAFKA_BROKERS=localhost:19092` (for orchestrator)
- `KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/los`
- `KEYCLOAK_CLIENT_ID=los-ui`

## User Preferences

No specific user preferences recorded yet.

## Key Features

### Implemented Services (15/15 Complete)
1. **Gateway** - API routing, JWT auth, PII masking
2. **Application** - Loan application CRUD
3. **Customer KYC** - KYC workflows, consent
4. **Document** - Upload, verification
5. **Masters** - Product catalog, seed data
6. **Underwriting** - FOIR, LTV, decision engine
7. **Sanction & Offer** - EMI calc, offer acceptance
8. **Payments** - Fee calculation, payment capture
9. **Disbursement** - CBS integration, webhooks
10. **Integration Hub** - Mock integrations (PAN, eKYC, Bureau)
11. **Orchestrator** - Saga state machine
12. **Notifications** - Email/SMS stubs
13. **Audit** - Append-only audit log
14. **Bureau** - Credit bureau integration
15. **Verification** - PAN/Aadhaar/manual verification

### Shared Libraries
- Outbox pattern for reliable event publishing
- PostgreSQL connection pooling
- JSON logging with correlation IDs
- PII masking utilities
- Webhook signature verification

## Known Limitations

### In Replit Environment
- Only frontend is running (microservices require additional setup)
- Keycloak authentication not configured (would need external setup)
- Kafka/Redpanda not available (uses log-based fallback)
- MinIO object storage not configured

### General
- See STATUS.md for detailed implementation status
- Production hardening pending (monitoring, encryption, rate limiting)
- Real integrations are mocks (bureau, eKYC, payment gateway)
- No automated tests yet

## Next Steps

For Replit users who want to extend this:
1. Set up Keycloak instance for authentication
2. Configure environment variables for services
3. Start backend services individually as needed
4. Implement real integration adapters
5. Add comprehensive testing

For full deployment:
- See STATUS.md for recommended priority phases
- Review original README.md for complete setup instructions
- Consider Kubernetes deployment via Helm charts (planned)

## Resources

- [Main README](README.md) - Original setup guide
- [STATUS.md](STATUS.md) - Detailed implementation status
- [infra/README.md](infra/README.md) - Infrastructure setup
- Service READMEs - Each service has its own README with API details
