import { z } from "zod";

// ============================================================================
// Common Validation Patterns
// ============================================================================

/**
 * Email validation with user-friendly error messages
 */
export const emailSchema = z
  .string({ error: "Email is required" })
  .min(1, { error: "Email is required" })
  .email({ error: "Please enter a valid email address" });

/**
 * Password validation - minimum 8 characters for security
 */
export const passwordSchema = z
  .string({ error: "Password is required" })
  .min(1, { error: "Password is required" })
  .min(8, { error: "Password must be at least 8 characters" });

/**
 * Required string field with customizable field name
 */
export const requiredString = (fieldName: string) =>
  z.string({ error: `${fieldName} is required` }).min(1, { error: `${fieldName} is required` });

/**
 * Optional string field that transforms empty strings to null
 */
export const optionalString = z
  .string()
  .optional()
  .transform((val) => (val === "" ? null : val));

/**
 * UUID validation for IDs
 */
export const uuidSchema = z.string().uuid({ error: "Invalid ID format" });

/**
 * Required UUID with custom field name
 */
export const requiredUuid = (fieldName: string) =>
  z
    .string({ error: `${fieldName} is required` })
    .min(1, { error: `${fieldName} is required` })
    .uuid({ error: `Invalid ${fieldName.toLowerCase()} format` });

/**
 * Optional UUID that transforms empty strings to null
 */
export const optionalUuid = z
  .string()
  .optional()
  .transform((val) => (val === "" || val === undefined ? null : val))
  .pipe(z.string().uuid({ error: "Invalid ID format" }).nullable());

/**
 * Positive number validation
 */
export const positiveNumber = (fieldName: string) =>
  z
    .number({ error: `${fieldName} must be a number` })
    .positive({ error: `${fieldName} must be greater than 0` });

/**
 * Non-negative number validation
 */
export const nonNegativeNumber = (fieldName: string) =>
  z
    .number({ error: `${fieldName} must be a number` })
    .min(0, { error: `${fieldName} cannot be negative` });

/**
 * Optional positive number (transforms empty/0 to null)
 */
export const optionalPositiveNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((val) => {
    if (val === "" || val === undefined || val === null) return null;
    const num = typeof val === "string" ? parseFloat(val) : val;
    return isNaN(num) || num <= 0 ? null : num;
  });

/**
 * Date string validation
 */
export const dateString = z
  .string()
  .optional()
  .transform((val) => (val === "" ? null : val))
  .refine(
    (val) => {
      if (val === null || val === undefined) return true;
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { error: "Please enter a valid date" }
  );

// ============================================================================
// Enum Values for Select Fields
// ============================================================================

export const billingModelValues = ["hourly", "flat", "hybrid"] as const;
export const responsiblePartyValues = ["lawyer", "client"] as const;
export const taskStatusValues = ["open", "in-progress", "done"] as const;
export const invoiceStatusValues = ["draft", "sent", "paid", "overdue"] as const;
export const timeEntryStatusValues = ["draft", "submitted", "approved", "billed"] as const;

export const matterStageValues = [
  "Lead Created",
  "Intake Sent",
  "Intake Received",
  "Conflict Check",
  "Under Review",
  "Waiting on Client",
  "Draft Ready",
  "Sent to Client",
  "Billing Pending",
  "Completed",
  "Archived",
] as const;

// ============================================================================
// Sign-In Form Schema
// ============================================================================

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignInFormData = z.infer<typeof signInSchema>;

// ============================================================================
// Matter Schemas
// ============================================================================

/**
 * Schema for creating a new matter
 */
export const matterCreateSchema = z.object({
  title: requiredString("Title"),
  matterType: z.string().optional().default("General"),
  billingModel: z.enum(billingModelValues, {
    error: "Please select a billing model",
  }),
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
  nextAction: optionalString,
  ownerId: z.string().optional(),
  clientId: optionalString,
});

export type MatterCreateFormData = z.infer<typeof matterCreateSchema>;

/**
 * Schema for updating matter stage/status
 */
export const matterUpdateSchema = z.object({
  id: requiredUuid("Matter ID"),
  stage: z.enum(matterStageValues, {
    error: "Please select a valid stage",
  }),
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
  nextAction: optionalString,
});

export type MatterUpdateFormData = z.infer<typeof matterUpdateSchema>;

// ============================================================================
// Task Schemas
// ============================================================================

/**
 * Schema for creating a new task
 */
export const taskCreateSchema = z.object({
  title: requiredString("Title"),
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  dueDate: dateString,
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
});

export type TaskCreateFormData = z.infer<typeof taskCreateSchema>;

/**
 * Schema for updating task status
 */
export const taskStatusSchema = z.object({
  id: requiredUuid("Task ID"),
  status: z.enum(taskStatusValues, {
    error: "Please select a valid status",
  }),
});

export type TaskStatusFormData = z.infer<typeof taskStatusSchema>;

// ============================================================================
// Time Entry Schemas
// ============================================================================

/**
 * Schema for creating a new time entry
 */
export const timeEntryCreateSchema = z.object({
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  taskId: optionalString,
  minutes: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return null;
      const num = typeof val === "string" ? parseInt(val, 10) : val;
      return isNaN(num) ? null : num;
    })
    .refine(
      (val) => val === null || val >= 0,
      { error: "Minutes cannot be negative" }
    ),
  description: z.string().optional().default("Manual entry"),
});

export type TimeEntryCreateFormData = z.infer<typeof timeEntryCreateSchema>;

/**
 * Schema for stopping a time entry
 */
export const stopTimeEntrySchema = z.object({
  id: requiredUuid("Time entry ID"),
});

export type StopTimeEntryFormData = z.infer<typeof stopTimeEntrySchema>;

// ============================================================================
// Invoice Schemas
// ============================================================================

/**
 * Schema for creating a new invoice
 */
export const invoiceCreateSchema = z.object({
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => {
      if (val === "" || val === undefined || val === null) return 0;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    })
    .refine(
      (val) => val >= 0,
      { error: "Amount cannot be negative" }
    ),
  status: z.enum(invoiceStatusValues, {
    error: "Please select a valid status",
  }).default("draft"),
});

export type InvoiceCreateFormData = z.infer<typeof invoiceCreateSchema>;

/**
 * Schema for updating invoice status
 */
export const invoiceStatusSchema = z.object({
  id: requiredUuid("Invoice ID"),
  status: z.enum(invoiceStatusValues, {
    error: "Please select a valid status",
  }),
});

export type InvoiceStatusFormData = z.infer<typeof invoiceStatusSchema>;

// ============================================================================
// Validation Helper Types
// ============================================================================

/**
 * Generic form error type for displaying validation errors
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/**
 * Result type for form validation
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: FormErrors<T> };

/**
 * Helper function to validate form data and return errors in a form-friendly format
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: FormErrors<T> = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0];
    if (path && typeof path === "string") {
      errors[path as keyof T] = issue.message;
    }
  }

  return { success: false, errors };
}
