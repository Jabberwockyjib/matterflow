/**
 * Email template placeholder renderer
 *
 * Utilities for replacing {{placeholder}} tokens with actual values
 * when sending emails.
 */

/**
 * All possible placeholder keys for email templates.
 * Keys are optional to allow partial data when rendering.
 */
export interface PlaceholderData {
  // Practice information
  practiceName?: string;
  practiceLogo?: string;
  practiceEmail?: string;
  practicePhone?: string;
  practiceAddress?: string;

  // Client information
  clientName?: string;
  clientEmail?: string;

  // Matter information
  matterTitle?: string;
  matterType?: string;
  lawyerName?: string;

  // Invoice information
  invoiceAmount?: string;
  invoiceNumber?: string;
  dueDate?: string;
  paymentLink?: string;

  // Task information
  taskTitle?: string;
  taskLink?: string;

  // Intake information
  intakeLink?: string;

  // Date information
  currentYear?: string;

  // Allow additional custom placeholders for extensibility
  [key: string]: string | undefined;
}

/** Regex pattern for matching {{placeholder}} tokens */
const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Replace all {{placeholder}} tokens in a template with values from data.
 *
 * @param template - The template string containing {{placeholder}} tokens
 * @param data - Object with placeholder values
 * @returns The rendered string with placeholders replaced
 *
 * @example
 * ```ts
 * const result = renderEmailWithPlaceholders(
 *   "Hello {{clientName}}, your invoice {{invoiceNumber}} is ready.",
 *   { clientName: "John Doe", invoiceNumber: "INV-001" }
 * );
 * // Returns: "Hello John Doe, your invoice INV-001 is ready."
 * ```
 */
export function renderEmailWithPlaceholders(
  template: string,
  data: PlaceholderData
): string {
  return template.replace(PLACEHOLDER_REGEX, (match, key: string) => {
    const value = data[key];
    // Return empty string for missing values per design spec
    return value !== undefined ? value : "";
  });
}

/**
 * Extract all placeholder token names from a template.
 *
 * @param template - The template string containing {{placeholder}} tokens
 * @returns Array of unique placeholder names found in the template
 *
 * @example
 * ```ts
 * const placeholders = extractPlaceholders(
 *   "Hello {{clientName}}, your matter {{matterTitle}} with {{clientName}}"
 * );
 * // Returns: ["clientName", "matterTitle"]
 * ```
 */
export function extractPlaceholders(template: string): string[] {
  const matches = template.matchAll(PLACEHOLDER_REGEX);
  const placeholders = new Set<string>();

  for (const match of matches) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

/**
 * Validate that all placeholders in a template have corresponding data.
 *
 * @param template - The template string containing {{placeholder}} tokens
 * @param data - Object with placeholder values
 * @returns Object with valid boolean and array of missing placeholder names
 *
 * @example
 * ```ts
 * const result = validatePlaceholders(
 *   "Hello {{clientName}}, invoice {{invoiceNumber}}",
 *   { clientName: "John" }
 * );
 * // Returns: { valid: false, missing: ["invoiceNumber"] }
 * ```
 */
export function validatePlaceholders(
  template: string,
  data: PlaceholderData
): { valid: boolean; missing: string[] } {
  const placeholders = extractPlaceholders(template);
  const missing: string[] = [];

  for (const placeholder of placeholders) {
    const value = data[placeholder];
    if (value === undefined || value === "") {
      missing.push(placeholder);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
