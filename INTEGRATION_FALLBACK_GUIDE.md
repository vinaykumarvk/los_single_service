# Integration Adapters - Fallback Mode Guide

## Overview

All real integration adapters now support **graceful fallback mode** when API keys are not configured. Instead of throwing errors, adapters will return realistic dummy data, allowing development and testing without actual API credentials.

## How It Works

### Automatic Detection

Each adapter checks for required API keys during initialization:

- If API keys are **present** → Uses real API calls
- If API keys are **missing** → Automatically switches to fallback mode

### Fallback Behavior

- ✅ **No errors thrown** - Adapters initialize successfully
- ✅ **Realistic dummy data** - Returns test-friendly responses
- ✅ **Logging warnings** - Alerts when fallback mode is active
- ✅ **Same interface** - Response format matches real API responses

## Adapters with Fallback Support

### 1. CIBIL Bureau Adapter

**Environment Variables:**
- `CIBIL_API_KEY` - CIBIL API key
- `CIBIL_API_ENDPOINT` - API endpoint (default: `https://api.cibil.com/v1`)
- `CIBIL_API_TIMEOUT` - Request timeout in ms (default: 30000)

**Fallback Data:**
- Returns dummy credit report with score between 650-850
- Includes sample home loan account data
- Request IDs follow format: `CIBIL_REQ_<timestamp>_<random>`

**Usage:**
```typescript
// Works even without CIBIL_API_KEY configured
const adapter = createBureauAdapter('CIBIL');
const report = await adapter.pullCreditReport({ pan, dob });
```

### 2. NSDL eKYC Adapter

**Environment Variables:**
- `NSDL_API_KEY` - NSDL API key
- `NSDL_API_SECRET` - NSDL API secret
- `NSDL_API_ENDPOINT` - API endpoint (default: `https://api.nsdl.com/v1`)
- `NSDL_API_TIMEOUT` - Request timeout in ms (default: 30000)

**Fallback Data:**
- Returns session IDs in format: `NSDL_SESSION_<timestamp>_<random>`
- OTP verification simulates 85% success rate
- Status check returns completed KYC with test user data

**Usage:**
```typescript
// Works even without NSDL_API_KEY/NSDL_API_SECRET
const adapter = createEKYCAdapter('NSDL');
const session = await adapter.startVerification({ /* ... */ });
```

### 3. Razorpay Payment Adapter

**Environment Variables:**
- `RAZORPAY_KEY_ID` - Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Razorpay key secret
- `RAZORPAY_API_ENDPOINT` - API endpoint (default: `https://api.razorpay.com/v1`)
- `RAZORPAY_API_TIMEOUT` - Request timeout in ms (default: 30000)
- `RAZORPAY_WEBHOOK_SECRET` - Webhook signature verification secret

**Fallback Data:**
- Order IDs in format: `ORDER_<timestamp>_<random>`
- Payment status simulates 85% success rate
- Payment URLs: `https://pay.razorpay.com/test/<orderId>`
- Refund IDs in format: `REFUND_<timestamp>_<random>`

**Usage:**
```typescript
// Works even without RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET
const adapter = createPaymentAdapter('RAZORPAY');
const order = await adapter.createOrder({ amount: 100000, /* ... */ });
```

### 4. NSDL PAN Validation Adapter

**Environment Variables:**
- `NSDL_PAN_API_KEY` - NSDL PAN validation API key
- `NSDL_PAN_API_ENDPOINT` - API endpoint (default: `https://api.nsdl.com/v1/pan`)
- `NSDL_PAN_API_TIMEOUT` - Request timeout in ms (default: 30000)

**Fallback Data:**
- Uses applicant name if provided, otherwise "TEST USER"
- Returns `valid: true` with status "VALID"
- Provider ref in format: `PAN_VAL_<timestamp>_<random>`

**Usage:**
```typescript
// Works even without NSDL_PAN_API_KEY
const adapter = new NSDLPANAdapter();
const result = await adapter.validate({ pan: 'ABCDE1234F', applicantName: 'John Doe' });
```

## Enabling Real Integrations

To switch from fallback mode to real API calls:

1. **Set environment variables** with actual API keys:
   ```bash
   export CIBIL_API_KEY=your_cibil_key
   export NSDL_API_KEY=your_nsdl_key
   export NSDL_API_SECRET=your_nsdl_secret
   export RAZORPAY_KEY_ID=your_razorpay_key_id
   export RAZORPAY_KEY_SECRET=your_razorpay_secret
   export NSDL_PAN_API_KEY=your_nsdl_pan_key
   ```

2. **Set USE_MOCK_INTEGRATIONS=false**:
   ```bash
   export USE_MOCK_INTEGRATIONS=false
   ```

3. **Restart the integration-hub service** - Adapters will detect keys and switch to real mode automatically

## Logging

All adapters log when fallback mode is active:

```
WARN: CIBILAdapterUsingFallback { reason: 'CIBIL_API_KEY not configured, using dummy responses' }
WARN: NSDLAdapterUsingFallback { reason: 'NSDL_API_KEY or NSDL_API_SECRET not configured, using dummy responses' }
WARN: RazorpayAdapterUsingFallback { reason: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured, using dummy responses' }
WARN: NSDLPANAdapterUsingFallback { reason: 'NSDL_PAN_API_KEY not configured, using dummy responses' }
```

## Testing Fallback Mode

You can test fallback mode by:

1. **Not setting API keys** - Adapters will automatically use fallback
2. **Setting USE_MOCK_INTEGRATIONS=false** - Forces adapter usage (with fallback if keys missing)
3. **Checking logs** - Look for "UsingFallback" warnings
4. **Verifying responses** - Check for dummy data patterns (timestamps, random IDs)

## Best Practices

1. **Development**: Use fallback mode for local development without API credentials
2. **Testing**: Fallback mode provides consistent test data
3. **Production**: Always configure real API keys in production environments
4. **Monitoring**: Set up alerts for "UsingFallback" warnings in production logs

## Response Examples

### Fallback Credit Report
```json
{
  "requestId": "CIBIL_REQ_1234567890_abc123",
  "creditScore": 750,
  "scoreDate": "2024-01-15T10:30:00Z",
  "accounts": [
    {
      "accountType": "HOME_LOAN",
      "lender": "HDFC Bank",
      "status": "CURRENT"
    }
  ]
}
```

### Fallback Payment Order
```json
{
  "orderId": "ORDER_1234567890_xyz789",
  "providerOrderId": "ORDER_1234567890_xyz789",
  "status": "CREATED",
  "paymentUrl": "https://pay.razorpay.com/test/ORDER_1234567890_xyz789"
}
```

### Fallback PAN Validation
```json
{
  "pan": "ABCDE1234F",
  "valid": true,
  "holderName": "TEST USER",
  "status": "VALID",
  "providerRef": "PAN_VAL_1234567890_def456"
}
```

## Migration Path

1. **Phase 1**: Develop and test using fallback mode (current state)
2. **Phase 2**: Obtain API credentials from providers
3. **Phase 3**: Configure environment variables
4. **Phase 4**: Set `USE_MOCK_INTEGRATIONS=false`
5. **Phase 5**: Verify real API integration in staging
6. **Phase 6**: Deploy to production with monitoring

