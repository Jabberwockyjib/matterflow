import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface InvitationEmailProps {
  clientName: string;
  matterType: string;
  inviteLink: string;
  lawyerName: string;
  firmName?: string;
  personalNotes?: string;
}

export const InvitationEmail = ({
  clientName,
  matterType,
  inviteLink,
  lawyerName,
  firmName = "MatterFlow",
  personalNotes,
}: InvitationEmailProps) => (
  <BaseLayout
    preview={`Complete your intake form for ${firmName}`}
    heading="Complete Your Intake Form"
  >
    <Text style={paragraph}>Hi {clientName},</Text>

    {personalNotes && (
      <Text style={paragraph}>{personalNotes}</Text>
    )}

    <Text style={paragraph}>
      I&apos;ve created a secure intake form for you to complete. This helps me
      understand your {matterType.toLowerCase()} matter and determine how I
      can best help you.
    </Text>

    <div style={infoBox}>
      <Text style={infoTitle}>Matter Details</Text>
      <Text style={infoItem}><strong>Matter Type:</strong> {matterType}</Text>
      <Text style={infoItem}><strong>Estimated Time:</strong> 10-15 minutes</Text>
      <Text style={infoItem}><strong>Expires:</strong> 7 days</Text>
    </div>

    <Button href={inviteLink} style={button}>
      Complete Your Intake Form
    </Button>

    <Text style={note}>
      This link is secure and expires in 7 days. If you have any questions,
      feel free to reply to this email.
    </Text>

    <Text style={paragraph}>
      Best regards,
      <br />
      {lawyerName}
      <br />
      {firmName}
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

const note = {
  fontSize: "14px",
  color: "#64748b",
  fontStyle: "italic",
  marginTop: "16px",
};
