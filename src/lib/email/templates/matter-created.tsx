import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface MatterCreatedEmailProps {
  clientName: string;
  matterTitle: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  intakeLink: string;
}

export const MatterCreatedEmail = ({
  clientName,
  matterTitle,
  matterType,
  lawyerName,
  intakeLink,
}: MatterCreatedEmailProps) => (
  <BaseLayout
    preview={`Complete your intake form for ${matterTitle}`}
    heading="Complete Your Intake Form"
  >
    <Text style={paragraph}>Hi {clientName},</Text>
    <Text style={paragraph}>
      Welcome! We&apos;re ready to start working on your {matterType}.
    </Text>

    <Text style={paragraph}>
      To get started, please complete your intake form. This helps us understand your situation
      and provide the best possible service.
    </Text>

    <div style={infoBox}>
      <Text style={infoTitle}>What to expect:</Text>
      <Text style={infoItem}>• Takes about 10-15 minutes</Text>
      <Text style={infoItem}>• You can save your progress anytime</Text>
      <Text style={infoItem}>• We&apos;ll review it within 2 business days</Text>
    </div>

    <Button href={intakeLink} style={button}>
      Complete Intake Form
    </Button>

    <Text style={paragraph}>
      Questions? Reply to this email or contact {lawyerName} directly.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      {lawyerName}
    </Text>
  </BaseLayout>
);

export default MatterCreatedEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const infoBox = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0",
};

const infoTitle = {
  color: "#1e293b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const infoItem = {
  color: "#475569",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
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
