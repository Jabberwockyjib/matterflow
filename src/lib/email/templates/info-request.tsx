/**
 * Info Request Email Template
 *
 * Sent to clients when lawyer requests additional information
 */

import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface InfoRequestEmailProps {
  clientName: string;
  lawyerName: string;
  message?: string;
  responseUrl: string;
  deadline?: string;
}

export const InfoRequestEmail = ({
  clientName,
  lawyerName,
  message,
  responseUrl,
  deadline,
}: InfoRequestEmailProps) => (
  <BaseLayout
    preview="Additional information needed for your matter"
    heading="Additional Information Needed"
  >
    <Text style={paragraph}>Hi {clientName},</Text>

    <Text style={paragraph}>
      I need some additional information to move forward with your matter.
    </Text>

    {message && (
      <div style={messageBox}>
        <Text style={messageTitle}>Message from {lawyerName}:</Text>
        <Text style={messageText}>{message}</Text>
      </div>
    )}

    <Text style={paragraph}>
      Please click the button below to provide the requested information. This will help us
      continue working on your case efficiently.
    </Text>

    <Button href={responseUrl} style={button}>
      Provide Additional Information
    </Button>

    {deadline && (
      <Text style={deadlineText}>
        Please respond by <strong>{deadline}</strong> if possible.
      </Text>
    )}

    <Text style={paragraph}>
      If you have any questions about what information is needed, please don&apos;t hesitate
      to reach out.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      {lawyerName}
    </Text>
  </BaseLayout>
);

export default InfoRequestEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const messageBox = {
  backgroundColor: "#eff6ff",
  borderLeft: "4px solid #2563eb",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0",
};

const messageTitle = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const messageText = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
  fontStyle: "italic",
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

const deadlineText = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0",
  textAlign: "center" as const,
};
