LOS Monorepo (Microservices)

Structure:
- gateway/ (API Gateway & BFF)
- services/ (domain microservices)
- shared/ (schemas, libs)
- web/ (React UI)
- infra/ (Helm/K8s, CI, Docker Compose)
- reporting/ (read models, exports)

Use pnpm workspaces. Run `pnpm -w install` after cloning.

Quick start (local dev):

1. Start infrastructure:
   ```bash
   cd infra
   docker compose up -d
   ```

2. Setup databases (create schemas and seed):
   ```bash
   # From project root, run schema migrations per service
   psql -U los -d los -f services/masters/schema.sql
   psql -U los -d los -f services/application/schema.sql
   psql -U los -d los -f services/customer-kyc/schema.sql
   psql -U los -d los -f services/document/schema.sql
   psql -U los -d los -f services/orchestrator/schema.sql
   psql -U los -d los -f infra/seed.sql
   ```

3. Install dependencies:
   ```bash
   pnpm -w install
   ```

4. Start services (in separate terminals, or use Makefile):
   ```bash
   # Gateway (port 3000)
   cd gateway && pnpm dev
   
   # Core services
   cd services/application && pnpm dev
   cd services/customer-kyc && pnpm dev
   cd services/document && pnpm dev
   cd services/masters && pnpm dev
   cd services/underwriting && pnpm dev
   cd services/sanction-offer && pnpm dev
   cd services/payments && pnpm dev
   cd services/disbursement && pnpm dev
   cd services/orchestrator && pnpm dev
   cd services/integration-hub && pnpm dev
   cd services/bureau && pnpm dev
   cd services/verification && pnpm dev
   cd services/notifications && pnpm dev
   cd services/audit && pnpm dev
   cd reporting && pnpm dev
   ```
   
   Or use Makefile shortcuts:
   ```bash
   make install    # Install dependencies
   make infra-up   # Start Docker services
   make db-setup   # Run migrations and seed
   ```

5. Keycloak setup (optional):
   - Access http://localhost:8080 (admin/admin)
   - Import realm from `infra/keycloak-realm.json` (or create manually)
   - Create users: maker1, checker1, admin1 (passwords match usernames)

Environment variables (per service):
- `DATABASE_URL=postgres://los:los@localhost:5432/los`
- `KAFKA_BROKERS=localhost:19092` (for orchestrator)
- `KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/los`
- `KEYCLOAK_JWKS_URI=http://localhost:8080/realms/los/protocol/openid-connect/certs`
- `KEYCLOAK_CLIENT_ID=los-ui`
