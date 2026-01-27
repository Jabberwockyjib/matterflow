/**
 * Intake Declined Email Template
 *
 * Sent to clients when their intake form is declined
 */

import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface IntakeDeclinedEmailProps {
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  reason: string;
  notes?: string;
  settings?: FirmSettings;
}

export const IntakeDeclinedEmail = ({
  clientName,
  matterTitle,
  lawyerName,
  reason,
  notes,
  settings,
}: IntakeDeclinedEmailProps) => (
  <BaseLayout
    preview={`Update regarding ${matterTitle}`}
    heading="Matter Update"
    settings={settings}
  >
    <Text style={paragraph}>Hi {clientName},</Text>

    <Text style={paragraph}>
      Thank you for submitting your intake form for <strong>{matterTitle}</strong>.
      After careful review, we are unable to proceed with this matter at this time.
    </Text>

    <div style={reasonBox}>
      <Text style={reasonTitle}>Reason:</Text>
      <Text style={reasonText}>{reason}</Text>
    </div>

    {notes && (
      <div style={notesBox}>
        <Text style={notesTitle}>Additional Notes from {lawyerName}:</Text>
        <Text style={notesText}>{notes}</Text>
      </div>
    )}

    <Text style={paragraph}>
      If you have any questions about this decision or would like to discuss further,
      please don&apos;t hesitate to reach out.
    </Text>

    <Text style={paragraph}>
      We appreciate your understanding and wish you the best.
    </Text>

    <Text style={paragraph}>
      Sincerely,
      <br />
      {lawyerName}
    </Text>
  </BaseLayout>
);

export default IntakeDeclinedEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const reasonBox = {
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #ef4444",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0",
};

const reasonTitle = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const reasonText = {
  color: "#7f1d1d",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const notesBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0",
};

const notesTitle = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const notesText = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
  fontStyle: "italic",
};
