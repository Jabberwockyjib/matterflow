/**
 * Square Integration
 *
 * Public exports for Square payment processing and invoice management.
 */

// Client
export {
  createSquareClient,
  getSquareLocationId,
  isSquareConfigured,
  getSquareWebhookSignatureKey,
  isProductionMode,
} from "./client";

// Types
export type {
  SquareInvoiceStatus,
  SquarePaymentStatus,
  SquareLineItem,
  SquareInvoiceRecipient,
  SquareInvoicePaymentRequest,
  CreateSquareInvoiceParams,
  SquareInvoiceResult,
  SquarePaymentWebhook,
  SquareWebhookEvent,
  SyncSquarePaymentResult,
  Result,
} from "./types";

// Invoice operations
export {
  createSquareInvoice,
  getSquareInvoice,
  cancelSquareInvoice,
  convertLineItemsToSquare,
  isInvoiceSynced,
} from "./invoices";

// Server actions
export {
  syncInvoiceToSquare,
  syncSquarePaymentStatus,
  getSquarePaymentUrl,
  checkSquareConfiguration,
} from "./actions";
