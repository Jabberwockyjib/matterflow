import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskResponseSubmittedEmailProps {
  recipientName: string;
  clientName: string;
  taskTitle: string;
  matterTitle: string;
  responsePreview?: string;
  dashboardLink: string;
  settings?: FirmSettings;
}

export const TaskResponseSubmittedEmail = ({
  recipientName,
  clientName,
  taskTitle,
  matterTitle,
  responsePreview,
  dashboardLink,
  settings,
}: TaskResponseSubmittedEmailProps) => (
  <BaseLayout
    preview={`Client response: ${taskTitle}`}
    heading="Task Response Received"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      <strong>{clientName}</strong> has submitted a response for the task:{" "}
      <strong>{taskTitle}</strong>
    </Text>

    <div style={details}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
      {responsePreview && (
        <Text style={detailRow}>
          <strong>Response:</strong> {responsePreview}
        </Text>
      )}
    </div>

    <Text style={paragraph}>
      Please review the response and approve it or request revisions.
    </Text>

    <Button href={dashboardLink} style={button}>
      Review Response
    </Button>
  </BaseLayout>
);

export default TaskResponseSubmittedEmail;

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const details = {
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
