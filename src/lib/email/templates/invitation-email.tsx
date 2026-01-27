import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface InvitationEmailProps {
  clientName: string;
  inviteCode: string;
  inviteLink: string;
  lawyerName: string;
  message?: string;
  settings?: FirmSettings;
}

export const InvitationEmail = ({
  clientName,
  inviteCode,
  inviteLink,
  lawyerName,
  message,
  settings,
}: InvitationEmailProps) => (
  <BaseLayout
    preview="Complete your intake form for MatterFlow"
    heading="Complete Your Intake Form"
    settings={settings}
  >
    <Text style={paragraph}>Hi {clientName},</Text>

    {message && (
      <Text style={paragraph}>{message}</Text>
    )}

    <Text style={paragraph}>
      I&apos;ve created a secure intake form for you to complete. Your invitation code is:
    </Text>

    <div style={codeBox}>
      <Text style={codeText}>{inviteCode}</Text>
    </div>

    <Button href={inviteLink} style={button}>
      Complete Your Intake Form
    </Button>

    <Text style={paragraph}>
      Best regards,
      <br />
      {lawyerName}
      <br />
      MatterFlow
    </Text>
  </BaseLayout>
);

export default InvitationEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const codeBox = {
  backgroundColor: "#f1f5f9",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0",
  textAlign: "center" as const,
};

const codeText = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "600",
  fontFamily: "monospace",
  margin: "0",
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
