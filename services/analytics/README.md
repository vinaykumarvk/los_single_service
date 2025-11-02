# Analytics Service

Advanced Analytics Service with custom report builder, predictive analytics, and portfolio analysis.

## Features

- **Custom Report Builder**: Build custom reports with flexible dimensions and metrics
- **Predictive Analytics**: Predict approval rates and application volumes
- **Portfolio Risk Analysis**: Analyze portfolio risk factors
- **Trend Analysis**: Generate trend reports (daily/weekly/monthly)

## API Endpoints

### POST /api/analytics/reports/build
Build custom report.

**Request:**
```json
{
  "name": "Monthly Application Report",
  "metrics": ["totalApplications", "approvalRate", "totalAmount"],
  "dimensions": ["status", "channel", "productCode"],
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "groupBy": ["status", "channel"],
  "orderBy": "totalApplications DESC"
}
```

### GET /api/analytics/predictive/approval-rate
Predict approval rate for upcoming period.

**Query Parameters:**
- `productCode` (optional)
- `channel` (optional)
- `timeframe` - 7d, 30d, 90d, 365d (default: 30d)

### GET /api/analytics/predictive/application-volume
Predict application volume.

**Query Parameters:**
- `days` - Number of days to predict (default: 30)
- `channel` (optional)
- `productCode` (optional)

### GET /api/analytics/portfolio/risk
Analyze portfolio risk.

**Query Parameters:**
- `productCode` (optional)
- `channel` (optional)

### GET /api/analytics/trends
Generate trend analysis.

**Query Parameters:**
- `metric` - applications, approvals, amount (default: applications)
- `period` - daily, weekly, monthly (default: daily)
- `days` - Number of days (default: 90)

## Running

```bash
# Development
cd services/analytics
pnpm dev

# Production
pnpm build
pnpm start
```

## Configuration

- `PORT` - Service port (default: 3019)
- `DATABASE_URL` - PostgreSQL connection string

