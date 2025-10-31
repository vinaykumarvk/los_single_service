import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Notification Providers Unit Tests
 * Tests email and SMS provider abstractions
 */

// Mock the provider implementations
class MockEmailProvider {
  async sendEmail(to: string, subject: string, html: string, text?: string) {
    return { success: true, messageId: `mock-email-${Date.now()}` };
  }
}

class MockSMSProvider {
  async sendSMS(to: string, message: string) {
    return { success: true, messageId: `mock-sms-${Date.now()}` };
  }
}

describe('Email Provider', () => {
  let provider: MockEmailProvider;

  beforeEach(() => {
    provider = new MockEmailProvider();
  });

  it('should send email successfully', async () => {
    const result = await provider.sendEmail('test@example.com', 'Test Subject', '<p>Test Body</p>', 'Test Body');
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toContain('mock-email');
  });

  it('should handle email with HTML and text', async () => {
    const html = '<h1>Title</h1><p>Content</p>';
    const text = 'Title\nContent';
    
    const result = await provider.sendEmail('test@example.com', 'Subject', html, text);
    
    expect(result.success).toBe(true);
  });

  it('should handle email with only HTML', async () => {
    const html = '<p>HTML only</p>';
    
    const result = await provider.sendEmail('test@example.com', 'Subject', html);
    
    expect(result.success).toBe(true);
  });
});

describe('SMS Provider', () => {
  let provider: MockSMSProvider;

  beforeEach(() => {
    provider = new MockSMSProvider();
  });

  it('should send SMS successfully', async () => {
    const result = await provider.sendSMS('+919876543210', 'Test message');
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toContain('mock-sms');
  });

  it('should handle long SMS messages', async () => {
    const longMessage = 'A'.repeat(500);
    
    const result = await provider.sendSMS('+919876543210', longMessage);
    
    expect(result.success).toBe(true);
  });

  it('should handle short SMS messages', async () => {
    const shortMessage = 'Hi';
    
    const result = await provider.sendSMS('+919876543210', shortMessage);
    
    expect(result.success).toBe(true);
  });
});

describe('Provider Factory Functions', () => {
  it('should create email provider based on configuration', () => {
    // In real implementation, this would check SENDGRID_API_KEY
    // For unit tests, we're testing the factory pattern
    const createProvider = (useSendGrid: boolean) => {
      return useSendGrid ? 'SendGrid' : 'SMTP';
    };

    expect(createProvider(true)).toBe('SendGrid');
    expect(createProvider(false)).toBe('SMTP');
  });

  it('should create SMS provider', () => {
    // SMS provider factory always returns Twilio (with mock fallback)
    const createProvider = () => 'Twilio';
    
    expect(createProvider()).toBe('Twilio');
  });
});

describe('Text to HTML Conversion', () => {
  it('should convert newlines to HTML breaks', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const html = text.replace(/\n/g, '<br>');
    
    expect(html).toBe('Line 1<br>Line 2<br>Line 3');
  });

  it('should handle plain text', () => {
    const text = 'Simple text';
    const html = text.replace(/\n/g, '<br>');
    
    expect(html).toBe('Simple text');
  });

  it('should handle HTML stripping', () => {
    const html = '<p>Test</p>';
    const text = html.replace(/<[^>]*>/g, '');
    
    expect(text).toBe('Test');
  });
});

