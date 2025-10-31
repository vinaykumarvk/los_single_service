import { createLogger } from '@los/shared-libs';

const logger = createLogger('notification-providers');

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// SMTP Email Provider (using nodemailer)
export class SMTPEmailProvider implements EmailProvider {
  private transporter: any;

  constructor() {
    try {
      const nodemailer = require('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } catch (err) {
      logger.warn('Nodemailer not available, email will be mocked', { error: (err as Error).message });
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !process.env.SMTP_USER) {
      logger.info('EmailMocked', { to, subject });
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html
      });
      logger.info('EmailSent', { to, subject, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error('EmailSendError', { error: (err as Error).message, to, subject });
      return { success: false, error: (err as Error).message };
    }
  }
}

// SendGrid Email Provider
export class SendGridEmailProvider implements EmailProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || '';
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      logger.info('SendGridNotConfigured', { to, subject });
      return { success: false, error: 'SendGrid API key not configured' };
    }

    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(this.apiKey);

      const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@los.example.com',
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html
      };

      const response = await sgMail.send(msg);
      logger.info('SendGridEmailSent', { to, subject, messageId: response[0]?.headers['x-message-id'] });
      return { success: true, messageId: response[0]?.headers['x-message-id'] };
    } catch (err: any) {
      logger.error('SendGridError', { error: err.message, to, subject });
      return { success: false, error: err.message };
    }
  }
}

// Twilio SMS Provider
export class TwilioSMSProvider implements SMSProvider {
  private client: any;
  private fromNumber: string;

  constructor() {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';

      if (accountSid && authToken) {
        const twilio = require('twilio');
        this.client = twilio(accountSid, authToken);
      }
    } catch (err) {
      logger.warn('Twilio not available, SMS will be mocked', { error: (err as Error).message });
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client || !this.fromNumber) {
      logger.info('SMSMocked', { to, messageLength: message.length });
      return { success: true, messageId: 'mock-sms-' + Date.now() };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to
      });
      logger.info('SMSSent', { to, messageId: result.sid });
      return { success: true, messageId: result.sid };
    } catch (err: any) {
      logger.error('SMSSendError', { error: err.message, to });
      return { success: false, error: err.message };
    }
  }
}

// Factory functions
export function createEmailProvider(): EmailProvider {
  if (process.env.SENDGRID_API_KEY) {
    return new SendGridEmailProvider();
  }
  return new SMTPEmailProvider();
}

export function createSMSProvider(): SMSProvider {
  return new TwilioSMSProvider();
}


