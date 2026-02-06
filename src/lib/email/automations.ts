"use server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getFirmSettings } from "@/lib/data/queries";
import { sendActivityReminderEmail, sendIntakeReminderEmail, sendInvoiceReminderEmail } from "./actions";

/**
 * Email automation functions for MatterFlow
 * These run on a schedule to send reminder emails
 */

interface AutomationResult {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Send intake reminders for matters that have been idle in "Intake Sent" stage
 */
export async function sendIntakeReminders(): Promise<AutomationResult> {
  const result: AutomationResult = { sent: 0, failed: 0, errors: [] };

  try {
    const settings = await getFirmSettings();

    // Check if automation is enabled
    if (settings.automation_intake_reminder_enabled !== "true") {
      return result;
    }

    const hoursThreshold = parseInt(settings.automation_intake_reminder_hours || "24", 10);
    const supabase = supabaseAdmin();
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

    // Find matters in "Intake Sent" stage that haven't been updated within threshold
    const { data: matters, error } = await supabase
      .from("matters")
      .select("id, title, client_id, updated_at")
      .eq("stage", "Intake Sent")
      .lt("updated_at", thresholdDate.toISOString());

    if (error || !matters) {
      result.errors.push(error?.message || "No matters found");
      return result;
    }

    for (const matter of matters) {
      if (!matter.client_id) continue;

      try {
        // Get client details
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", matter.client_id)
          .maybeSingle();

        const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);

        if (clientUser?.email && clientProfile) {
          const daysWaiting = Math.floor(
            (Date.now() - new Date(matter.updated_at).getTime()) / (1000 * 60 * 60 * 24),
          );

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const emailResult = await sendIntakeReminderEmail({
            to: clientUser.email,
            clientName: clientProfile.full_name || "Client",
            matterTitle: matter.title,
            matterId: matter.id,
            intakeLink: `${appUrl}/matters/${matter.id}/intake`,
            daysWaiting,
          });

          if (emailResult.success) {
            result.sent++;
          } else {
            result.failed++;
            result.errors.push(`Failed to send intake reminder for matter ${matter.id}: ${emailResult.error}`);
          }
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`Error processing matter ${matter.id}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }
  } catch (err) {
    result.errors.push(`Fatal error: ${err instanceof Error ? err.message : "Unknown"}`);
  }

  return result;
}

/**
 * Send activity reminders for matters that have been idle for configurable days (client/lawyer)
 */
export async function sendActivityReminders(): Promise<AutomationResult> {
  const result: AutomationResult = { sent: 0, failed: 0, errors: [] };

  try {
    const settings = await getFirmSettings();
    const supabase = supabaseAdmin();

    // Check if client idle automation is enabled
    const clientIdleEnabled = settings.automation_client_idle_enabled === "true";
    const clientIdleDays = parseInt(settings.automation_client_idle_days || "3", 10);
    const clientThreshold = new Date();
    clientThreshold.setDate(clientThreshold.getDate() - clientIdleDays);

    // Check if lawyer idle automation is enabled
    const lawyerIdleEnabled = settings.automation_lawyer_idle_enabled === "true";
    const lawyerIdleDays = parseInt(settings.automation_lawyer_idle_days || "7", 10);
    const lawyerThreshold = new Date();
    lawyerThreshold.setDate(lawyerThreshold.getDate() - lawyerIdleDays);

    // Find matters waiting on client (configurable days idle)
    if (clientIdleEnabled) {
      const { data: clientMatters } = await supabase
        .from("matters")
        .select("id, title, client_id, next_action, updated_at")
        .eq("responsible_party", "client")
        .lt("updated_at", clientThreshold.toISOString())
        .not("stage", "in", '("Completed", "Archived")');

      if (clientMatters) {
        for (const matter of clientMatters) {
          if (!matter.client_id) continue;

          try {
            const { data: clientProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", matter.client_id)
              .maybeSingle();

            const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);

            if (clientUser?.email && clientProfile) {
              const daysIdle = Math.floor(
                (Date.now() - new Date(matter.updated_at).getTime()) / (1000 * 60 * 60 * 24),
              );

              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              const emailResult = await sendActivityReminderEmail({
                to: clientUser.email,
                recipientName: clientProfile.full_name || "Client",
                matterTitle: matter.title,
                matterId: matter.id,
                nextAction: matter.next_action || "Review and respond",
                daysIdle,
                matterLink: `${appUrl}/matters/${matter.id}`,
                isClientReminder: true,
              });

              if (emailResult.success) {
                result.sent++;
              } else {
                result.failed++;
                result.errors.push(`Failed to send client reminder for matter ${matter.id}`);
              }
            }
          } catch (err) {
            result.failed++;
          }
        }
      }
    }

    // Find matters waiting on lawyer (configurable days idle)
    if (lawyerIdleEnabled) {
      const { data: lawyerMatters } = await supabase
        .from("matters")
        .select("id, title, owner_id, next_action, updated_at")
        .eq("responsible_party", "lawyer")
        .lt("updated_at", lawyerThreshold.toISOString())
        .not("stage", "in", '("Completed", "Archived")');

      if (lawyerMatters) {
        for (const matter of lawyerMatters) {
          try {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", matter.owner_id)
              .maybeSingle();

            const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(matter.owner_id);

            if (ownerUser?.email && ownerProfile) {
              const daysIdle = Math.floor(
                (Date.now() - new Date(matter.updated_at).getTime()) / (1000 * 60 * 60 * 24),
              );

              const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
              const emailResult = await sendActivityReminderEmail({
                to: ownerUser.email,
                recipientName: ownerProfile.full_name || "Lawyer",
                matterTitle: matter.title,
                matterId: matter.id,
                nextAction: matter.next_action || "Review matter",
                daysIdle,
                matterLink: `${appUrl}/matters/${matter.id}`,
                isClientReminder: false,
              });

              if (emailResult.success) {
                result.sent++;
              } else {
                result.failed++;
                result.errors.push(`Failed to send lawyer reminder for matter ${matter.id}`);
              }
            }
          } catch (err) {
            result.failed++;
          }
        }
      }
    }
  } catch (err) {
    result.errors.push(`Fatal error: ${err instanceof Error ? err.message : "Unknown"}`);
  }

  return result;
}

/**
 * Send invoice reminders using a 3-phase schedule:
 * 1. First reminder: X days after invoice sent (before due date)
 * 2. Due date reminder: on the due date
 * 3. Overdue reminders: recurring every Y days after due date
 *
 * Uses `last_reminder_sent_at` on invoices to prevent duplicate sends.
 */
export async function sendInvoiceReminders(): Promise<AutomationResult> {
  const result: AutomationResult = { sent: 0, failed: 0, errors: [] };

  try {
    const settings = await getFirmSettings();

    // Check if automation is enabled
    if (settings.automation_invoice_reminder_enabled !== "true") {
      return result;
    }

    const firstReminderDays = parseInt(settings.automation_invoice_first_reminder_days || "15", 10);
    const dueDateReminderEnabled = settings.automation_invoice_due_date_reminder !== "false";
    const overdueFrequencyDays = parseInt(settings.automation_invoice_overdue_frequency_days || "7", 10);

    const supabase = supabaseAdmin();
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Fetch all unpaid invoices with a due date
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, matter_id, total_cents, due_date, square_invoice_id, updated_at, last_reminder_sent_at, created_at")
      .in("status", ["sent", "overdue", "partial"])
      .not("due_date", "is", null);

    if (error || !invoices) {
      result.errors.push(error?.message || "No invoices found");
      return result;
    }

    for (const invoice of invoices) {
      if (!invoice.due_date) continue;

      const dueDate = new Date(invoice.due_date + "T00:00:00Z");
      const daysSinceSent = Math.floor(
        (now.getTime() - new Date(invoice.updated_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const lastReminder = invoice.last_reminder_sent_at
        ? new Date(invoice.last_reminder_sent_at)
        : null;
      const daysSinceLastReminder = lastReminder
        ? Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      let reminderType: "first" | "due_date" | "overdue" | null = null;

      // Phase 1: First reminder (before due date)
      if (
        todayStr < invoice.due_date &&
        daysSinceSent >= firstReminderDays &&
        !lastReminder
      ) {
        reminderType = "first";
      }

      // Phase 2: Due date reminder
      if (
        !reminderType &&
        dueDateReminderEnabled &&
        todayStr >= invoice.due_date &&
        daysOverdue <= 0 &&
        (!lastReminder || lastReminder < dueDate)
      ) {
        reminderType = "due_date";
      }

      // Phase 3: Overdue recurring reminders
      if (
        !reminderType &&
        daysOverdue > 0 &&
        (!lastReminder || (daysSinceLastReminder !== null && daysSinceLastReminder >= overdueFrequencyDays))
      ) {
        reminderType = "overdue";
      }

      if (!reminderType) continue;

      try {
        // Get matter and client details
        const { data: matter } = await supabase
          .from("matters")
          .select("client_id, title")
          .eq("id", invoice.matter_id)
          .maybeSingle();

        if (matter?.client_id) {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", matter.client_id)
            .maybeSingle();

          const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id);

          if (clientUser?.email && clientProfile) {
            const amount = (invoice.total_cents / 100).toFixed(2);
            const emailResult = await sendInvoiceReminderEmail({
              to: clientUser.email,
              clientName: clientProfile.full_name || "Client",
              matterTitle: matter.title,
              matterId: invoice.matter_id,
              invoiceId: invoice.id,
              invoiceAmount: `$${amount}`,
              dueDate: invoice.due_date,
              daysOverdue: reminderType === "overdue" ? daysOverdue : undefined,
              reminderType,
              paymentLink: invoice.square_invoice_id
                ? `https://squareup.com/invoice/${invoice.square_invoice_id}`
                : undefined,
            });

            if (emailResult.success) {
              result.sent++;
              // Update last_reminder_sent_at
              const updateData: Record<string, unknown> = {
                last_reminder_sent_at: now.toISOString(),
              };
              // Mark as overdue if past due date
              if (daysOverdue > 0) {
                updateData.status = "overdue";
              }
              await supabase
                .from("invoices")
                .update(updateData)
                .eq("id", invoice.id);
            } else {
              result.failed++;
              result.errors.push(`Failed to send invoice reminder for invoice ${invoice.id}`);
            }
          }
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`Error processing invoice ${invoice.id}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }
  } catch (err) {
    result.errors.push(`Fatal error: ${err instanceof Error ? err.message : "Unknown"}`);
  }

  return result;
}

/**
 * Run all email automations
 */
export async function runAllAutomations(): Promise<{
  intake: AutomationResult;
  activity: AutomationResult;
  invoices: AutomationResult;
}> {
  const [intake, activity, invoices] = await Promise.all([
    sendIntakeReminders(),
    sendActivityReminders(),
    sendInvoiceReminders(),
  ]);

  return { intake, activity, invoices };
}
