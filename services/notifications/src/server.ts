import express from 'express';
import { json } from 'express';
import { correlationIdMiddleware, createLogger } from '@los/shared-libs';

const app = express();
const logger = createLogger('notifications-service');
app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

// POST /api/notifications/send - send notification (email/SMS/push)
app.post('/api/notifications/send', (req, res) => {
  const { type, recipient, subject, body } = req.body || {};
  logger.info('NotificationQueued', { correlationId: (req as any).correlationId, type, recipient });
  // TODO: Queue via email provider (SendGrid/AWS SES) or SMS (Twilio) or push (FCM)
  return res.status(202).json({ queued: true, type });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3011;
app.listen(port, () => {
  logger.info('Notifications service listening', { port });
});

