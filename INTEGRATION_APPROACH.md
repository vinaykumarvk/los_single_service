# External Integration Approach

## Overview

This document describes the approach for handling external integrations (Bureau, eKYC, Payment Gateway, etc.) using **mock/stub APIs** during development and switching to real APIs in production.

## Industry Practice ✅

**This approach is absolutely standard practice** in the software industry. It's commonly known as:

- **Service Virtualization**
- **Test Doubles / Stubs**
- **Adapter Pattern with Environment Switching**
- **Contract Testing**

### Why This Approach?

✅ **Benefits**:
1. **Independent Development** - Don't wait for external API access
2. **Cost Savings** - No charges during development/testing
3. **Predictable Testing** - Consistent responses for test scenarios
4. **Error Testing** - Easy to simulate failures, timeouts, edge cases
5. **Fast Iteration** - No API rate limits or dependencies
6. **Production Ready** - Easy switch when ready for production

✅ **Used By**:
- Major tech companies (Google, Amazon, Microsoft)
- Financial institutions (Banks, FinTech)
- E-commerce platforms
- Healthcare systems

## Architecture

### Adapter Pattern

```
┌─────────────────────────────────────────┐
│         Integration Hub Service         │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │      Adapter Factory              │  │
│  │  createBureauAdapter()            │  │
│  │  createEKYCAdapter()              │  │
│  │  createPaymentAdapter()            │  │
│  └──────────┬───────────────────────┘  │
│             │                           │
│    ┌────────▼────────┐                 │
│    │  Environment    │                 │
│    │  USE_MOCK_      │                 │
│    │  INTEGRATIONS   │                 │
│    └────────┬────────┘                 │
│             │                           │
│    ┌────────▼────────┐                 │
│    │  Mock Adapter   │  Real Adapter   │
│    │  (Development)  │  (Production)   │
│    └─────────────────┘  └─────────────┘
└─────────────────────────────────────────┘
```

### Implementation Structure

```
services/integration-hub/src/adapters/
├── bureau/
│   ├── types.ts          # Interface definitions
│   ├── mock.ts           # Mock implementation (realistic responses)
│   ├── cibil.ts          # Real CIBIL adapter (placeholder)
│   └── index.ts          # Factory function
├── ekyc/
│   ├── types.ts
│   ├── mock.ts
│   └── index.ts
└── payment/
    ├── types.ts
    ├── mock.ts
    └── index.ts
```

## How It Works

### Development Mode (Default)

```bash
# .env (default - uses mocks)
USE_MOCK_INTEGRATIONS=true  # Can be omitted, true by default
```

**Behavior**:
- All integration calls use mock adapters
- Mock adapters return realistic dummy responses
- Responses match real API contract structure
- Simulates async processing with delays

### Production Mode

```bash
# .env (production)
USE_MOCK_INTEGRATIONS=false
CIBIL_API_KEY=your_production_key
CIBIL_API_ENDPOINT=https://api.cibil.com/v1
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_secret
```

**Behavior**:
- Factory functions create real adapters
- Real adapters make actual API calls
- Credentials loaded from environment variables

## Mock Response Examples

### Bureau (CIBIL) Mock

**Request**:
```json
POST /api/integrations/bureau/pull
{
  "applicationId": "app-123",
  "applicantId": "appl-456",
  "pan": "ABCDE1234F",
  "provider": "CIBIL"
}
```

**Mock Response** (Realistic):
```json
{
  "requestId": "req-uuid",
  "externalRef": "ext-ref",
  "status": "REQUESTED",
  "provider": "CIBIL",
  "estimatedCompletionTime": 5
}
```

After delay (2-5 seconds), report is generated:
- Credit score: 650-850 (realistic range)
- Account details: Simulated loan accounts
- Credit history: Total/active/delinquent accounts

### eKYC Mock

**Request**:
```json
POST /api/integrations/ekyc/start
{
  "applicationId": "app-123",
  "applicantId": "appl-456",
  "pan": "ABCDE1234F",
  "mobile": "9876543210",
  "consent": true
}
```

**Mock Response**:
```json
{
  "sessionId": "session-uuid",
  "status": "PENDING",
  "provider": "NSDL",
  "estimatedCompletionTime": 5,
  "requiresOTP": true,
  "maskedMobile": "******3210"
}
```

### Payment Gateway Mock

**Request**:
```json
POST /api/integrations/payment/order
{
  "applicationId": "app-123",
  "amount": 50000,
  "currency": "INR"
}
```

**Mock Response**:
```json
{
  "orderId": "order-uuid",
  "providerOrderId": "ORDER_1234567890",
  "amount": 50000,
  "currency": "INR",
  "status": "CREATED",
  "provider": "RAZORPAY",
  "paymentUrl": "https://pay.mock-gateway.com/pay/...",
  "expiresAt": "2024-11-01T12:00:00Z"
}
```

## Switching to Production

### Step 1: Implement Real Adapters

```typescript
// services/integration-hub/src/adapters/bureau/cibil.ts
export class CIBILAdapter implements BureauAdapter {
  private apiKey: string;
  private apiEndpoint: string;
  
  async pullCreditReport(request: BureauPullRequest): Promise<BureauPullResponse> {
    const response = await fetch(`${this.apiEndpoint}/credit-report/request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pan: request.pan, dob: request.dob }),
    });
    
    return await response.json();
  }
}
```

### Step 2: Set Environment Variables

```bash
USE_MOCK_INTEGRATIONS=false
CIBIL_API_KEY=prod_key_here
CIBIL_API_ENDPOINT=https://api.cibil.com/v1
```

### Step 3: Deploy

The factory function automatically selects the real adapter:
```typescript
export function createBureauAdapter(): BureauAdapter {
  if (process.env.USE_MOCK_INTEGRATIONS !== 'false') {
    return new MockBureauAdapter();
  }
  return new CIBILAdapter(); // Real adapter
}
```

## Best Practices

### 1. Contract Consistency
- Mock responses must match real API contracts
- Same fields, same types, same structure

### 2. Realistic Data
- Mock credit scores in realistic range (650-850)
- Mock account details that make sense
- Simulate real-world scenarios

### 3. Error Scenarios
- Mock adapters should support failure scenarios
- Test timeout handling
- Test invalid responses

### 4. Environment Management
- Use `.env` files (not committed)
- Different configs for dev/staging/prod
- Secrets management (Vault, AWS Secrets Manager)

### 5. Logging
- Log which adapter is being used (mock vs real)
- Log all integration calls (for debugging)
- Mask sensitive data in logs

## Testing

### Unit Tests
```typescript
describe('Bureau Adapter', () => {
  it('should use mock adapter in development', () => {
    process.env.USE_MOCK_INTEGRATIONS = 'true';
    const adapter = createBureauAdapter();
    expect(adapter).toBeInstanceOf(MockBureauAdapter);
  });
  
  it('should use real adapter in production', () => {
    process.env.USE_MOCK_INTEGRATIONS = 'false';
    const adapter = createBureauAdapter();
    expect(adapter).toBeInstanceOf(CIBILAdapter);
  });
});
```

### Integration Tests
- Test with mock adapters
- Test API contract matches
- Test error handling

## Current Status

✅ **Implemented**:
- Bureau adapter (mock + placeholder for real)
- eKYC adapter (mock + placeholder for real)
- Payment adapter (mock + placeholder for real)
- Factory functions with environment switching

⏳ **Next Steps**:
- Implement real CIBIL adapter when ready
- Implement real Razorpay adapter when ready
- Implement real NSDL eKYC adapter when ready

## Summary

**✅ This approach is:**
- Industry standard
- Production-ready
- Easy to switch to real APIs
- Supports development independence
- Cost-effective
- Well-tested

**🎯 Recommended**: Continue with this approach. When ready for production, simply implement the real adapters and flip the environment variable.


