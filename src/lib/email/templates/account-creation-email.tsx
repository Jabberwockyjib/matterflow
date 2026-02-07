/**
 * Account Creation Email Template
 *
 * Sent to anonymous clients after their intake is approved,
 * prompting them to create an account to track their matter.
 */

import {
  Button,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface AccountCreationEmailProps {
  clientName: string;
  matterTitle: string;
  lawyerName: string;
  signUpLink: string;
  settings?: FirmSettings;
}

export const AccountCreationEmail = ({
  clientName = "Client",
  matterTitle = "General Matter",
  lawyerName = "Your Lawyer",
  signUpLink = "https://app.matterflow.com/auth/sign-up",
  settings,
}: AccountCreationEmailProps) => {
  return (
    <BaseLayout
      preview={`Your intake has been approved - create your account`}
      heading="Your Intake Has Been Approved"
      settings={settings}
    >
      <Text style={textStyle}>Hi {clientName},</Text>

      <Text style={textStyle}>
        Great news! <strong>{lawyerName}</strong> has reviewed and approved your
        intake form for <strong>{matterTitle}</strong>.
      </Text>

      <Text style={textStyle}>
        Create your account to stay connected and track your matter&apos;s progress:
      </Text>

      <Section style={benefitsBoxStyle}>
        <Text style={benefitItemStyle}>Track your matter&apos;s progress in real time</Text>
        <Text style={benefitItemStyle}>Communicate securely with your lawyer</Text>
        <Text style={benefitItemStyle}>Complete tasks and upload documents</Text>
        <Text style={benefitItemStyle}>View invoices and make payments</Text>
      </Section>

      <Section style={buttonContainerStyle}>
        <Button style={buttonStyle} href={signUpLink}>
          Create Your Account
        </Button>
      </Section>

      <Hr style={hrStyle} />

      <Text style={footerTextStyle}>
        If you don&apos;t want to create an account right now, no action is needed.
        Your lawyer will continue to work on your matter and can reach you by email.
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

const benefitsBoxStyle = {
  backgroundColor: "#f0f9ff",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "24px",
};

const benefitItemStyle = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#1e40af",
  marginBottom: "4px",
  marginTop: "4px",
  paddingLeft: "8px",
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

const footerTextStyle = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#737373",
  marginBottom: "8px",
};

const footerStyle = {
  fontSize: "14px",
  color: "#737373",
  marginTop: "32px",
};

export default AccountCreationEmail;
