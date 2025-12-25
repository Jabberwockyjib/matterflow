"use server";

import { ActivityReminderEmail } from "./templates/activity-reminder";
import { IntakeReminderEmail } from "./templates/intake-reminder";
import { IntakeSubmittedEmail } from "./templates/intake-submitted";
import { InvoiceSentEmail } from "./templates/invoice-sent";
import { MatterCreatedEmail } from "./templates/matter-created";
import { TaskAssignedEmail } from "./templates/task-assigned";
import type { EmailSendResult } from "./types";
import { sendTemplateEmail } from "./service";

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
  const template = InvoiceSentEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    invoiceAmount: params.invoiceAmount,
    dueDate: params.dueDate,
    paymentLink: params.paymentLink,
    invoiceNumber: params.invoiceNumber,
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
  const template = MatterCreatedEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    matterType: params.matterType,
    lawyerName: params.lawyerName,
    nextAction: params.nextAction,
    intakeLink: params.intakeLink,
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
  const template = TaskAssignedEmail({
    recipientName: params.recipientName,
    taskTitle: params.taskTitle,
    matterTitle: params.matterTitle,
    dueDate: params.dueDate,
    taskLink: params.taskLink,
    isClientTask: params.isClientTask,
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
  const template = IntakeReminderEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    intakeLink: params.intakeLink,
    daysWaiting: params.daysWaiting,
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
  const template = ActivityReminderEmail({
    recipientName: params.recipientName,
    matterTitle: params.matterTitle,
    nextAction: params.nextAction,
    daysIdle: params.daysIdle,
    matterLink: params.matterLink,
    isClientReminder: params.isClientReminder,
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
  daysOverdue: number;
  paymentLink?: string;
}

export async function sendInvoiceReminderEmail(
  params: SendInvoiceReminderEmailParams,
): Promise<EmailSendResult> {
  const urgency = params.daysOverdue > 14 ? "URGENT: " : "";
  const template = InvoiceSentEmail({
    clientName: params.clientName,
    matterTitle: params.matterTitle,
    invoiceAmount: params.invoiceAmount,
    dueDate: `Overdue by ${params.daysOverdue} days`,
    paymentLink: params.paymentLink,
  });

  return sendTemplateEmail(
    params.to,
    `${urgency}Payment Reminder: ${params.matterTitle} - ${params.invoiceAmount}`,
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const reviewLink = `${appUrl}/intake/${params.matterId}`;

  const template = IntakeSubmittedEmail({
    lawyerName: params.lawyerName,
    clientName: params.clientName,
    formType: params.formType,
    matterId: params.matterId,
    reviewLink,
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
