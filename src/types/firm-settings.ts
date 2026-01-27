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
};
