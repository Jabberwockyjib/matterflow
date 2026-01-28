/**
 * Square Webhook Handler
 *
 * Receives payment status updates from Square and syncs them to MatterFlow.
 *
 * Supported events:
 * - invoice.published - Invoice is ready for payment
 * - invoice.paid - Invoice fully paid
 * - invoice.payment_made - Partial or full payment received
 * - invoice.canceled - Invoice canceled
 * - invoice.updated - Invoice details changed
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { syncSquarePaymentStatus } from "@/lib/square/actions";
import { getSquareWebhookSignatureKey } from "@/lib/square/client";
import type { SquarePaymentWebhook } from "@/lib/square/types";

/**
 * Verify Square webhook signature
 *
 * Square signs all webhook requests with HMAC SHA-256.
 * This prevents unauthorized webhook calls.
 */
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  signatureKey: string,
): boolean {
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(body);
  const expectedSignature = hmac.digest("base64");

  return signature === expectedSignature;
}

/**
 * POST /api/webhooks/square
 *
 * Receive and process Square webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature");
    const signatureKey = await getSquareWebhookSignatureKey();

    // Verify webhook signature if signature key is configured
    if (signatureKey) {
      const isValid = verifyWebhookSignature(body, signature, signatureKey);

      if (!isValid) {
        console.error("Invalid Square webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 },
        );
      }
    } else {
      console.warn(
        "SQUARE_WEBHOOK_SIGNATURE_KEY not set. Webhook signature verification skipped.",
      );
    }

    // Parse webhook payload
    const webhook: SquarePaymentWebhook = JSON.parse(body);

    console.log("Received Square webhook:", {
      type: webhook.type,
      eventId: webhook.eventId,
      merchantId: webhook.merchantId,
    });

    // Handle different event types
    const eventType = webhook.type;

    // Extract invoice ID from webhook
    let invoiceId: string | undefined;

    if (webhook.data?.object?.invoice?.id) {
      invoiceId = webhook.data.object.invoice.id;
    }

    if (!invoiceId) {
      console.warn("No invoice ID found in webhook payload");
      return NextResponse.json({ success: true, message: "No invoice ID" });
    }

    // Process relevant events
    switch (eventType) {
      case "invoice.published":
        console.log(`Invoice ${invoiceId} published`);
        // Invoice is ready but not yet paid - no status change needed
        break;

      case "invoice.paid":
        console.log(`Invoice ${invoiceId} fully paid`);
        await syncSquarePaymentStatus(invoiceId);
        break;

      case "invoice.payment_made":
        console.log(`Payment made on invoice ${invoiceId}`);
        await syncSquarePaymentStatus(invoiceId);
        break;

      case "invoice.canceled":
        console.log(`Invoice ${invoiceId} canceled`);
        await syncSquarePaymentStatus(invoiceId);
        break;

      case "invoice.updated":
        console.log(`Invoice ${invoiceId} updated`);
        await syncSquarePaymentStatus(invoiceId);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({
      success: true,
      eventType,
      invoiceId,
    });
  } catch (error) {
    console.error("Error processing Square webhook:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/square
 *
 * Health check endpoint for webhook
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Square webhook endpoint is active",
  });
}
