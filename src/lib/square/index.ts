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
  isSquareConfiguredSync,
  getSquareWebhookSignatureKey,
  isProductionMode,
  getSquareCredentials,
} from "./client";

export type { SquareCredentials } from "./client";

// OAuth
export {
  getSquareOAuthConfig,
  getSquareAuthUrl,
  exchangeCodeForTokens,
  refreshSquareToken,
  fetchMerchantInfo,
  fetchFirstLocation,
  SQUARE_SCOPES,
} from "./oauth";

export type { SquareOAuthConfig, TokenResponse, MerchantInfo, LocationInfo } from "./oauth";

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
