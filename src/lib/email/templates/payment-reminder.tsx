import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

export type ReminderType = "first" | "due_date" | "overdue";

interface PaymentReminderEmailProps {
  clientName: string;
  matterTitle: string;
  invoiceAmount: string;
  dueDate: string;
  daysOverdue?: number;
  paymentLink?: string;
  invoiceNumber?: string;
  reminderType: ReminderType;
  settings?: FirmSettings;
}

function getHeading(reminderType: ReminderType, daysOverdue?: number): string {
  switch (reminderType) {
    case "first":
      return "Payment Reminder";
    case "due_date":
      return "Payment Due Today";
    case "overdue":
      return daysOverdue && daysOverdue > 14
        ? "URGENT: Payment Overdue"
        : "Payment Overdue";
  }
}

function getPreview(reminderType: ReminderType, matterTitle: string, invoiceAmount: string): string {
  switch (reminderType) {
    case "first":
      return `Payment reminder for ${matterTitle} - ${invoiceAmount}`;
    case "due_date":
      return `Payment due today for ${matterTitle} - ${invoiceAmount}`;
    case "overdue":
      return `Payment overdue for ${matterTitle} - ${invoiceAmount}`;
  }
}

export const PaymentReminderEmail = ({
  clientName,
  matterTitle,
  invoiceAmount,
  dueDate,
  daysOverdue,
  paymentLink,
  invoiceNumber,
  reminderType,
  settings,
}: PaymentReminderEmailProps) => (
  <BaseLayout
    preview={getPreview(reminderType, matterTitle, invoiceAmount)}
    heading={getHeading(reminderType, daysOverdue)}
    settings={settings}
  >
    <Text style={paragraph}>Hi {clientName},</Text>

    {reminderType === "first" && (
      <Text style={paragraph}>
        This is a friendly reminder about your upcoming payment for{" "}
        <strong>{matterTitle}</strong>.
      </Text>
    )}

    {reminderType === "due_date" && (
      <Text style={paragraph}>
        Your invoice for <strong>{matterTitle}</strong> is due today.
        Please arrange payment at your earliest convenience.
      </Text>
    )}

    {reminderType === "overdue" && (
      <Text style={paragraph}>
        Your invoice for <strong>{matterTitle}</strong> is{" "}
        <strong>{daysOverdue} {daysOverdue === 1 ? "day" : "days"} overdue</strong>.
        Please arrange payment as soon as possible to avoid any disruption to your matter.
      </Text>
    )}

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
      {reminderType === "overdue" && daysOverdue && (
        <Text style={detailRow}>
          <strong>Days Overdue:</strong> {daysOverdue}
        </Text>
      )}
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

export default PaymentReminderEmail;

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
