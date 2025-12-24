/**
 * Square Invoice Operations
 *
 * Core functions for creating, updating, and managing Square invoices.
 */

import {
  createSquareClient,
  getSquareLocationId,
  isSquareConfigured,
} from "./client";
import type {
  CreateSquareInvoiceParams,
  SquareInvoiceResult,
  SquareLineItem,
  Result,
} from "./types";

/**
 * Create an invoice in Square
 *
 * @param params Invoice creation parameters
 * @returns Result with invoice ID and payment URL
 */
export async function createSquareInvoice(
  params: CreateSquareInvoiceParams,
): Promise<SquareInvoiceResult> {
  if (!isSquareConfigured()) {
    return {
      success: false,
      error:
        "Square not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID in environment variables.",
    };
  }

  try {
    const client = createSquareClient();
    const locationId = getSquareLocationId();

    // Build line items for Square
    const invoiceLineItems = params.lineItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      basePriceMoney: {
        amount: item.basePriceMoney.amount,
        currency: item.basePriceMoney.currency,
      },
      note: item.note,
    }));

    // Create invoice recipient
    const primaryRecipient = {
      emailAddress: params.recipientEmail,
      ...(params.recipientName
        ? {
            givenName: params.recipientName.split(" ")[0],
            familyName: params.recipientName.split(" ").slice(1).join(" "),
          }
        : {}),
    };

    // Build payment request
    const paymentRequests = [
      {
        requestType: "BALANCE" as const,
        dueDate: params.dueDate,
        automaticPaymentSource: "NONE" as const,
        // Add reminder 3 days before due date if due date is set
        ...(params.dueDate
          ? {
              reminders: [
                {
                  relativeScheduledDays: -3,
                  message: "Friendly reminder: your invoice is due in 3 days.",
                },
              ],
            }
          : {}),
      },
    ];

    // Create the invoice
    const response = await client.invoicesApi.createInvoice({
      invoice: {
        locationId,
        primaryRecipient,
        paymentRequests,
        invoiceNumber: params.title || undefined,
        title: params.title,
        description: params.description,
        // Store MatterFlow matter ID in custom fields for reference
        customFields: params.matterReference
          ? [
              {
                label: "Matter Reference",
                value: params.matterReference,
                placement: "ABOVE_LINE_ITEMS" as const,
              },
            ]
          : undefined,
      },
      idempotencyKey: crypto.randomUUID(),
    });

    const invoice = response.result.invoice;

    if (!invoice || !invoice.id) {
      return {
        success: false,
        error: "Failed to create invoice in Square",
      };
    }

    // Publish the invoice to make it payable
    const publishResponse = await client.invoicesApi.publishInvoice(
      invoice.id,
      {
        version: invoice.version!,
        idempotencyKey: crypto.randomUUID(),
      },
    );

    const publishedInvoice = publishResponse.result.invoice;

    return {
      success: true,
      invoiceId: publishedInvoice?.id,
      invoiceNumber: publishedInvoice?.invoiceNumber,
      publicUrl: publishedInvoice?.publicUrl,
      status: publishedInvoice?.status as any,
    };
  } catch (error) {
    console.error("Error creating Square invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get invoice details from Square
 *
 * @param invoiceId Square invoice ID
 * @returns Invoice details
 */
export async function getSquareInvoice(
  invoiceId: string,
): Promise<SquareInvoiceResult> {
  if (!isSquareConfigured()) {
    return {
      success: false,
      error: "Square not configured",
    };
  }

  try {
    const client = createSquareClient();
    const response = await client.invoicesApi.getInvoice(invoiceId);
    const invoice = response.result.invoice;

    if (!invoice) {
      return {
        success: false,
        error: "Invoice not found",
      };
    }

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      publicUrl: invoice.publicUrl,
      status: invoice.status as any,
    };
  } catch (error) {
    console.error("Error fetching Square invoice:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cancel an invoice in Square
 *
 * @param invoiceId Square invoice ID
 * @param version Current invoice version
 * @returns Result
 */
export async function cancelSquareInvoice(
  invoiceId: string,
  version: number,
): Promise<Result> {
  if (!isSquareConfigured()) {
    return {
      ok: false,
      error: "Square not configured",
    };
  }

  try {
    const client = createSquareClient();
    await client.invoicesApi.cancelInvoice(invoiceId, {
      version,
    });

    return { ok: true };
  } catch (error) {
    console.error("Error canceling Square invoice:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Convert MatterFlow line items to Square format
 *
 * @param lineItems Line items from MatterFlow database (JSONB)
 * @param currency Currency code (default: USD)
 * @returns Square-formatted line items
 */
export function convertLineItemsToSquare(
  lineItems: any[],
  currency = "USD",
): SquareLineItem[] {
  return lineItems.map((item) => ({
    name: item.description || item.name || "Service",
    quantity: "1",
    basePriceMoney: {
      amount: BigInt(item.amount_cents || item.amountCents || 0),
      currency,
    },
    note: item.note,
  }));
}

/**
 * Check if an invoice has already been synced to Square
 *
 * @param squareInvoiceId Square invoice ID from database
 * @returns True if already synced
 */
export function isInvoiceSynced(squareInvoiceId: string | null): boolean {
  return Boolean(squareInvoiceId);
}
