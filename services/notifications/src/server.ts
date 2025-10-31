import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { correlationIdMiddleware, createLogger, createPgPool } from '@los/shared-libs';
import { createEmailProvider, createSMSProvider } from './providers';
import { renderTemplate, TemplateVariables } from './templates';

const app = express();
const logger = createLogger('notifications-service');
const pool = createPgPool();

app.use(json());
app.use(correlationIdMiddleware);

app.get('/health', (_req, res) => res.status(200).send('OK'));

const SendNotificationSchema = z.object({
  type: z.enum(['email', 'sms', 'push']),
  recipient: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  metadata: z.record(z.any()).optional()
});

// Helper function to check notification preferences (moved before send endpoint)
async function shouldSendNotification(recipient: string, type: 'email' | 'sms' | 'push', notificationType?: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(
      'SELECT preferences FROM notification_preferences WHERE recipient = $1',
      [recipient]
    );
    
    if (rows.length === 0) {
      // No preferences = default enabled
      return true;
    }
    
    const prefs = rows[0].preferences as any;
    const channelPrefs = prefs[type];
    
    if (!channelPrefs || channelPrefs.enabled === false) {
      return false;
    }
    
    // If specific notification types are defined, check if this type is allowed
    if (notificationType && channelPrefs.types && Array.isArray(channelPrefs.types)) {
      return channelPrefs.types.includes(notificationType);
    }
    
    return channelPrefs.enabled === true;
  } catch (err) {
    logger.warn('PreferenceCheckError', { error: (err as Error).message, recipient });
    // Fail open - allow notification if preference check fails
    return true;
  }
}

// POST /api/notifications/send - send notification (email/SMS/push) - with preference checking
app.post('/api/notifications/send', async (req, res) => {
  const parsed = SendNotificationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const { type, recipient, subject, body, metadata } = parsed.data;
  
  // Check preferences before sending
  const notificationType = metadata?.notificationType as string | undefined;
  const shouldSend = await shouldSendNotification(recipient, type, notificationType);
  
  if (!shouldSend) {
    logger.info('NotificationBlockedByPreference', { 
      correlationId: (req as any).correlationId, 
      recipient, 
      type,
      notificationType 
    });
    return res.status(200).json({ 
      notificationId: null,
      status: 'BLOCKED',
      message: 'Notification blocked by user preferences'
    });
  }
  
  // Continue with notification sending
  const notificationId = uuidv4();

  try {
    // Record notification in database
    await pool.query(
      `INSERT INTO notifications 
       (notification_id, type, recipient, subject, body, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [notificationId, type, recipient, subject || null, body, 'PENDING', metadata ? JSON.stringify(metadata) : null]
    );

    let result: { success: boolean; messageId?: string; error?: string };

    // Apply template rendering if metadata contains variables
    let renderedBody = body;
    let renderedSubject = subject;
    if (metadata && metadata.variables) {
      const variables = metadata.variables as TemplateVariables;
      renderedBody = renderTemplate(body, variables);
      if (renderedSubject) {
        renderedSubject = renderTemplate(renderedSubject, variables);
      }
    }

    // Send based on type
    if (type === 'email') {
      const emailProvider = createEmailProvider();
      const htmlBody = renderedBody.replace(/\n/g, '<br>'); // Simple text-to-HTML conversion
      result = await emailProvider.sendEmail(recipient, renderedSubject || 'Notification', htmlBody, renderedBody);
    } else if (type === 'sms') {
      const smsProvider = createSMSProvider();
      result = await smsProvider.sendSMS(recipient, renderedBody);
    } else {
      // Push notifications - placeholder for FCM/APNS
      logger.info('PushNotificationNotImplemented', { recipient, body: renderedBody });
      result = { success: false, error: 'Push notifications not yet implemented' };
    }

    // Update notification status
    if (result.success) {
      await pool.query(
        'UPDATE notifications SET status = $1, provider_message_id = $2, sent_at = now() WHERE notification_id = $3',
        ['SENT', result.messageId, notificationId]
      );
      logger.info('NotificationSent', { 
        correlationId: (req as any).correlationId, 
        notificationId, 
        type, 
        recipient,
        messageId: result.messageId 
      });
      return res.status(202).json({ 
        notificationId, 
        status: 'SENT', 
        type,
        messageId: result.messageId 
      });
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, provider_error = $2 WHERE notification_id = $3',
        ['FAILED', result.error, notificationId]
      );
      logger.error('NotificationFailed', { 
        correlationId: (req as any).correlationId, 
        notificationId, 
        type, 
        recipient,
        error: result.error 
      });
      return res.status(500).json({ 
        notificationId, 
        status: 'FAILED', 
        error: result.error 
      });
    }
  } catch (err) {
    await pool.query(
      'UPDATE notifications SET status = $1, provider_error = $2 WHERE notification_id = $3',
      ['FAILED', (err as Error).message, notificationId]
    );
    logger.error('NotificationError', { 
      error: (err as Error).message, 
      correlationId: (req as any).correlationId,
      notificationId 
    });
    return res.status(500).json({ error: 'Failed to send notification' });
  }
});

// GET /api/notifications/:id - get notification status
app.get('/api/notifications/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE notification_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    return res.status(200).json(rows[0]);
  } catch (err) {
    logger.error('GetNotificationError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

// GET /api/notifications - list notifications with filters
app.get('/api/notifications', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (req.query.type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(req.query.type);
    }
    if (req.query.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(req.query.status);
    }
    if (req.query.recipient) {
      conditions.push(`recipient = $${paramCount++}`);
      values.push(req.query.recipient);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM notifications ${whereClause}`, values);
    const total = parseInt(countResult.rows[0].total, 10);

    values.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`,
      values
    );

    return res.status(200).json({
      notifications: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    logger.error('ListNotificationsError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list notifications' });
  }
});

const TemplateSchema = z.object({
  templateName: z.string().min(1),
  templateType: z.enum(['email', 'sms', 'push']),
  subjectTemplate: z.string().optional(),
  bodyTemplate: z.string().min(1),
  variables: z.record(z.any()).optional(),
  description: z.string().optional()
});

// POST /api/notifications/templates - create notification template
app.post('/api/notifications/templates', async (req, res) => {
  const parsed = TemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const templateId = uuidv4();
  try {
    await pool.query(
      `INSERT INTO notification_templates 
       (template_id, template_name, template_type, subject_template, body_template, variables, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        templateId,
        parsed.data.templateName,
        parsed.data.templateType,
        parsed.data.subjectTemplate || null,
        parsed.data.bodyTemplate,
        parsed.data.variables ? JSON.stringify(parsed.data.variables) : null,
        parsed.data.description || null
      ]
    );
    
    logger.info('TemplateCreated', { correlationId: (req as any).correlationId, templateId, templateName: parsed.data.templateName });
    return res.status(201).json({ templateId, templateName: parsed.data.templateName });
  } catch (err) {
    logger.error('TemplateCreateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

// GET /api/notifications/templates - list all templates
app.get('/api/notifications/templates', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT template_id, template_name, template_type, subject_template, body_template, variables, description, is_active, created_at FROM notification_templates ORDER BY template_name'
    );
    
    return res.status(200).json({ templates: rows });
  } catch (err) {
    logger.error('ListTemplatesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to list templates' });
  }
});

// GET /api/notifications/templates/:name - get template by name
app.get('/api/notifications/templates/:name', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT template_id, template_name, template_type, subject_template, body_template, variables, description, is_active FROM notification_templates WHERE template_name = $1',
      [req.params.name]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    return res.status(200).json(rows[0]);
  } catch (err) {
    logger.error('GetTemplateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/notifications/send-from-template - send notification using template
app.post('/api/notifications/send-from-template', async (req, res) => {
  const SendFromTemplateSchema = z.object({
    templateName: z.string().min(1),
    recipient: z.string().min(1),
    variables: z.record(z.any()).optional()
  });
  
  const parsed = SendFromTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    // Fetch template
    const templateResult = await pool.query(
      'SELECT template_type, subject_template, body_template, is_active FROM notification_templates WHERE template_name = $1',
      [parsed.data.templateName]
    );
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = templateResult.rows[0];
    if (!template.is_active) {
      return res.status(400).json({ error: 'Template is not active' });
    }

    // Render template with variables
    const variables = parsed.data.variables || {};
    const renderedBody = renderTemplate(template.body_template, variables);
    const renderedSubject = template.subject_template ? renderTemplate(template.subject_template, variables) : undefined;

    // Send notification using existing endpoint logic
    const notificationId = uuidv4();
    await pool.query(
      `INSERT INTO notifications 
       (notification_id, type, recipient, subject, body, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [notificationId, template.template_type, parsed.data.recipient, renderedSubject || null, renderedBody, 'PENDING', JSON.stringify({ templateName: parsed.data.templateName, variables })]
    );

    // Send based on type
    let result: { success: boolean; messageId?: string; error?: string };
    if (template.template_type === 'email') {
      const emailProvider = createEmailProvider();
      const htmlBody = renderedBody.replace(/\n/g, '<br>');
      result = await emailProvider.sendEmail(parsed.data.recipient, renderedSubject || 'Notification', htmlBody, renderedBody);
    } else if (template.template_type === 'sms') {
      const smsProvider = createSMSProvider();
      result = await smsProvider.sendSMS(parsed.data.recipient, renderedBody);
    } else {
      result = { success: false, error: 'Push notifications not yet implemented' };
    }

    // Update notification status
    if (result.success) {
      await pool.query(
        'UPDATE notifications SET status = $1, provider_message_id = $2, sent_at = now() WHERE notification_id = $3',
        ['SENT', result.messageId, notificationId]
      );
      return res.status(202).json({ notificationId, status: 'SENT', messageId: result.messageId });
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, provider_error = $2 WHERE notification_id = $3',
        ['FAILED', result.error, notificationId]
      );
      return res.status(500).json({ notificationId, status: 'FAILED', error: result.error });
    }
  } catch (err) {
    logger.error('SendFromTemplateError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to send notification from template' });
  }
});

// GET /api/notifications/preferences/:recipient - get notification preferences
app.get('/api/notifications/preferences/:recipient', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT preference_id, user_id, recipient, preferences, created_at, updated_at FROM notification_preferences WHERE recipient = $1',
      [req.params.recipient]
    );
    
    if (rows.length === 0) {
      // Return default preferences
      return res.status(200).json({
        recipient: req.params.recipient,
        preferences: {
          email: { enabled: true, types: [] },
          sms: { enabled: true, types: [] },
          push: { enabled: false, types: [] }
        }
      });
    }
    
    return res.status(200).json(rows[0]);
  } catch (err) {
    logger.error('GetPreferencesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/notifications/preferences/:recipient - update notification preferences
app.put('/api/notifications/preferences/:recipient', async (req, res) => {
  const PreferencesSchema = z.object({
    userId: z.string().uuid().optional(),
    preferences: z.object({
      email: z.object({
        enabled: z.boolean(),
        types: z.array(z.string()).optional()
      }).optional(),
      sms: z.object({
        enabled: z.boolean(),
        types: z.array(z.string()).optional()
      }).optional(),
      push: z.object({
        enabled: z.boolean(),
        types: z.array(z.string()).optional()
      }).optional()
    })
  });
  
  const parsed = PreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }
  
  try {
    const preferenceId = uuidv4();
    await pool.query(
      `INSERT INTO notification_preferences (preference_id, user_id, recipient, preferences)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, recipient) DO UPDATE SET
         preferences = EXCLUDED.preferences,
         updated_at = now()`,
      [
        preferenceId,
        parsed.data.userId || null,
        req.params.recipient,
        JSON.stringify(parsed.data.preferences)
      ]
    );
    
    logger.info('PreferencesUpdated', { correlationId: (req as any).correlationId, recipient: req.params.recipient });
    return res.status(200).json({ 
      recipient: req.params.recipient,
      preferences: parsed.data.preferences,
      updated: true 
    });
  } catch (err) {
    logger.error('UpdatePreferencesError', { error: (err as Error).message, correlationId: (req as any).correlationId });
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});


const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3011;
app.listen(port, () => {
  logger.info('Notifications service listening', { port });
});

