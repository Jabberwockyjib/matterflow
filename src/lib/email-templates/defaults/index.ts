/**
 * Default Email Templates
 *
 * These templates are seeded into the database on first run.
 * Based on the existing React Email templates in src/lib/email/templates/.
 */

import type { EmailTemplateType, JSONContent } from "../types";

// ============================================================================
// Types
// ============================================================================

export interface DefaultTemplate {
  emailType: EmailTemplateType;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyJson: JSONContent;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple TipTap paragraph node
 */
function p(text: string): JSONContent {
  if (!text) {
    return { type: "paragraph", content: [] };
  }
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

/**
 * Create a TipTap paragraph with mixed content (text and placeholders)
 */
function pMixed(...items: Array<string | { placeholder: string }>): JSONContent {
  const content: JSONContent[] = items.map((item) => {
    if (typeof item === "string") {
      return { type: "text", text: item };
    }
    return {
      type: "placeholder",
      attrs: { token: item.placeholder },
    };
  });
  return { type: "paragraph", content };
}

/**
 * Create a TipTap button node
 */
function button(text: string, hrefPlaceholder: string): JSONContent {
  return {
    type: "button",
    attrs: {
      text,
      href: `{{${hrefPlaceholder}}}`,
    },
  };
}

/**
 * Shorthand for placeholder reference
 */
function ph(token: string): { placeholder: string } {
  return { placeholder: token };
}

// Button style as inline CSS
const BUTTON_STYLE =
  "background-color:#2563eb;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:14px;";

// ============================================================================
// Default Templates
// ============================================================================

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // -------------------------------------------------------------------------
  // Matter Created
  // -------------------------------------------------------------------------
  {
    emailType: "matter_created",
    name: "Matter Created",
    subject: "Complete Your Intake Form for {{matterTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Welcome! We're ready to start working on your {{matterType}}.</p>
<p>To get started, please complete your intake form. This helps us understand your situation and provide the best possible service.</p>
<p><strong>What to expect:</strong></p>
<ul>
<li>Takes about 10-15 minutes</li>
<li>You can save your progress anytime</li>
<li>We'll review it within 2 business days</li>
</ul>
<p><a href="{{intakeLink}}" style="${BUTTON_STYLE}">Complete Intake Form</a></p>
<p>Questions? Reply to this email or contact {{lawyerName}} directly.</p>
<p>Thank you,<br>{{lawyerName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("Welcome! We're ready to start working on your ", ph("matterType"), "."),
        p(""),
        p("To get started, please complete your intake form. This helps us understand your situation and provide the best possible service."),
        p(""),
        p("What to expect:"),
        p("- Takes about 10-15 minutes"),
        p("- You can save your progress anytime"),
        p("- We'll review it within 2 business days"),
        p(""),
        button("Complete Intake Form", "intakeLink"),
        p(""),
        pMixed("Questions? Reply to this email or contact ", ph("lawyerName"), " directly."),
        p(""),
        pMixed("Thank you,"),
        pMixed(ph("lawyerName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Invoice Sent
  // -------------------------------------------------------------------------
  {
    emailType: "invoice_sent",
    name: "Invoice Sent",
    subject: "Invoice {{invoiceNumber}} for {{matterTitle}} - {{invoiceAmount}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>An invoice has been generated for your matter: <strong>{{matterTitle}}</strong></p>
<p><strong>Invoice #:</strong> {{invoiceNumber}}<br>
<strong>Amount:</strong> {{invoiceAmount}}<br>
<strong>Due Date:</strong> {{dueDate}}</p>
<p>Click the button below to view and pay your invoice:</p>
<p><a href="{{paymentLink}}" style="${BUTTON_STYLE}">View & Pay Invoice</a></p>
<p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("An invoice has been generated for your matter: ", ph("matterTitle")),
        p(""),
        pMixed("Invoice #: ", ph("invoiceNumber")),
        pMixed("Amount: ", ph("invoiceAmount")),
        pMixed("Due Date: ", ph("dueDate")),
        p(""),
        p("Click the button below to view and pay your invoice:"),
        p(""),
        button("View & Pay Invoice", "paymentLink"),
        p(""),
        p("If you have any questions about this invoice, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Invoice Reminder
  // -------------------------------------------------------------------------
  {
    emailType: "invoice_reminder",
    name: "Invoice Reminder",
    subject: "Reminder: Invoice {{invoiceNumber}} is Due - {{invoiceAmount}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>This is a friendly reminder that your invoice for <strong>{{matterTitle}}</strong> is due.</p>
<p><strong>Invoice #:</strong> {{invoiceNumber}}<br>
<strong>Amount Due:</strong> {{invoiceAmount}}<br>
<strong>Due Date:</strong> {{dueDate}}</p>
<p><a href="{{paymentLink}}" style="${BUTTON_STYLE}">Pay Now</a></p>
<p>If you've already made payment, please disregard this reminder. If you have any questions or concerns, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("This is a friendly reminder that your invoice for ", ph("matterTitle"), " is due."),
        p(""),
        pMixed("Invoice #: ", ph("invoiceNumber")),
        pMixed("Amount Due: ", ph("invoiceAmount")),
        pMixed("Due Date: ", ph("dueDate")),
        p(""),
        button("Pay Now", "paymentLink"),
        p(""),
        p("If you've already made payment, please disregard this reminder. If you have any questions or concerns, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Task Assigned
  // -------------------------------------------------------------------------
  {
    emailType: "task_assigned",
    name: "Task Assigned",
    subject: "New Task: {{taskTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>A new task has been assigned to you for the matter: <strong>{{matterTitle}}</strong></p>
<p><strong>Task:</strong> {{taskTitle}}<br>
<strong>Matter:</strong> {{matterTitle}}</p>
<p>Please complete this task at your earliest convenience to keep your matter moving forward.</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">View Task Details</a></p>
<p>If you have any questions about this task, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("A new task has been assigned to you for the matter: ", ph("matterTitle")),
        p(""),
        pMixed("Task: ", ph("taskTitle")),
        pMixed("Matter: ", ph("matterTitle")),
        p(""),
        p("Please complete this task at your earliest convenience to keep your matter moving forward."),
        p(""),
        button("View Task Details", "taskLink"),
        p(""),
        p("If you have any questions about this task, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Task Response Submitted
  // -------------------------------------------------------------------------
  {
    emailType: "task_response_submitted",
    name: "Task Response Submitted",
    subject: "Client Response: {{taskTitle}}",
    bodyHtml: `<p>Hi {{lawyerName}},</p>
<p><strong>{{clientName}}</strong> has submitted a response for the task: <strong>{{taskTitle}}</strong></p>
<p><strong>Matter:</strong> {{matterTitle}}<br>
<strong>Task:</strong> {{taskTitle}}</p>
<p>Please review the response and approve it or request revisions.</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">Review Response</a></p>
<p>This is an automated notification from {{practiceName}}.</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("lawyerName"), ","),
        p(""),
        pMixed(ph("clientName"), " has submitted a response for the task: ", ph("taskTitle")),
        p(""),
        pMixed("Matter: ", ph("matterTitle")),
        pMixed("Task: ", ph("taskTitle")),
        p(""),
        p("Please review the response and approve it or request revisions."),
        p(""),
        button("Review Response", "taskLink"),
        p(""),
        pMixed("This is an automated notification from ", ph("practiceName"), "."),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Task Approved
  // -------------------------------------------------------------------------
  {
    emailType: "task_approved",
    name: "Task Approved",
    subject: "Task Completed: {{taskTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Great news! Your response for <strong>{{taskTitle}}</strong> has been reviewed and approved.</p>
<p><strong>Matter:</strong> {{matterTitle}}<br>
<strong>Task:</strong> {{taskTitle}}<br>
<strong>Status:</strong> Completed</p>
<p>Thank you for your prompt response. If you have any questions, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("Great news! Your response for ", ph("taskTitle"), " has been reviewed and approved."),
        p(""),
        pMixed("Matter: ", ph("matterTitle")),
        pMixed("Task: ", ph("taskTitle")),
        p("Status: Completed"),
        p(""),
        p("Thank you for your prompt response. If you have any questions, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Task Revision Requested
  // -------------------------------------------------------------------------
  {
    emailType: "task_revision_requested",
    name: "Task Revision Requested",
    subject: "Action Needed: {{taskTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Your response for <strong>{{taskTitle}}</strong> needs some revisions before it can be completed.</p>
<p><strong>Matter:</strong> {{matterTitle}}<br>
<strong>Task:</strong> {{taskTitle}}</p>
<p>Please review the feedback and submit an updated response.</p>
<p><a href="{{taskLink}}" style="background-color:#f59e0b;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:14px;">Update Response</a></p>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("Your response for ", ph("taskTitle"), " needs some revisions before it can be completed."),
        p(""),
        pMixed("Matter: ", ph("matterTitle")),
        pMixed("Task: ", ph("taskTitle")),
        p(""),
        p("Please review the feedback and submit an updated response."),
        p(""),
        button("Update Response", "taskLink"),
        p(""),
        p("If you have any questions, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Intake Reminder
  // -------------------------------------------------------------------------
  {
    emailType: "intake_reminder",
    name: "Intake Reminder",
    subject: "Reminder: Complete Your Intake Form for {{matterTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>We're looking forward to working with you on <strong>{{matterTitle}}</strong>.</p>
<p>To get started, we need you to complete your intake form. This helps us gather all the necessary information to serve you effectively.</p>
<p><a href="{{intakeLink}}" style="${BUTTON_STYLE}">Complete Intake Form</a></p>
<p>If you have any questions or need assistance, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("We're looking forward to working with you on ", ph("matterTitle"), "."),
        p(""),
        p("To get started, we need you to complete your intake form. This helps us gather all the necessary information to serve you effectively."),
        p(""),
        button("Complete Intake Form", "intakeLink"),
        p(""),
        p("If you have any questions or need assistance, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Intake Submitted
  // -------------------------------------------------------------------------
  {
    emailType: "intake_submitted",
    name: "Intake Submitted",
    subject: "Intake Form Submitted: {{matterTitle}}",
    bodyHtml: `<p>Hi {{lawyerName}},</p>
<p><strong>{{clientName}}</strong> has submitted their intake form for review.</p>
<p><strong>Form Type:</strong> {{matterType}}<br>
<strong>Matter:</strong> {{matterTitle}}</p>
<p><a href="{{intakeLink}}" style="${BUTTON_STYLE}">Review Intake Form</a></p>
<p>Please review the submitted information and approve the intake to move the matter forward.</p>
<p>This is an automated notification from {{practiceName}}.</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("lawyerName"), ","),
        p(""),
        pMixed(ph("clientName"), " has submitted their intake form for review."),
        p(""),
        pMixed("Form Type: ", ph("matterType")),
        pMixed("Matter: ", ph("matterTitle")),
        p(""),
        button("Review Intake Form", "intakeLink"),
        p(""),
        p("Please review the submitted information and approve the intake to move the matter forward."),
        p(""),
        pMixed("This is an automated notification from ", ph("practiceName"), "."),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Intake Declined
  // -------------------------------------------------------------------------
  {
    emailType: "intake_declined",
    name: "Intake Declined",
    subject: "Update Regarding {{matterTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Thank you for submitting your intake form for <strong>{{matterTitle}}</strong>. After careful review, we are unable to proceed with this matter at this time.</p>
<p>If you have any questions about this decision or would like to discuss further, please don't hesitate to reach out.</p>
<p>We appreciate your understanding and wish you the best.</p>
<p>Sincerely,<br>{{lawyerName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("Thank you for submitting your intake form for ", ph("matterTitle"), ". After careful review, we are unable to proceed with this matter at this time."),
        p(""),
        p("If you have any questions about this decision or would like to discuss further, please don't hesitate to reach out."),
        p(""),
        p("We appreciate your understanding and wish you the best."),
        p(""),
        p("Sincerely,"),
        pMixed(ph("lawyerName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Client Activity Reminder
  // -------------------------------------------------------------------------
  {
    emailType: "client_activity_reminder",
    name: "Client Activity Reminder",
    subject: "Reminder: {{matterTitle}} Needs Your Attention",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>This is a friendly reminder about your matter: <strong>{{matterTitle}}</strong></p>
<p>We're waiting on your response to move forward with this matter. Please review the next steps and take action as soon as possible.</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">View Matter Details</a></p>
<p>If you have any questions or need assistance, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("This is a friendly reminder about your matter: ", ph("matterTitle")),
        p(""),
        p("We're waiting on your response to move forward with this matter. Please review the next steps and take action as soon as possible."),
        p(""),
        button("View Matter Details", "taskLink"),
        p(""),
        p("If you have any questions or need assistance, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Lawyer Activity Reminder
  // -------------------------------------------------------------------------
  {
    emailType: "lawyer_activity_reminder",
    name: "Lawyer Activity Reminder",
    subject: "Matter Requires Attention: {{matterTitle}}",
    bodyHtml: `<p>Hi {{lawyerName}},</p>
<p>This is a reminder that the following matter needs attention: <strong>{{matterTitle}}</strong></p>
<p>This matter is waiting on your team. Please review and take the necessary action to keep this matter moving forward.</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">View Matter Details</a></p>
<p>This is an automated notification from {{practiceName}}.</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("lawyerName"), ","),
        p(""),
        pMixed("This is a reminder that the following matter needs attention: ", ph("matterTitle")),
        p(""),
        p("This matter is waiting on your team. Please review and take the necessary action to keep this matter moving forward."),
        p(""),
        button("View Matter Details", "taskLink"),
        p(""),
        pMixed("This is an automated notification from ", ph("practiceName"), "."),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Payment Received
  // -------------------------------------------------------------------------
  {
    emailType: "payment_received",
    name: "Payment Received",
    subject: "Payment Received - {{invoiceAmount}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Thank you! We have received your payment for <strong>{{matterTitle}}</strong>.</p>
<p><strong>Invoice #:</strong> {{invoiceNumber}}<br>
<strong>Amount Received:</strong> {{invoiceAmount}}</p>
<p style="background-color:#10b981;color:#ffffff;padding:12px 20px;border-radius:6px;text-align:center;font-weight:600;">Payment Confirmed</p>
<p>A receipt has been sent to your email. If you have any questions, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("Thank you! We have received your payment for ", ph("matterTitle"), "."),
        p(""),
        pMixed("Invoice #: ", ph("invoiceNumber")),
        pMixed("Amount Received: ", ph("invoiceAmount")),
        p(""),
        p("Payment Confirmed"),
        p(""),
        p("A receipt has been sent to your email. If you have any questions, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Info Request
  // -------------------------------------------------------------------------
  {
    emailType: "info_request",
    name: "Information Request",
    subject: "Additional Information Needed for {{matterTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>I need some additional information to move forward with your matter.</p>
<p><strong>Task:</strong> {{taskTitle}}<br>
<strong>Matter:</strong> {{matterTitle}}</p>
<p>Please click the button below to provide the requested information. This will help us continue working on your case efficiently.</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">Provide Additional Information</a></p>
<p>If you have any questions about what information is needed, please don't hesitate to reach out.</p>
<p>Thank you,<br>{{practiceName}}</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        p("I need some additional information to move forward with your matter."),
        p(""),
        pMixed("Task: ", ph("taskTitle")),
        pMixed("Matter: ", ph("matterTitle")),
        p(""),
        p("Please click the button below to provide the requested information. This will help us continue working on your case efficiently."),
        p(""),
        button("Provide Additional Information", "taskLink"),
        p(""),
        p("If you have any questions about what information is needed, please don't hesitate to reach out."),
        p(""),
        p("Thank you,"),
        pMixed(ph("practiceName")),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Info Request Response
  // -------------------------------------------------------------------------
  {
    emailType: "info_request_response",
    name: "Information Request Response",
    subject: "Client Response Received: {{taskTitle}}",
    bodyHtml: `<p>Hi {{lawyerName}},</p>
<p><strong>{{clientName}}</strong> has provided additional information for <strong>{{matterTitle}}</strong>.</p>
<p><strong>Task:</strong> {{taskTitle}}<br>
<strong>Matter:</strong> {{matterTitle}}</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">Review Responses</a></p>
<p>You can review the client's responses and continue working on this matter.</p>
<p>This is an automated notification from {{practiceName}}.</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("lawyerName"), ","),
        p(""),
        pMixed(ph("clientName"), " has provided additional information for ", ph("matterTitle"), "."),
        p(""),
        pMixed("Task: ", ph("taskTitle")),
        pMixed("Matter: ", ph("matterTitle")),
        p(""),
        button("Review Responses", "taskLink"),
        p(""),
        p("You can review the client's responses and continue working on this matter."),
        p(""),
        pMixed("This is an automated notification from ", ph("practiceName"), "."),
      ],
    },
  },

  // -------------------------------------------------------------------------
  // User Invitation
  // -------------------------------------------------------------------------
  {
    emailType: "user_invitation",
    name: "User Invitation",
    subject: "Welcome to {{practiceName}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>You've been invited to join <strong>{{practiceName}}</strong>.</p>
<p>Your account has been created and you can now access your client portal to view your matters, complete tasks, and communicate with your legal team.</p>
<p><a href="{{taskLink}}" style="${BUTTON_STYLE}">Sign In to Your Account</a></p>
<p>If you have any questions, please don't hesitate to reach out to us at {{practiceEmail}}.</p>
<p>Welcome aboard!</p>
<p>The {{practiceName}} Team</p>`,
    bodyJson: {
      type: "doc",
      content: [
        pMixed("Hi ", ph("clientName"), ","),
        p(""),
        pMixed("You've been invited to join ", ph("practiceName"), "."),
        p(""),
        p("Your account has been created and you can now access your client portal to view your matters, complete tasks, and communicate with your legal team."),
        p(""),
        button("Sign In to Your Account", "taskLink"),
        p(""),
        pMixed("If you have any questions, please don't hesitate to reach out to us at ", ph("practiceEmail"), "."),
        p(""),
        p("Welcome aboard!"),
        p(""),
        pMixed("The ", ph("practiceName"), " Team"),
      ],
    },
  },
];

/**
 * Get a default template by email type
 */
export function getDefaultTemplate(emailType: EmailTemplateType): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find((t) => t.emailType === emailType);
}
