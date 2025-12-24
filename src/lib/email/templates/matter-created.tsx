import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface MatterCreatedEmailProps {
  clientName: string;
  matterTitle: string;
  matterType: string;
  lawyerName: string;
  nextAction: string;
  matterLink: string;
}

export const MatterCreatedEmail = ({
  clientName,
  matterTitle,
  matterType,
  lawyerName,
  nextAction,
  matterLink,
}: MatterCreatedEmailProps) => (
  <BaseLayout
    preview={`New matter created: ${matterTitle}`}
    heading="Welcome! Your Matter Has Been Created"
  >
    <Text style={paragraph}>Hi {clientName},</Text>
    <Text style={paragraph}>
      We&apos;re excited to work with you! Your matter has been created in our system and we&apos;re
      ready to get started.
    </Text>

    <div style={matterDetails}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Type:</strong> {matterType}
      </Text>
      <Text style={detailRow}>
        <strong>Your Attorney:</strong> {lawyerName}
      </Text>
      <Text style={detailRow}>
        <strong>Next Step:</strong> {nextAction}
      </Text>
    </div>

    <Text style={paragraph}>
      You can track the progress of your matter, upload documents, and communicate with us through
      your client portal.
    </Text>

    <Button href={matterLink} style={button}>
      View Your Matter
    </Button>

    <Text style={paragraph}>
      If you have any questions or need assistance, please don&apos;t hesitate to reach out to{" "}
      {lawyerName}.
    </Text>

    <Text style={paragraph}>
      Thank you for choosing us,
      <br />
      Your Legal Team
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

const matterDetails = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #2563eb",
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
