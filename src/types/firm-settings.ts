/**
 * Firm settings for email branding and other firm-wide configuration
 */
export interface FirmSettings {
  firm_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
  reply_to_email: string | null;
  footer_text: string | null;
  // Automation settings
  automation_intake_reminder_enabled: string;
  automation_intake_reminder_hours: string;
  automation_client_idle_enabled: string;
  automation_client_idle_days: string;
  automation_lawyer_idle_enabled: string;
  automation_lawyer_idle_days: string;
  automation_invoice_reminder_enabled: string;
  automation_invoice_reminder_days: string;
}

/**
 * Valid setting keys for firm_settings table
 */
export const FIRM_SETTING_KEYS = [
  'firm_name',
  'tagline',
  'logo_url',
  'primary_color',
  'reply_to_email',
  'footer_text',
  'automation_intake_reminder_enabled',
  'automation_intake_reminder_hours',
  'automation_client_idle_enabled',
  'automation_client_idle_days',
  'automation_lawyer_idle_enabled',
  'automation_lawyer_idle_days',
  'automation_invoice_reminder_enabled',
  'automation_invoice_reminder_days',
] as const;

export type FirmSettingKey = typeof FIRM_SETTING_KEYS[number];

/**
 * Default values for firm settings
 */
export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  firm_name: 'MatterFlow',
  tagline: 'Workflow-first legal practice system',
  logo_url: null,
  primary_color: '#1e293b',
  reply_to_email: null,
  footer_text: null,
  // Automation settings
  automation_intake_reminder_enabled: 'true',
  automation_intake_reminder_hours: '24',
  automation_client_idle_enabled: 'true',
  automation_client_idle_days: '3',
  automation_lawyer_idle_enabled: 'true',
  automation_lawyer_idle_days: '7',
  automation_invoice_reminder_enabled: 'true',
  automation_invoice_reminder_days: '3,7,14',
};
