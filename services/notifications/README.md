Notifications Service

Email/SMS/push notifications with real provider integrations.

## Features

- **Email**: SMTP (nodemailer) or SendGrid API
- **SMS**: Twilio integration
- **Push**: Placeholder (FCM/APNS to be implemented)
- Notification tracking and delivery status
- Support for email templates (basic HTML)

## Environment Variables

### Email Configuration

**Option 1: SMTP (nodemailer)**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for 465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@los.example.com
```

**Option 2: SendGrid**
```bash
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@los.example.com
```

### SMS Configuration (Twilio)
```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM_NUMBER=+1234567890
```

## API Endpoints

- `POST /api/notifications/send` - Send notification (email/SMS/push)
- `GET /api/notifications/:id` - Get notification status
- `GET /api/notifications` - List notifications with filters (type, status, recipient)

## Usage Example

```json
POST /api/notifications/send
{
  "type": "email",
  "recipient": "customer@example.com",
  "subject": "Loan Application Submitted",
  "body": "Your loan application has been submitted successfully.",
  "metadata": {
    "applicationId": "..."
  }
}
```

## Notification Status

- `PENDING` - Queued for sending
- `SENT` - Successfully sent to provider
- `FAILED` - Failed to send
- `DELIVERED` - Confirmed delivery (if provider supports webhooks)
