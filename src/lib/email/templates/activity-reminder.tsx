import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface ActivityReminderEmailProps {
  recipientName: string;
  matterTitle: string;
  nextAction: string;
  daysIdle: number;
  matterLink: string;
  isClientReminder: boolean;
  settings?: FirmSettings;
}

export const ActivityReminderEmail = ({
  recipientName,
  matterTitle,
  nextAction,
  daysIdle,
  matterLink,
  isClientReminder,
  settings,
}: ActivityReminderEmailProps) => (
  <BaseLayout
    preview={`Reminder: ${matterTitle} needs attention`}
    heading="Matter Requires Your Attention"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      This is a friendly reminder about your matter: <strong>{matterTitle}</strong>
    </Text>

    <Text style={urgentText}>
      This matter has been idle for {daysIdle} {daysIdle === 1 ? "day" : "days"}.
    </Text>

    <Text style={paragraph}>
      <strong>Next Action Required:</strong> {nextAction}
    </Text>

    {isClientReminder ? (
      <Text style={paragraph}>
        We&apos;re waiting on your response to move forward with this matter. Please review the
        next steps and take action as soon as possible.
      </Text>
    ) : (
      <Text style={paragraph}>
        This matter is waiting on your team. Please review and take the necessary action to keep
        this matter moving forward.
      </Text>
    )}

    <Button href={matterLink} style={button}>
      View Matter Details
    </Button>

    <Text style={paragraph}>
      If you have any questions or need assistance, please don&apos;t hesitate to reach out.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      {isClientReminder ? "Your Legal Team" : "MatterFlow System"}
    </Text>
  </BaseLayout>
);

export default ActivityReminderEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const urgentText = {
  color: "#ea580c",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
  fontWeight: "600",
  backgroundColor: "#fff7ed",
  padding: "12px 16px",
  borderRadius: "6px",
  border: "1px solid #fed7aa",
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
