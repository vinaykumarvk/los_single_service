# Testing Next Steps

## ✅ Completed (Current Status)

### Unit Tests (75+ tests passing)
- ✅ Shared Libraries: 17 tests (encryption, masking)
- ✅ Underwriting Service: 25 tests (calculations, decision engine)
- ✅ Payments Service: 13 tests (fee calculations)
- ✅ Integration Hub: 20 tests (adapter mocks)

**Total: 75+ unit tests passing across 4 services**

## 🎯 Next Steps (Priority Order)

### 1. Integration Tests for API Endpoints (Current Priority)

**Goal**: Test HTTP endpoints with real database interactions

**Services to Test**:
1. **Application Service** (Priority 1)
   - POST /api/applications (create)
   - GET /api/applications/:id (retrieve)
   - GET /api/applications (list with filters)
   - PATCH /api/applications/:id (update draft)
   - POST /api/applications/:id/submit
   - GET /api/applications/:id/timeline

2. **Customer KYC Service** (Priority 2)
   - POST /api/applicants (create/consent)
   - GET /api/applicants/:id (retrieve with PII masking)
   - PUT /api/applicants/:id (upsert)

3. **Document Service** (Priority 3)
   - POST /api/applications/:id/documents
   - GET /api/applications/:id/documents
   - GET /api/applications/:id/checklist
   - GET /api/applications/:id/documents/compliance

4. **Underwriting Service** (Priority 4)
   - POST /api/applications/:id/underwrite
   - GET /api/applications/:id/decision
   - POST /api/applications/:id/override/request
   - POST /api/applications/:id/override/:id/approve

**Setup Requirements**:
- Export Express app from server.ts (refactor for testability)
- Use test database (separate from dev/prod)
- Database setup/teardown in test lifecycle hooks
- Use Supertest for HTTP testing
- Mock external services (Keycloak, Kafka)

**Test Structure**:
```typescript
// Example: services/application/src/__tests__/api.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server'; // Need to export app

describe('Application API', () => {
  beforeAll(async () => {
    // Setup test database
  });
  
  afterAll(async () => {
    // Cleanup test data
  });
  
  it('POST /api/applications', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ applicantId, channel, productCode, ... })
      .expect(201);
    
    expect(res.body).toHaveProperty('applicationId');
  });
});
```

### 2. Service Refactoring for Testability

**Required Changes**:
1. Export Express app from each service's server.ts:
   ```typescript
   // Current: app.listen() in server.ts
   // Change to: export { app }; then listen in index.ts or keep in server.ts
   ```

2. Create test database setup utilities:
   ```typescript
   // shared/libs/src/__tests__/db-setup.ts
   export async function setupTestDb() { ... }
   export async function teardownTestDb() { ... }
   ```

3. Mock Keycloak authentication in tests:
   ```typescript
   // Mock JWT verification middleware
   vi.mock('@los/shared-libs/auth', () => ({
     authenticate: (req, res, next) => {
       req.user = { id: 'test-user', roles: ['maker'] };
       next();
     }
   }));
   ```

### 3. E2E Tests with Playwright

**Goal**: Test complete user workflows in browser

**Setup**:
```bash
pnpm add -D @playwright/test
npx playwright install
```

**Test Scenarios**:
1. Complete loan application flow
   - Login (Keycloak)
   - Create application
   - Fill KYC details
   - Upload documents
   - Submit application
   - View timeline

2. Maker-Checker override workflow
   - Maker creates override request
   - Checker reviews and approves/rejects

3. Document verification flow
   - Upload required documents
   - Verify compliance checklist
   - View verification status

### 4. Performance & Load Tests

**Tools**: k6, Artillery, or JMeter

**Scenarios**:
- Concurrent application creation
- Document upload performance
- Database query performance
- Rate limiting verification

### 5. Security Tests

**Areas to Test**:
- SQL injection prevention
- XSS prevention
- Authentication bypass attempts
- PII masking based on roles
- Field-level encryption

## Recommended Implementation Order

### Week 1: Integration Tests (Foundation)
1. ✅ Refactor services to export Express app
2. ✅ Create test database setup utilities
3. ✅ Write integration tests for Application Service
4. ✅ Write integration tests for Customer KYC Service

### Week 2: Expand Integration Tests
1. ✅ Document Service integration tests
2. ✅ Underwriting Service integration tests
3. ✅ Test event publishing/consumption

### Week 3: E2E Tests
1. ✅ Playwright setup
2. ✅ Keycloak authentication flow
3. ✅ Complete application workflow test

### Week 4: Advanced Testing
1. ✅ Performance tests
2. ✅ Security tests
3. ✅ Coverage report analysis

## Testing Best Practices

1. **Isolation**: Each test should be independent
2. **Fixtures**: Use test data factories
3. **Cleanup**: Always clean up test data
4. **Mocking**: Mock external dependencies (Keycloak, Kafka, S3)
5. **Parallel Execution**: Use Vitest's parallel test execution
6. **CI/CD Integration**: Run tests in CI pipeline

## Coverage Goals

| Service | Unit Tests | Integration Tests | E2E Tests | Target Coverage |
|---------|-----------|-------------------|-----------|-----------------|
| Shared Libraries | ✅ 17 | N/A | N/A | 90% |
| Application | ⏳ 0 | ⏳ 0 | ⏳ 0 | 80% |
| Customer KYC | ⏳ 0 | ⏳ 0 | ⏳ 0 | 80% |
| Document | ⏳ 0 | ⏳ 0 | ⏳ 0 | 70% |
| Underwriting | ✅ 25 | ⏳ 0 | ⏳ 0 | 80% |
| Payments | ✅ 13 | ⏳ 0 | ⏳ 0 | 80% |
| Integration Hub | ✅ 20 | ⏳ 0 | ⏳ 0 | 70% |
| **Overall** | **75+** | **0** | **0** | **80%** |

## Quick Start: Integration Tests

1. **Export app from server.ts**:
   ```typescript
   // At end of server.ts
   export { app };
   // Keep app.listen() for dev server
   ```

2. **Create integration test**:
   ```typescript
   import { app } from '../server';
   import request from 'supertest';
   
   describe('API Tests', () => {
     it('should create application', async () => {
       const res = await request(app)
         .post('/api/applications')
         .send({ ... })
         .expect(201);
     });
   });
   ```

3. **Run tests**:
   ```bash
   cd services/application
   DATABASE_URL=postgres://test:test@localhost:5432/test_los pnpm test
   ```

