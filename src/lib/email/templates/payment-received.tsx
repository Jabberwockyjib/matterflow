/**
 * Payment Received Email Template
 *
 * Sent to client and lawyer when a payment is received via Square
 */

import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface PaymentReceivedEmailProps {
  recipientName: string;
  matterTitle: string;
  invoiceAmount: string;
  paymentAmount: string;
  paymentDate: string;
  invoiceNumber?: string;
  isClient: boolean;
}

export const PaymentReceivedEmail = ({
  recipientName,
  matterTitle,
  invoiceAmount,
  paymentAmount,
  paymentDate,
  invoiceNumber,
  isClient,
}: PaymentReceivedEmailProps) => (
  <BaseLayout
    preview={`Payment received - ${paymentAmount}`}
    heading="Payment Received"
  >
    <Text style={paragraph}>Hi {recipientName},</Text>

    {isClient ? (
      <Text style={paragraph}>
        Thank you! We have received your payment for <strong>{matterTitle}</strong>.
      </Text>
    ) : (
      <Text style={paragraph}>
        A payment has been received for matter <strong>{matterTitle}</strong>.
      </Text>
    )}

    <div style={paymentDetails}>
      {invoiceNumber && (
        <Text style={detailRow}>
          <strong>Invoice #:</strong> {invoiceNumber}
        </Text>
      )}
      <Text style={detailRow}>
        <strong>Invoice Amount:</strong> {invoiceAmount}
      </Text>
      <Text style={detailRow}>
        <strong>Payment Received:</strong> {paymentAmount}
      </Text>
      <Text style={detailRow}>
        <strong>Payment Date:</strong> {paymentDate}
      </Text>
    </div>

    <div style={successBadge}>
      <Text style={successText}>Payment Confirmed</Text>
    </div>

    {isClient ? (
      <Text style={paragraph}>
        A receipt has been sent to your email. If you have any questions, please don&apos;t
        hesitate to reach out.
      </Text>
    ) : (
      <Text style={paragraph}>
        The invoice status has been automatically updated. You can view the details in your
        billing dashboard.
      </Text>
    )}

    <Text style={paragraph}>
      Thank you,
      <br />
      {isClient ? "Your Legal Team" : "MatterFlow"}
    </Text>
  </BaseLayout>
);

export default PaymentReceivedEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const paymentDetails = {
  backgroundColor: "#f0fdf4",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #10b981",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};

const successBadge = {
  backgroundColor: "#10b981",
  borderRadius: "6px",
  padding: "12px 20px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const successText = {
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
};
