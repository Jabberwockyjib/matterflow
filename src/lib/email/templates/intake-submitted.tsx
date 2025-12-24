/**
 * Intake Submitted Email Template
 *
 * Sent to lawyer when client submits intake form
 */

import {
  Button,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "./base-layout";

interface IntakeSubmittedEmailProps {
  lawyerName: string;
  clientName: string;
  formType: string;
  matterId: string;
  reviewLink: string;
}

export const IntakeSubmittedEmail = ({
  lawyerName = "Counselor",
  clientName = "Jane Doe",
  formType = "Contract Review Intake",
  matterId = "matter-123",
  reviewLink = "https://app.matterflow.com/intake/matter-123",
}: IntakeSubmittedEmailProps) => {
  return (
    <BaseLayout
      preview={`${clientName} submitted intake form`}
      heading="Intake Form Submitted"
    >

      <Text style={textStyle}>Hi {lawyerName},</Text>

      <Text style={textStyle}>
        <strong>{clientName}</strong> has submitted their intake form for review.
      </Text>

      <Section style={infoBoxStyle}>
        <Text style={infoLabelStyle}>Form Type:</Text>
        <Text style={infoValueStyle}>{formType}</Text>

        <Text style={infoLabelStyle}>Matter ID:</Text>
        <Text style={infoValueStyle}>{matterId.substring(0, 8).toUpperCase()}</Text>
      </Section>

      <Section style={buttonContainerStyle}>
        <Button style={buttonStyle} href={reviewLink}>
          Review Intake Form
        </Button>
      </Section>

      <Hr style={hrStyle} />

      <Text style={textStyle}>
        Please review the submitted information and approve the intake to move
        the matter forward.
      </Text>

      <Text style={footerStyle}>
        This is an automated notification from MatterFlow.
      </Text>
    </BaseLayout>
  );
};

const textStyle = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  marginBottom: "16px",
};

const infoBoxStyle = {
  backgroundColor: "#f5f5f5",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const infoLabelStyle = {
  fontSize: "14px",
  color: "#737373",
  marginBottom: "4px",
  marginTop: "12px",
};

const infoValueStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1a1a1a",
  marginTop: "0",
  marginBottom: "0",
};

const buttonContainerStyle = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const buttonStyle = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 32px",
  display: "inline-block",
};

const hrStyle = {
  borderColor: "#e5e5e5",
  margin: "32px 0",
};

const footerStyle = {
  fontSize: "14px",
  color: "#737373",
  marginTop: "32px",
};

export default IntakeSubmittedEmail;
