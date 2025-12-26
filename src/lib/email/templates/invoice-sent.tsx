import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface InvoiceSentEmailProps {
  clientName: string;
  matterTitle: string;
  invoiceAmount: string;
  dueDate: string;
  paymentLink?: string;
  invoiceNumber?: string;
}

export const InvoiceSentEmail = ({
  clientName,
  matterTitle,
  invoiceAmount,
  dueDate,
  paymentLink,
  invoiceNumber,
}: InvoiceSentEmailProps) => (
  <BaseLayout
    preview={`Invoice for ${matterTitle} - ${invoiceAmount}`}
    heading="New Invoice"
  >
    <Text style={paragraph}>Hi {clientName},</Text>
    <Text style={paragraph}>
      An invoice has been generated for your matter: <strong>{matterTitle}</strong>
    </Text>

    <div style={invoiceDetails}>
      {invoiceNumber && (
        <Text style={detailRow}>
          <strong>Invoice #:</strong> {invoiceNumber}
        </Text>
      )}
      <Text style={detailRow}>
        <strong>Amount:</strong> {invoiceAmount}
      </Text>
      <Text style={detailRow}>
        <strong>Due Date:</strong> {dueDate}
      </Text>
    </div>

    {paymentLink && (
      <>
        <Text style={paragraph}>Click the button below to view and pay your invoice:</Text>
        <Button href={paymentLink} style={button}>
          View & Pay Invoice
        </Button>
      </>
    )}

    <Text style={paragraph}>
      If you have any questions about this invoice, please don&apos;t hesitate to reach out.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      Your Legal Team
    </Text>
  </BaseLayout>
);

export default InvoiceSentEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const invoiceDetails = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
  margin: "24px 0",
};
