import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface IntakeReminderEmailProps {
  clientName: string;
  matterTitle: string;
  intakeLink: string;
  daysWaiting: number;
  settings?: FirmSettings;
}

export const IntakeReminderEmail = ({
  clientName,
  matterTitle,
  intakeLink,
  daysWaiting,
  settings,
}: IntakeReminderEmailProps) => (
  <BaseLayout
    preview="Reminder: Complete your intake form"
    heading="Action Required: Complete Your Intake Form"
    settings={settings}
  >
    <Text style={paragraph}>Hi {clientName},</Text>
    <Text style={paragraph}>
      We&apos;re looking forward to working with you on <strong>{matterTitle}</strong>.
    </Text>

    <Text style={paragraph}>
      To get started, we need you to complete your intake form. This helps us gather all the
      necessary information to serve you effectively.
    </Text>

    {daysWaiting > 0 && (
      <Text style={urgentText}>
        We sent this form {daysWaiting} {daysWaiting === 1 ? "day" : "days"} ago and haven&apos;t
        received it yet.
      </Text>
    )}

    <Button href={intakeLink} style={button}>
      Complete Intake Form
    </Button>

    <Text style={paragraph}>
      If you have any questions or need assistance, please don&apos;t hesitate to reach out.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      Your Legal Team
    </Text>
  </BaseLayout>
);

export default IntakeReminderEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const urgentText = {
  color: "#dc2626",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
  fontWeight: "600",
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
