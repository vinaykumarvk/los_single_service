# E2E Tests with Playwright

This directory contains end-to-end tests for the Loan Origination System.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Install Playwright browsers:
```bash
pnpm test:install
```

## Running Tests

### All Tests
```bash
pnpm test
```

### UI Mode (Interactive)
```bash
pnpm test:ui
```

### Headed Mode (See browser)
```bash
pnpm test:headed
```

### Debug Mode
```bash
pnpm test:debug
```

### View Test Report
```bash
pnpm test:report
```

## Test Structure

- `tests/auth.spec.ts` - Authentication and login flow
- `tests/application-flow.spec.ts` - Complete loan application workflow
- `tests/document-upload.spec.ts` - Document upload and verification
- `tests/underwriting.spec.ts` - Underwriting decision workflow

## Configuration

- Base URL: Set via `E2E_BASE_URL` environment variable (default: http://localhost:5000)
- Browsers: Chromium, Firefox, WebKit (Safari)
- Screenshots/Videos: Captured on test failures

## Prerequisites

1. Frontend dev server running on port 5000 (or configured port)
2. Backend services running
3. Test database configured
4. Keycloak test instance (or mocked)

## Environment Variables

```bash
E2E_BASE_URL=http://localhost:5000
KEYCLOAK_URL=http://localhost:8080
TEST_USERNAME=test-user
TEST_PASSWORD=test-password
```

## Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/my-page');
  await expect(page.locator('h1')).toHaveText('My Page');
});
```

## Best Practices

1. Use data-testid attributes for stable selectors
2. Wait for network idle before assertions
3. Use page objects for complex flows
4. Keep tests independent and isolated
5. Clean up test data after tests

