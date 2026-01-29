import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskApprovedEmailProps {
  recipientName: string;
  taskTitle: string;
  matterTitle: string;
  settings?: FirmSettings;
}

export const TaskApprovedEmail = ({
  recipientName,
  taskTitle,
  matterTitle,
  settings,
}: TaskApprovedEmailProps) => (
  <BaseLayout
    preview={`Task completed: ${taskTitle}`}
    heading="Task Completed"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      Great news! Your response for <strong>{taskTitle}</strong> has been
      reviewed and approved.
    </Text>

    <div style={details}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Status:</strong> Completed
      </Text>
    </div>

    <Text style={paragraph}>
      Thank you for your prompt response. If you have any questions, please
      don&apos;t hesitate to reach out.
    </Text>
  </BaseLayout>
);

export default TaskApprovedEmail;

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
  borderLeft: "4px solid #16a34a",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};
