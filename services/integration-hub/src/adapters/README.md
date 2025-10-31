# Integration Adapters

This directory contains adapters for external integrations. Each adapter implements a provider interface and can switch between mock and real implementations based on environment configuration.

## Architecture

- **Adapters**: Interface-based implementations (Mock vs Real)
- **Environment Switch**: `USE_MOCK_INTEGRATIONS=true` (default: true for dev)
- **Realistic Mock Data**: Mock responses match real API contract
- **Easy Production Switch**: Change env var to use real APIs

## Providers

1. **Bureau Adapter** (`bureau/`)
   - CIBIL, Experian, Equifax
   - Mock: Returns realistic credit scores and report data
   
2. **eKYC Adapter** (`ekyc/`)
   - NSDL, Aadhaar XML, CKYC
   - Mock: Returns session IDs, verification status
   
3. **eSign Adapter** (`esign/`)
   - DigiLocker, NSDL eSign
   - Mock: Returns eSign request/response flows
   
4. **Payment Gateway Adapter** (`payment/`)
   - Razorpay, PayU, Stripe
   - Mock: Returns payment order IDs, transaction status
   
5. **PAN Validation Adapter** (`pan/`)
   - NSDL PAN validation
   - Mock: Returns validation status with holder name

## Usage

```typescript
import { createBureauAdapter } from './adapters/bureau';

const adapter = createBureauAdapter(); // Auto-selects mock or real based on env
const result = await adapter.pullCreditReport({ pan, dob });
```

## Switching to Production

1. Set environment variable: `USE_MOCK_INTEGRATIONS=false`
2. Configure provider credentials (API keys, endpoints)
3. Deploy with real provider configs


