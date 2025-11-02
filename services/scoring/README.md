# Scoring Service

AI/ML Scoring Service with support for internal ML engine and third-party scoring providers.

## Features

- **Internal ML Engine**: Weighted factor analysis with risk modeling
- **Third-Party Integration**: Supports Experian, Equifax, FICO, and custom providers
- **Fallback Mechanism**: Automatic fallback to internal ML if third-party fails
- **Flexible Provider Selection**: Choose scoring provider per request

## API Endpoints

### GET /api/scoring/providers
List available scoring providers and their status.

### POST /api/scoring/calculate?provider=INTERNAL_ML
Calculate credit score for an application.

**Request Body:**
```json
{
  "applicationId": "uuid",
  "applicantId": "uuid",
  "monthlyIncome": 50000,
  "existingEmi": 10000,
  "proposedAmount": 1000000,
  "tenureMonths": 60,
  "propertyValue": 1500000,
  "applicantAgeYears": 35,
  "creditScore": 750,
  "employmentType": "SALARIED",
  "employmentTenure": 24,
  "bankingRelationship": 36,
  "previousDefaults": false,
  "channel": "Online",
  "productCode": "HL001"
}
```

**Response:**
```json
{
  "score": 785,
  "riskLevel": "LOW",
  "recommendation": "APPROVE",
  "confidence": 0.85,
  "factors": [
    {
      "factor": "Credit Score",
      "impact": "POSITIVE",
      "weight": 0.92,
      "explanation": "Strong credit history"
    }
  ],
  "providerUsed": "INTERNAL_ML",
  "modelVersion": "1.0.0",
  "calculatedAt": "2024-12-XX..."
}
```

## Configuration

### Environment Variables

**Internal ML** (always available):
- No configuration needed

**Third-Party Providers**:
- `EXPERIAN_SCORING_API_URL` - Experian API endpoint
- `EXPERIAN_API_KEY` - Experian API key
- `EQUIFAX_SCORING_API_URL` - Equifax API endpoint
- `EQUIFAX_API_KEY` - Equifax API key
- `FICO_SCORING_API_URL` - FICO API endpoint
- `FICO_API_KEY` - FICO API key
- `CUSTOM_SCORING_API_URL` - Custom provider endpoint
- `CUSTOM_SCORING_API_KEY` - Custom provider API key

**Service Configuration:**
- `PORT` - Service port (default: 3018)
- `DATABASE_URL` - PostgreSQL connection string (if needed for history)

## Running

```bash
# Development
cd services/scoring
pnpm dev

# Production
pnpm build
pnpm start
```

## Integration

The scoring service is automatically called by the underwriting service:

```bash
# Underwriting will call scoring service
POST /api/applications/:id/underwrite?scoringProvider=INTERNAL_ML
```

