# Integration Hub Service

Central service for all external integrations. Uses adapter pattern to support both mock (development) and real (production) integrations.

## Architecture

### Adapter Pattern
- **Interface-based**: Each integration has a common interface
- **Environment-based switching**: Use `USE_MOCK_INTEGRATIONS=false` for production
- **Provider abstraction**: Easy to add new providers

### Current Integrations

1. **Bureau (Credit Bureau)**
   - Providers: CIBIL, Experian, Equifax
   - Endpoint: `POST /api/integrations/bureau/pull`
   - Mock: Returns realistic credit scores (650-850) and account details

2. **eKYC (Electronic KYC)**
   - Providers: NSDL, Aadhaar XML, CKYC
   - Endpoint: `POST /api/integrations/ekyc/start`
   - Mock: Returns session IDs, simulates verification

3. **Payment Gateway**
   - Providers: Razorpay, PayU, Stripe
   - Endpoint: `POST /api/integrations/payment/order`
   - Mock: Returns payment URLs, simulates payment completion

4. **PAN Validation**
   - Provider: NSDL
   - Endpoint: `POST /api/integrations/pan/validate`
   - Current: Basic format validation (real API integration pending)

## Environment Configuration

### Development (Default - Uses Mocks)
```bash
USE_MOCK_INTEGRATIONS=true  # Default, can be omitted
```

### Production (Real APIs)
```bash
USE_MOCK_INTEGRATIONS=false
CIBIL_API_KEY=your_key
CIBIL_API_ENDPOINT=https://api.cibil.com/v1
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
NSDL_API_KEY=your_key
# ... other provider credentials
```

## Mock Responses

Mock adapters return realistic responses that match real API contracts:
- **Bureau**: Credit scores (650-850), account details, credit history
- **eKYC**: Session IDs, verification status, KYC data
- **Payment**: Order IDs, payment URLs, transaction IDs

## Switching to Production

1. Set `USE_MOCK_INTEGRATIONS=false`
2. Configure provider API keys/endpoints
3. Implement real adapters (TODO comments mark where)
4. Deploy with production credentials

## API Endpoints

### Bureau
- `POST /api/integrations/bureau/pull` - Request credit report

### eKYC
- `POST /api/integrations/ekyc/start` - Start eKYC verification
- `GET /api/integrations/ekyc/:sessionId/status` - Check eKYC status

### Payment
- `POST /api/integrations/payment/order` - Create payment order

### PAN
- `POST /api/integrations/pan/validate` - Validate PAN

## Webhooks

All webhooks support HMAC signature verification:
- `POST /webhooks/bureau` - Bureau report callback
- `POST /webhooks/esign` - eSign callback
- `POST /webhooks/cbs` - Core banking callback

## Implementation Status

✅ **Mock Implementations**: Complete  
⏳ **Real Implementations**: Placeholder structure ready  
📝 **Next Steps**: Implement real adapters when ready for production
