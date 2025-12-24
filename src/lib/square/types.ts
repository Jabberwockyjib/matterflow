/**
 * Square Integration Types
 *
 * TypeScript interfaces for Square payment processing and invoice management.
 */

export type SquareInvoiceStatus =
  | "DRAFT"
  | "UNPAID"
  | "SCHEDULED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "CANCELED"
  | "FAILED"
  | "PAYMENT_PENDING";

export type SquarePaymentStatus =
  | "COMPLETED"
  | "APPROVED"
  | "PENDING"
  | "FAILED"
  | "CANCELED";

export interface SquareLineItem {
  name: string;
  quantity: string;
  basePriceMoney: {
    amount: bigint;
    currency: string;
  };
  note?: string;
}

export interface SquareInvoiceRecipient {
  customerId?: string;
  emailAddress?: string;
  givenName?: string;
  familyName?: string;
}

export interface SquareInvoicePaymentRequest {
  requestType?: "BALANCE" | "DEPOSIT" | "INSTALLMENT";
  dueDate?: string; // YYYY-MM-DD
  automaticPaymentSource?: "NONE" | "CARD_ON_FILE" | "BANK_ON_FILE";
  reminders?: Array<{
    relativeScheduledDays: number;
    message?: string;
  }>;
}

export interface CreateSquareInvoiceParams {
  recipientEmail: string;
  recipientName?: string;
  lineItems: SquareLineItem[];
  dueDate?: string;
  title?: string;
  description?: string;
  matterReference?: string; // MatterFlow matter ID for tracking
}

export interface SquareInvoiceResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  publicUrl?: string;
  status?: SquareInvoiceStatus;
  error?: string;
}

export interface SquarePaymentWebhook {
  merchantId: string;
  type: string;
  eventId: string;
  createdAt: string;
  data: {
    type: string;
    id: string;
    object: {
      invoice?: {
        id: string;
        version: number;
        status: SquareInvoiceStatus;
        invoiceNumber?: string;
        publicUrl?: string;
        primaryRecipient?: SquareInvoiceRecipient;
      };
      payment?: {
        id: string;
        status: SquarePaymentStatus;
        amountMoney: {
          amount: bigint;
          currency: string;
        };
        createdAt: string;
      };
    };
  };
}

export interface SquareWebhookEvent {
  type:
    | "invoice.published"
    | "invoice.paid"
    | "invoice.payment_made"
    | "invoice.canceled"
    | "invoice.updated"
    | "payment.created"
    | "payment.updated";
  invoiceId?: string;
  paymentId?: string;
  status?: SquareInvoiceStatus;
  amountPaid?: number; // in cents
}

export interface SyncSquarePaymentResult {
  ok?: boolean;
  error?: string;
  invoiceId?: string;
  newStatus?: string;
  amountPaid?: number;
}

export type Result<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
