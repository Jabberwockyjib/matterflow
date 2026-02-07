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
export const taskTypeValues = ["document_upload", "information_request", "confirmation", "general"] as const;
export const taskStatusValues = ["open", "pending_review", "done", "cancelled"] as const;
export const taskResponseStatusValues = ["submitted", "approved", "rejected"] as const;
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
  "Declined",
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
// Sign-Up Form Schema
// ============================================================================

export const signUpSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  fullName: z.string().min(1, "Full name is required").max(100, "Full name too long"),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

// ============================================================================
// Auth Schemas
// ============================================================================

/**
 * Schema for inviting a new user
 */
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name too long'),
  role: z.enum(['admin', 'staff', 'client'], { message: 'Invalid role' }),
});

export type InviteUserFormData = z.infer<typeof inviteUserSchema>;

/**
 * Password requirements - minimum 8 characters with uppercase, lowercase, and number
 */
const passwordRequirements = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Schema for resetting password
 */
export const passwordResetSchema = z
  .object({
    password: passwordRequirements,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

/**
 * Schema for changing password
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRequirements,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Schema for forgot password
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

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
 * Schema for submitting a task response (client-facing)
 */
export const taskResponseSchema = z.object({
  taskId: requiredUuid("Task ID"),
  responseText: optionalString,
  isConfirmation: z.boolean().optional(),
});

export type TaskResponseFormData = z.infer<typeof taskResponseSchema>;

/**
 * Schema for approving a task response (staff/admin)
 */
export const approveTaskResponseSchema = z.object({
  responseId: requiredUuid("Response ID"),
});

/**
 * Schema for rejecting a task response with notes (staff/admin)
 */
export const rejectTaskResponseSchema = z.object({
  responseId: requiredUuid("Response ID"),
  notes: requiredString("Revision notes"),
});

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
// Calendar Event Schemas
// ============================================================================

export const calendarEventTypeValues = [
  "manual",
  "task_due",
  "scheduled_call",
  "deadline",
  "court_date",
  "meeting",
] as const;

/**
 * Schema for creating/updating a calendar event
 */
export const calendarEventSchema = z.object({
  title: requiredString("Title"),
  startTime: z.string().datetime({ message: "Valid start time is required" }),
  endTime: z.string().datetime({ message: "Valid end time is required" }),
  allDay: z.boolean().default(false),
  eventType: z.enum(calendarEventTypeValues, {
    error: "Please select a valid event type",
  }).default("manual"),
  matterId: optionalUuid,
  taskId: optionalUuid,
  description: optionalString,
  location: optionalString,
  color: optionalString,
});

export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;

// ============================================================================
// Intake Response Schemas
// ============================================================================

/**
 * Schema for declining an intake form
 */
export const declineIntakeSchema = z.object({
  intakeResponseId: z.string().uuid(),
  reason: z.enum(['incomplete_info', 'not_good_fit', 'client_unresponsive', 'other']),
  notes: z.string().optional(),
});

export type DeclineIntakeData = z.infer<typeof declineIntakeSchema>;

/**
 * Schema for scheduling a consultation call
 */
export const scheduleCallSchema = z.object({
  intakeResponseId: z.string().uuid(),
  dateTime: z.string().datetime(),
  duration: z.number().int().positive(),
  meetingType: z.enum(['phone', 'video', 'in_person']),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export type ScheduleCallData = z.infer<typeof scheduleCallSchema>;

/**
 * Schema for updating intake response internal notes
 */
export const updateIntakeNotesSchema = z.object({
  intakeResponseId: z.string().uuid(),
  notes: z.string().max(10000, "Notes cannot exceed 10,000 characters"),
});

export type UpdateIntakeNotesData = z.infer<typeof updateIntakeNotesSchema>;

// ============================================================================
// Client Profile Schemas
// ============================================================================

export const phoneTypeValues = ["mobile", "business", "home"] as const;
export const preferredContactMethodValues = ["email", "phone", "text"] as const;

/**
 * Schema for updating client profile contact information
 */
export const updateClientProfileSchema = z.object({
  userId: z.string().uuid({ message: "Invalid user ID" }),
  phone: z.string().optional(),
  phoneType: z.enum(phoneTypeValues).optional(),
  phoneSecondary: z.string().optional(),
  phoneSecondaryType: z.enum(phoneTypeValues).optional(),
  companyName: z.string().optional(),
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressZip: z.string().optional(),
  addressCountry: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  preferredContactMethod: z.enum(preferredContactMethodValues).optional(),
  internalNotes: z.string().max(10000, "Notes cannot exceed 10,000 characters").optional(),
});

export type UpdateClientProfileData = z.infer<typeof updateClientProfileSchema>;

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
