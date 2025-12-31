/**
 * Info Response Received Email Template
 *
 * Sent to lawyer when client responds to information request
 */

import { Button, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";

interface InfoResponseReceivedEmailProps {
  lawyerName: string;
  clientName: string;
  matterTitle: string;
  reviewUrl: string;
  questionCount: number;
}

export const InfoResponseReceivedEmail = ({
  lawyerName,
  clientName,
  matterTitle,
  reviewUrl,
  questionCount,
}: InfoResponseReceivedEmailProps) => {
  return (
    <BaseLayout
      preview={`${clientName} has responded to your information request`}
      heading="Client Response Received"
    >
      <Text style={textStyle}>Hi {lawyerName},</Text>

      <Text style={textStyle}>
        <strong>{clientName}</strong> has provided additional information for{" "}
        <strong>{matterTitle}</strong>.
      </Text>

      <Section style={highlightBox}>
        <Text style={highlightLabel}>Questions Answered:</Text>
        <Text style={highlightValue}>{questionCount}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={buttonStyle} href={reviewUrl}>
          Review Responses
        </Button>
      </Section>

      <Hr style={hrStyle} />

      <Text style={textStyle}>
        You can review the client&apos;s responses and continue working on this matter.
      </Text>

      <Text style={footerStyle}>
        This is an automated notification from MatterFlow.
      </Text>
    </BaseLayout>
  );
};

export default InfoResponseReceivedEmail;

// Styles
const textStyle = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#404040",
  marginBottom: "16px",
};

const highlightBox = {
  backgroundColor: "#f0fdf4",
  borderLeft: "4px solid #10b981",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const highlightLabel = {
  fontSize: "14px",
  color: "#166534",
  marginBottom: "8px",
  fontWeight: "600",
};

const highlightValue = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#15803d",
  marginTop: "0",
  marginBottom: "0",
};

const buttonContainer = {
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
