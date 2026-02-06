"use server";

import { ActivityReminderEmail } from "./templates/activity-reminder";
import { InfoRequestEmail } from "./templates/info-request";
import { InfoResponseReceivedEmail } from "./templates/info-response-received";
import { IntakeDeclinedEmail } from "./templates/intake-declined";
import { IntakeReminderEmail } from "./templates/intake-reminder";
import { IntakeSubmittedEmail } from "./templates/intake-submitted";
import { InvoiceSentEmail } from "./templates/invoice-sent";
import { PaymentReminderEmail, type ReminderType } from "./templates/payment-reminder";
import { MatterCreatedEmail } from "./templates/matter-created";
import { PaymentReceivedEmail } from "./templates/payment-received";
import { TaskAssignedEmail } from "./templates/task-assigned";
import { TaskResponseSubmittedEmail } from "./templates/task-response-submitted";
import { TaskApprovedEmail } from "./templates/task-approved";
import { TaskRevisionRequestedEmail } from "./templates/task-revision-requested";
import type { EmailSendResult } from "./types";
import { sendTemplateEmail } from "./service";
import { getFirmSettings } from "@/lib/data/queries";

/**
 * Email actions for MatterFlow
 * These are high-level functions that compose templates and send emails
 */

interface SendInvoiceEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  invoiceId: string;
  invoiceAmount: string;
  dueDate: string;
  paymentLink?: string;
  invoiceNumber?: string;
}

export async function sendInvoiceEmail(
  params: SendInvoiceEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = InvoiceSentEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    invoiceAmount: params.invoiceAmount,
    dueDate: params.dueDate,
    paymentLink: params.paymentLink,
    invoiceNumber: params.invoiceNumber,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Invoice for ${params.matterTitle} - ${params.invoiceAmount}`,
    template,
    {
      type: "invoice_sent",
      matterId: params.matterId,
      invoiceId: params.invoiceId,
      recipientRole: "client",
    },
  );
}

interface SendMatterCreatedEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  intakeLink: string;
}

export async function sendMatterCreatedEmail(
  params: SendMatterCreatedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = MatterCreatedEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    matterType: params.matterType,
    lawyerName: params.lawyerName,
    nextAction: params.nextAction,
    intakeLink: params.intakeLink,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Welcome! Your matter "${params.matterTitle}" has been created`,
    template,
    {
      type: "matter_created",
      matterId: params.matterId,
      recipientRole: "client",
    },
  );
}

interface SendTaskAssignedEmailParams {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  matterTitle: string;
  matterId: string;
  dueDate?: string;
  taskLink: string;
  isClientTask: boolean;
}

export async function sendTaskAssignedEmail(
  params: SendTaskAssignedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = TaskAssignedEmail({
    recipientName: params.recipientName,
    taskTitle: params.taskTitle,
    matterTitle: params.matterTitle,
    dueDate: params.dueDate,
    taskLink: params.taskLink,
    isClientTask: params.isClientTask,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `New task: ${params.taskTitle}`,
    template,
    {
      type: "task_assigned",
      matterId: params.matterId,
      taskId: params.taskId,
      recipientRole: params.isClientTask ? "client" : "lawyer",
    },
  );
}

interface SendIntakeReminderEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  intakeLink: string;
  daysWaiting: number;
}

export async function sendIntakeReminderEmail(
  params: SendIntakeReminderEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = IntakeReminderEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    intakeLink: params.intakeLink,
    daysWaiting: params.daysWaiting,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Reminder: Complete your intake form for ${params.matterTitle}`,
    template,
    {
      type: "intake_reminder",
      matterId: params.matterId,
      recipientRole: "client",
    },
  );
}

interface SendActivityReminderEmailParams {
  to: string;
  recipientName: string;
  matterTitle: string;
  matterId: string;
  nextAction: string;
  daysIdle: number;
  matterLink: string;
  isClientReminder: boolean;
}

export async function sendActivityReminderEmail(
  params: SendActivityReminderEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = ActivityReminderEmail({
    recipientName: params.recipientName,
    matterTitle: params.matterTitle,
    nextAction: params.nextAction,
    daysIdle: params.daysIdle,
    matterLink: params.matterLink,
    isClientReminder: params.isClientReminder,
    settings,
  });

  const emailType = params.isClientReminder
    ? "client_activity_reminder"
    : "lawyer_activity_reminder";

  return sendTemplateEmail(
    params.to,
    `Reminder: ${params.matterTitle} needs attention`,
    template,
    {
      type: emailType,
      matterId: params.matterId,
      recipientRole: params.isClientReminder ? "client" : "lawyer",
    },
  );
}

interface SendInvoiceReminderEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  invoiceId: string;
  invoiceAmount: string;
  dueDate: string;
  daysOverdue?: number;
  paymentLink?: string;
  invoiceNumber?: string;
  reminderType: ReminderType;
}

export async function sendInvoiceReminderEmail(
  params: SendInvoiceReminderEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();

  const template = PaymentReminderEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    invoiceAmount: params.invoiceAmount,
    dueDate: params.dueDate,
    daysOverdue: params.daysOverdue,
    paymentLink: params.paymentLink,
    invoiceNumber: params.invoiceNumber,
    reminderType: params.reminderType,
    settings,
  });

  let subject: string;
  switch (params.reminderType) {
    case "first":
      subject = `Payment Reminder: ${params.matterTitle} - ${params.invoiceAmount}`;
      break;
    case "due_date":
      subject = `Payment Due Today: ${params.matterTitle} - ${params.invoiceAmount}`;
      break;
    case "overdue": {
      const urgency = params.daysOverdue && params.daysOverdue > 14 ? "URGENT: " : "";
      subject = `${urgency}Payment Overdue: ${params.matterTitle} - ${params.invoiceAmount}`;
      break;
    }
  }

  return sendTemplateEmail(
    params.to,
    subject,
    template,
    {
      type: "invoice_reminder",
      matterId: params.matterId,
      invoiceId: params.invoiceId,
      recipientRole: "client",
    },
  );
}

interface SendIntakeSubmittedEmailParams {
  to: string;
  lawyerName: string;
  clientName: string;
  formType: string;
  matterId: string;
}

export async function sendIntakeSubmittedEmail(
  params: SendIntakeSubmittedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewLink = `${appUrl}/intake/${params.matterId}`;

  const template = IntakeSubmittedEmail({
    lawyerName: params.lawyerName,
    clientName: params.clientName,
    formType: params.formType,
    matterId: params.matterId,
    reviewLink,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Intake Form Submitted - ${params.clientName}`,
    template,
    {
      type: "intake_submitted",
      matterId: params.matterId,
      recipientRole: "lawyer",
    },
  );
}

interface SendInfoRequestEmailParams {
  to: string;
  clientName: string;
  lawyerName: string;
  matterId: string;
  infoRequestId: string;
  message?: string;
  deadline?: string;
}

export async function sendInfoRequestEmail(
  params: SendInfoRequestEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const responseUrl = `${appUrl}/info-response/${params.infoRequestId}`;

  const template = InfoRequestEmail({
    clientName: params.clientName,
    lawyerName: params.lawyerName,
    message: params.message,
    responseUrl,
    deadline: params.deadline,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Additional Information Needed - ${params.lawyerName}`,
    template,
    {
      type: "info_request",
      matterId: params.matterId,
      recipientRole: "client",
    },
  );
}

interface SendInfoResponseReceivedEmailParams {
  to: string;
  lawyerName: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  infoRequestId: string;
  questionCount: number;
}

export async function sendInfoResponseReceivedEmail(
  params: SendInfoResponseReceivedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewUrl = `${appUrl}/clients/${params.matterId}`;

  const template = InfoResponseReceivedEmail({
    lawyerName: params.lawyerName,
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    reviewUrl,
    questionCount: params.questionCount,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Client Response Received - ${params.clientName}`,
    template,
    {
      type: "info_request_response",
      matterId: params.matterId,
      recipientRole: "lawyer",
    },
  );
}

interface SendPaymentReceivedEmailParams {
  to: string;
  recipientName: string;
  matterTitle: string;
  matterId: string;
  invoiceId: string;
  invoiceAmount: string;
  paymentAmount: string;
  paymentDate: string;
  invoiceNumber?: string;
  isClient: boolean;
}

export async function sendPaymentReceivedEmail(
  params: SendPaymentReceivedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = PaymentReceivedEmail({
    recipientName: params.recipientName,
    matterTitle: params.matterTitle,
    invoiceAmount: params.invoiceAmount,
    paymentAmount: params.paymentAmount,
    paymentDate: params.paymentDate,
    invoiceNumber: params.invoiceNumber,
    isClient: params.isClient,
    settings,
  });

  const subject = params.isClient
    ? `Payment Received - Thank You!`
    : `Payment Received - ${params.matterTitle}`;

  return sendTemplateEmail(params.to, subject, template, {
    type: "payment_received",
    matterId: params.matterId,
    invoiceId: params.invoiceId,
    recipientRole: params.isClient ? "client" : "lawyer",
  });
}

interface SendIntakeDeclinedEmailParams {
  to: string;
  clientName: string;
  matterTitle: string;
  matterId: string;
  lawyerName: string;
  reason: string;
  notes?: string;
}

export async function sendIntakeDeclinedEmail(
  params: SendIntakeDeclinedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const template = IntakeDeclinedEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    lawyerName: params.lawyerName,
    reason: params.reason,
    notes: params.notes,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Update regarding ${params.matterTitle}`,
    template,
    {
      type: "intake_declined",
      matterId: params.matterId,
      recipientRole: "client",
    },
  );
}

interface SendTaskResponseSubmittedEmailParams {
  to: string;
  recipientName: string;
  clientName: string;
  taskTitle: string;
  taskId: string;
  matterTitle: string;
  matterId: string;
  responsePreview?: string;
}

export async function sendTaskResponseSubmittedEmail(
  params: SendTaskResponseSubmittedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dashboardLink = `${appUrl}/dashboard`;

  const template = TaskResponseSubmittedEmail({
    recipientName: params.recipientName,
    clientName: params.clientName,
    taskTitle: params.taskTitle,
    matterTitle: params.matterTitle,
    responsePreview: params.responsePreview,
    dashboardLink,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Client response: ${params.taskTitle}`,
    template,
    {
      type: "task_response_submitted",
      matterId: params.matterId,
      taskId: params.taskId,
      recipientRole: "lawyer",
    },
  );
}

interface SendTaskApprovedEmailParams {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  matterTitle: string;
  matterId: string;
}

export async function sendTaskApprovedEmail(
  params: SendTaskApprovedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();

  const template = TaskApprovedEmail({
    recipientName: params.recipientName,
    taskTitle: params.taskTitle,
    matterTitle: params.matterTitle,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Task completed: ${params.taskTitle}`,
    template,
    {
      type: "task_approved",
      matterId: params.matterId,
      taskId: params.taskId,
      recipientRole: "client",
    },
  );
}

interface SendTaskRevisionRequestedEmailParams {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  matterTitle: string;
  matterId: string;
  revisionNotes: string;
}

export async function sendTaskRevisionRequestedEmail(
  params: SendTaskRevisionRequestedEmailParams,
): Promise<EmailSendResult> {
  const settings = await getFirmSettings();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const taskLink = `${appUrl}/my-matters`;

  const template = TaskRevisionRequestedEmail({
    recipientName: params.recipientName,
    taskTitle: params.taskTitle,
    matterTitle: params.matterTitle,
    revisionNotes: params.revisionNotes,
    taskLink,
    settings,
  });

  return sendTemplateEmail(
    params.to,
    `Action needed: ${params.taskTitle}`,
    template,
    {
      type: "task_revision_requested",
      matterId: params.matterId,
      taskId: params.taskId,
      recipientRole: "client",
    },
  );
}
