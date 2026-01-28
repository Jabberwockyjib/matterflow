/**
 * Square Server Actions
 *
 * Server actions integrating Square with Supabase database.
 * These actions handle invoice syncing and payment status updates.
 */

"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  createSquareInvoice,
  getSquareInvoice,
  convertLineItemsToSquare,
  isInvoiceSynced,
} from "./invoices";
import { isSquareConfigured } from "./client";
import type { SyncSquarePaymentResult } from "./types";

export type ActionResult =
  | { ok: true; data?: any }
  | { error: string };

/**
 * Sync a MatterFlow invoice to Square
 *
 * Creates an invoice in Square and stores the Square invoice ID in the database.
 * Should be called when an invoice is marked as "sent".
 *
 * @param invoiceId MatterFlow invoice ID
 * @returns Result with Square invoice details
 */
export async function syncInvoiceToSquare(
  invoiceId: string,
): Promise<ActionResult> {
  if (!(await isSquareConfigured())) {
    return {
      error:
        "Square not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.",
    };
  }

  try {
    const supabase = supabaseAdmin();

    // Fetch the invoice with matter and client details
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(
        `
        *,
        matters:matter_id (
          id,
          title,
          client_id,
          profiles:client_id (
            user_id,
            full_name,
            users:user_id (
              email
            )
          )
        )
      `,
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return { error: "Invoice not found" };
    }

    // Check if already synced
    if (isInvoiceSynced(invoice.square_invoice_id)) {
      return {
        error: "Invoice already synced to Square",
      };
    }

    // Get client email from nested relation
    const matter = invoice.matters as any;
    const clientProfile = matter?.profiles;
    const clientUser = clientProfile?.users;
    const clientEmail = clientUser?.email;
    const clientName = clientProfile?.full_name;

    if (!clientEmail) {
      return {
        error:
          "Cannot sync invoice: client email not found. Ensure matter has a client assigned.",
      };
    }

    // Convert line items to Square format
    const lineItems = convertLineItemsToSquare(
      invoice.line_items as any[],
      "USD",
    );

    // Create invoice in Square
    const result = await createSquareInvoice({
      recipientEmail: clientEmail,
      recipientName: clientName || undefined,
      lineItems,
      dueDate: invoice.due_date || undefined,
      title: `Invoice for ${matter.title}`,
      description: `Legal services for matter: ${matter.title}`,
      matterReference: matter.id,
    });

    if (!result.success || !result.invoiceId) {
      return { error: result.error || "Failed to create Square invoice" };
    }

    // Update MatterFlow invoice with Square details
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        square_invoice_id: result.invoiceId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateError) {
      console.error("Failed to update invoice with Square ID:", updateError);
      return { error: "Created Square invoice but failed to update database" };
    }

    revalidatePath("/billing");
    revalidatePath("/");

    return {
      ok: true,
      data: {
        squareInvoiceId: result.invoiceId,
        paymentUrl: result.publicUrl,
        invoiceNumber: result.invoiceNumber,
      },
    };
  } catch (error) {
    console.error("Error syncing invoice to Square:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync payment status from Square to MatterFlow
 *
 * Called by webhook when payment status changes in Square.
 * Updates invoice status in database based on Square status.
 *
 * @param squareInvoiceId Square invoice ID
 * @returns Result with updated status
 */
export async function syncSquarePaymentStatus(
  squareInvoiceId: string,
): Promise<SyncSquarePaymentResult> {
  if (!(await isSquareConfigured())) {
    return {
      error: "Square not configured",
    };
  }

  try {
    const supabase = supabaseAdmin();

    // Get current invoice details from Square
    const squareResult = await getSquareInvoice(squareInvoiceId);

    if (!squareResult.success) {
      return {
        error: squareResult.error || "Failed to fetch Square invoice",
      };
    }

    // Map Square status to MatterFlow status
    const matterFlowStatus = mapSquareStatusToMatterFlow(squareResult.status!);

    // Get the MatterFlow invoice to check previous status
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id, status, total_cents, matter_id")
      .eq("square_invoice_id", squareInvoiceId)
      .single();

    const previousStatus = existingInvoice?.status;

    // Update invoice in database
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: matterFlowStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("square_invoice_id", squareInvoiceId);

    if (updateError) {
      return { error: "Failed to update invoice status in database" };
    }

    // Send payment confirmation emails when payment is received
    const paymentReceived =
      (matterFlowStatus === "paid" || matterFlowStatus === "partial") &&
      previousStatus !== "paid" &&
      previousStatus !== "partial";

    if (paymentReceived && existingInvoice) {
      try {
        // Get matter and client/lawyer details
        const { data: matter } = await supabase
          .from("matters")
          .select(`
            id,
            title,
            client_id,
            owner_id,
            profiles:client_id (
              full_name,
              user_id
            )
          `)
          .eq("id", existingInvoice.matter_id)
          .single();

        if (matter) {
          const clientProfile = matter.profiles as any;
          const amount = (existingInvoice.total_cents / 100).toFixed(2);
          const paymentDate = new Date().toLocaleDateString();
          const invoiceNumber = existingInvoice.id.substring(0, 8).toUpperCase();

          // Get client email
          if (clientProfile?.user_id) {
            const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(
              clientProfile.user_id
            );

            if (clientUser?.email) {
              const { sendPaymentReceivedEmail } = await import("@/lib/email/actions");
              await sendPaymentReceivedEmail({
                to: clientUser.email,
                recipientName: clientProfile.full_name || "Client",
                matterTitle: matter.title,
                matterId: matter.id,
                invoiceId: existingInvoice.id,
                invoiceAmount: `$${amount}`,
                paymentAmount: `$${amount}`,
                paymentDate,
                invoiceNumber,
                isClient: true,
              });
            }
          }

          // Get lawyer email
          const { data: { user: lawyerUser } } = await supabase.auth.admin.getUserById(
            matter.owner_id
          );
          const { data: lawyerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", matter.owner_id)
            .single();

          if (lawyerUser?.email) {
            const { sendPaymentReceivedEmail } = await import("@/lib/email/actions");
            await sendPaymentReceivedEmail({
              to: lawyerUser.email,
              recipientName: lawyerProfile?.full_name || "Attorney",
              matterTitle: matter.title,
              matterId: matter.id,
              invoiceId: existingInvoice.id,
              invoiceAmount: `$${amount}`,
              paymentAmount: `$${amount}`,
              paymentDate,
              invoiceNumber,
              isClient: false,
            });
          }
        }
      } catch (emailError) {
        console.error("Failed to send payment confirmation emails:", emailError);
        // Don't fail the sync if email fails
      }
    }

    revalidatePath("/billing");
    revalidatePath("/");

    return {
      ok: true,
      invoiceId: squareInvoiceId,
      newStatus: matterFlowStatus,
    };
  } catch (error) {
    console.error("Error syncing payment status from Square:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Square payment URL for an invoice
 *
 * Retrieves the public payment URL from Square if invoice has been synced.
 *
 * @param invoiceId MatterFlow invoice ID
 * @returns Payment URL or error
 */
export async function getSquarePaymentUrl(
  invoiceId: string,
): Promise<ActionResult> {
  if (!(await isSquareConfigured())) {
    return {
      error: "Square not configured",
    };
  }

  try {
    const supabase = supabaseAdmin();

    // Get invoice with Square ID
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("square_invoice_id")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      return { error: "Invoice not found" };
    }

    if (!invoice.square_invoice_id) {
      return {
        error: "Invoice not synced to Square. Sync it first.",
      };
    }

    // Get invoice details from Square
    const result = await getSquareInvoice(invoice.square_invoice_id);

    if (!result.success || !result.publicUrl) {
      return { error: "Failed to get payment URL from Square" };
    }

    return {
      ok: true,
      data: {
        paymentUrl: result.publicUrl,
        status: result.status,
      },
    };
  } catch (error) {
    console.error("Error getting Square payment URL:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Map Square invoice status to MatterFlow invoice status
 */
function mapSquareStatusToMatterFlow(
  squareStatus: string,
): "draft" | "sent" | "paid" | "partial" | "overdue" {
  switch (squareStatus) {
    case "PAID":
      return "paid";
    case "PARTIALLY_PAID":
      return "partial";
    case "UNPAID":
    case "SCHEDULED":
    case "PAYMENT_PENDING":
      return "sent";
    case "DRAFT":
      return "draft";
    case "CANCELED":
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
    case "FAILED":
      return "draft"; // Treat these as draft for simplicity
    default:
      return "sent";
  }
}

/**
 * Check if Square is properly configured
 */
export async function checkSquareConfiguration(): Promise<ActionResult> {
  const configured = await isSquareConfigured();

  if (!configured) {
    return {
      error:
        "Square not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in environment variables.",
    };
  }

  return {
    ok: true,
    data: { configured: true },
  };
}
