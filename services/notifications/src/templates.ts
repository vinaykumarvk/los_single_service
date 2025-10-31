/**
 * Notification Template Engine
 * Supports variable substitution in templates using {{variable}} syntax
 */

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Renders a template string with variable substitution
 * Supports {{variable}} syntax
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  let rendered = template;
  
  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const replacement = value !== null && value !== undefined ? String(value) : '';
    rendered = rendered.replace(placeholder, replacement);
  }
  
  // Remove any remaining unresolved placeholders (optional - might want to keep them or throw error)
  // rendered = rendered.replace(/{{\s*\w+\s*}}/g, '');
  
  return rendered;
}

/**
 * Predefined template functions for common scenarios
 */
export const templates = {
  applicationSubmitted: (applicationId: string, applicantName: string): string => {
    return `Dear {{applicantName}},\n\nYour loan application ({{applicationId}}) has been submitted successfully.\n\nWe will review your application and get back to you soon.\n\nThank you!`;
  },
  
  applicationApproved: (applicationId: string, sanctionedAmount: number, emi: number): string => {
    return `Congratulations!\n\nYour loan application {{applicationId}} has been approved.\n\nSanctioned Amount: ₹{{sanctionedAmount}}\nEMI: ₹{{emi}}\n\nPlease check your email for the offer letter.`;
  },
  
  applicationRejected: (applicationId: string, reason?: string): string => {
    const reasonText = reason ? `\nReason: {{reason}}` : '';
    return `Dear Applicant,\n\nWe regret to inform you that your loan application {{applicationId}} could not be approved at this time.${reasonText}\n\nYou may reapply after addressing the concerns.\n\nThank you.`;
  },
  
  offerExpiring: (applicationId: string, daysRemaining: number): string => {
    return `Reminder: Your loan offer for application {{applicationId}} will expire in {{daysRemaining}} days.\n\nPlease accept the offer before it expires.`;
  },
  
  paymentReminder: (applicationId: string, dueDate: string, amount: number): string => {
    return `Payment Reminder\n\nYour EMI payment of ₹{{amount}} for application {{applicationId}} is due on {{dueDate}}.\n\nPlease ensure sufficient balance in your account.`;
  }
};

/**
 * Render a predefined template with variables
 */
export function renderPredefinedTemplate(
  templateFn: (...args: any[]) => string,
  variables: TemplateVariables
): string {
  // This is a helper that first calls the template function, then renders variables
  // Note: This assumes the template function uses placeholder syntax
  const templateString = templateFn(...Object.values(variables).filter(v => v !== null && v !== undefined));
  return renderTemplate(templateString, variables);
}

