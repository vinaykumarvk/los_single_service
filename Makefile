.PHONY: help install infra-up infra-down db-setup dev services

help:
	@echo "LOS Makefile commands:"
	@echo "  make install     - Install all dependencies"
	@echo "  make infra-up   - Start Docker Compose services"
	@echo "  make infra-down - Stop Docker Compose services"
	@echo "  make db-setup   - Run database migrations and seed"
	@echo "  make dev        - Start all services in development mode"

install:
	pnpm -w install

infra-up:
	cd infra && docker compose up -d
	@echo "Waiting for services to be ready..."
	sleep 5

infra-down:
	cd infra && docker compose down

db-setup:
	@echo "Setting up databases..."
	# Using app-level migration scripts; set DATABASE_URL env before running
	cd services/application && pnpm migrate || true
	cd services/customer-kyc && pnpm migrate || true
	cd services/document && pnpm migrate || true
	cd services/sanction-offer && pnpm migrate || true
	cd services/payments && pnpm migrate || true
	cd services/disbursement && pnpm migrate || true
	# Minimal direct SQL for others (or add migrations similarly)
	psql -U los -d los -h localhost -f services/masters/schema.sql || true
	psql -U los -d los -h localhost -f services/orchestrator/schema.sql || true
	psql -U los -d los -h localhost -f services/audit/schema.sql || true
	psql -U los -d los -h localhost -f services/bureau/schema.sql || true
	psql -U los -d los -h localhost -f services/verification/schema.sql || true
	psql -U los -d los -h localhost -f infra/seed.sql || true
	@echo "Database setup complete!"

dev:
	@echo "Starting all services..."
	@echo "Run each service in a separate terminal or use a process manager like concurrently"
	@echo "Example: pnpm -w --parallel run dev"

