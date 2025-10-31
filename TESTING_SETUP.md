# Testing Framework Setup

## Overview

Setting up comprehensive testing framework to achieve >80% code coverage:
- **Unit Tests**: Vitest for fast, isolated component testing
- **Integration Tests**: Test service interactions with test databases
- **E2E Tests**: Playwright for end-to-end workflow testing
- **Contract Tests**: JSON Schema validation for events

## Testing Stack

### Unit Tests
- **Framework**: Vitest (fast, Jest-compatible, native TypeScript)
- **Coverage**: Vitest's built-in coverage tool
- **Target**: >80% code coverage for all services

### Integration Tests
- **Framework**: Vitest + Supertest (for API testing)
- **Test Containers**: Testcontainers for Postgres/Kafka
- **Database**: Separate test database or in-memory

### E2E Tests
- **Framework**: Playwright
- **Scope**: Full user workflows
- **Environment**: Test Keycloak, test services

## Implementation Plan

### Phase 1: Unit Tests (Priority)
1. Shared libraries (utilities, encryption, masking)
2. Core service logic (application, KYC, underwriting)
3. Adapter logic (mock adapters)

### Phase 2: Integration Tests
1. API endpoint tests (POST/GET/PATCH)
2. Service interaction tests
3. Database transaction tests
4. Event publishing tests

### Phase 3: E2E Tests
1. Complete loan application flow
2. Document upload and verification
3. Underwriting decision workflow
4. Payment and disbursement flow

## Coverage Goals

- **Shared Libraries**: >90%
- **Core Services**: >80%
- **Adapters**: >70%
- **Overall**: >80%

## Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```


