/**
 * Email Template Placeholder Token Definitions
 *
 * Defines all available placeholder tokens that can be used in email templates.
 * Tokens are replaced with real data at send time using the syntax {{tokenName}}.
 */

import type { EmailTemplateType } from "./types";

// ============================================================================
// Placeholder Token Types
// ============================================================================

/**
 * Categories for organizing placeholder tokens
 */
export type PlaceholderCategory =
  | "practice"
  | "client"
  | "matter"
  | "invoice"
  | "task"
  | "system";

/**
 * A placeholder token that can be used in email templates
 */
export interface PlaceholderToken {
  /** The token name used in templates (e.g., "clientName" for {{clientName}}) */
  token: string;
  /** Human-readable label for the token */
  label: string;
  /** Description of what the token will be replaced with */
  description: string;
  /** Category for grouping tokens in the UI */
  category: PlaceholderCategory;
}

// ============================================================================
// Placeholder Token Definitions
// ============================================================================

/**
 * All available placeholder tokens organized by category
 */
export const PLACEHOLDER_TOKENS: PlaceholderToken[] = [
  // Practice tokens
  {
    token: "practiceName",
    label: "Practice Name",
    description: "The name of the law practice",
    category: "practice",
  },
  {
    token: "practiceLogo",
    label: "Practice Logo",
    description: "The practice logo image (HTML img tag)",
    category: "practice",
  },
  {
    token: "practiceEmail",
    label: "Practice Email",
    description: "The contact email for the practice",
    category: "practice",
  },
  {
    token: "practicePhone",
    label: "Practice Phone",
    description: "The contact phone number for the practice",
    category: "practice",
  },
  {
    token: "practiceAddress",
    label: "Practice Address",
    description: "The mailing address for the practice",
    category: "practice",
  },

  // Client tokens
  {
    token: "clientName",
    label: "Client Name",
    description: "The full name of the client",
    category: "client",
  },
  {
    token: "clientEmail",
    label: "Client Email",
    description: "The email address of the client",
    category: "client",
  },

  // Matter tokens
  {
    token: "matterTitle",
    label: "Matter Title",
    description: "The title of the matter",
    category: "matter",
  },
  {
    token: "matterType",
    label: "Matter Type",
    description: "The type of matter (e.g., Contract Review, Employment)",
    category: "matter",
  },
  {
    token: "lawyerName",
    label: "Lawyer Name",
    description: "The name of the responsible lawyer",
    category: "matter",
  },

  // Invoice tokens
  {
    token: "invoiceAmount",
    label: "Invoice Amount",
    description: "The total amount due on the invoice",
    category: "invoice",
  },
  {
    token: "invoiceNumber",
    label: "Invoice Number",
    description: "The unique invoice reference number",
    category: "invoice",
  },
  {
    token: "dueDate",
    label: "Due Date",
    description: "The payment due date for the invoice",
    category: "invoice",
  },
  {
    token: "paymentLink",
    label: "Payment Link",
    description: "The URL where the client can pay the invoice",
    category: "invoice",
  },

  // Task tokens
  {
    token: "taskTitle",
    label: "Task Title",
    description: "The title of the task",
    category: "task",
  },
  {
    token: "taskLink",
    label: "Task Link",
    description: "The URL to view or complete the task",
    category: "task",
  },
  {
    token: "intakeLink",
    label: "Intake Link",
    description: "The URL to the client intake form",
    category: "task",
  },

  // System tokens
  {
    token: "currentYear",
    label: "Current Year",
    description: "The current year (e.g., 2024)",
    category: "system",
  },
];

// ============================================================================
// Token Names by Category (for building availability maps)
// ============================================================================

/** All practice-related token names */
const PRACTICE_TOKENS = [
  "practiceName",
  "practiceLogo",
  "practiceEmail",
  "practicePhone",
  "practiceAddress",
];

/** All client-related token names */
const CLIENT_TOKENS = ["clientName", "clientEmail"];

/** All invoice-related token names */
const INVOICE_TOKENS = ["invoiceAmount", "invoiceNumber", "dueDate", "paymentLink"];

// ============================================================================
// Placeholder Availability by Email Type
// ============================================================================

/**
 * Maps each email template type to the placeholder tokens available for it.
 * This ensures templates only use tokens that will have data at send time.
 */
export const PLACEHOLDER_AVAILABILITY: Record<EmailTemplateType, string[]> = {
  // Matter emails
  matter_created: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "matterType",
    "lawyerName",
    "intakeLink",
    "currentYear",
  ],

  // Billing emails
  invoice_sent: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    ...INVOICE_TOKENS,
    "currentYear",
  ],
  invoice_reminder: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    ...INVOICE_TOKENS,
    "currentYear",
  ],
  payment_received: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "invoiceAmount",
    "invoiceNumber",
    "currentYear",
  ],

  // Task emails
  task_assigned: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "taskTitle",
    "taskLink",
    "currentYear",
  ],
  task_response_submitted: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "taskTitle",
    "taskLink",
    "lawyerName",
    "currentYear",
  ],
  task_approved: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "taskTitle",
    "currentYear",
  ],
  task_revision_requested: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "taskTitle",
    "taskLink",
    "currentYear",
  ],

  // Intake emails
  intake_reminder: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "matterType",
    "intakeLink",
    "currentYear",
  ],
  intake_submitted: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "matterType",
    "lawyerName",
    "currentYear",
  ],
  intake_declined: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "matterType",
    "lawyerName",
    "currentYear",
  ],

  // Activity reminders
  client_activity_reminder: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "currentYear",
  ],
  lawyer_activity_reminder: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "lawyerName",
    "currentYear",
  ],

  // Info request emails
  info_request: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "taskTitle",
    "taskLink",
    "currentYear",
  ],
  info_request_response: [
    ...PRACTICE_TOKENS,
    ...CLIENT_TOKENS,
    "matterTitle",
    "taskTitle",
    "lawyerName",
    "currentYear",
  ],

  // User management
  user_invitation: [
    ...PRACTICE_TOKENS,
    "clientName",
    "clientEmail",
    "currentYear",
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all placeholder tokens available for a specific email type
 */
export function getAvailablePlaceholders(
  emailType: EmailTemplateType
): PlaceholderToken[] {
  const availableTokenNames = PLACEHOLDER_AVAILABILITY[emailType];
  return PLACEHOLDER_TOKENS.filter((token) =>
    availableTokenNames.includes(token.token)
  );
}

/**
 * Get all placeholder tokens NOT available for a specific email type
 */
export function getUnavailablePlaceholders(
  emailType: EmailTemplateType
): PlaceholderToken[] {
  const availableTokenNames = PLACEHOLDER_AVAILABILITY[emailType];
  return PLACEHOLDER_TOKENS.filter(
    (token) => !availableTokenNames.includes(token.token)
  );
}

/**
 * Group placeholder tokens by their category
 */
export function groupPlaceholdersByCategory(
  tokens: PlaceholderToken[]
): Record<PlaceholderCategory, PlaceholderToken[]> {
  const grouped: Record<PlaceholderCategory, PlaceholderToken[]> = {
    practice: [],
    client: [],
    matter: [],
    invoice: [],
    task: [],
    system: [],
  };

  for (const token of tokens) {
    grouped[token.category].push(token);
  }

  return grouped;
}

/**
 * Human-readable labels for placeholder categories
 */
export const PLACEHOLDER_CATEGORY_LABELS: Record<PlaceholderCategory, string> = {
  practice: "Practice",
  client: "Client",
  matter: "Matter",
  invoice: "Invoice",
  task: "Task",
  system: "System",
};

/**
 * Check if a token is available for a given email type
 */
export function isTokenAvailable(
  token: string,
  emailType: EmailTemplateType
): boolean {
  return PLACEHOLDER_AVAILABILITY[emailType].includes(token);
}

/**
 * Find a placeholder token by its token name
 */
export function getPlaceholderByToken(token: string): PlaceholderToken | undefined {
  return PLACEHOLDER_TOKENS.find((t) => t.token === token);
}
