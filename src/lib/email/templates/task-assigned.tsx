import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskAssignedEmailProps {
  recipientName: string;
  taskTitle: string;
  matterTitle: string;
  dueDate?: string;
  taskLink: string;
  isClientTask: boolean;
  settings?: FirmSettings;
}

export const TaskAssignedEmail = ({
  recipientName,
  taskTitle,
  matterTitle,
  dueDate,
  taskLink,
  isClientTask,
  settings,
}: TaskAssignedEmailProps) => (
  <BaseLayout preview={`New task: ${taskTitle}`} heading="You Have a New Task" settings={settings}>
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      A new task has been assigned to you for the matter: <strong>{matterTitle}</strong>
    </Text>

    <div style={taskDetails}>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
      {dueDate && (
        <Text style={detailRow}>
          <strong>Due Date:</strong> {dueDate}
        </Text>
      )}
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
    </div>

    {isClientTask ? (
      <Text style={paragraph}>
        Please complete this task at your earliest convenience to keep your matter moving forward.
      </Text>
    ) : (
      <Text style={paragraph}>This task has been added to your workflow.</Text>
    )}

    <Button href={taskLink} style={button}>
      View Task Details
    </Button>

    <Text style={paragraph}>
      If you have any questions about this task, please don&apos;t hesitate to reach out.
    </Text>

    <Text style={paragraph}>
      Thank you,
      <br />
      {isClientTask ? "Your Legal Team" : "MatterFlow System"}
    </Text>
  </BaseLayout>
);

export default TaskAssignedEmail;

// Styles
const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const taskDetails = {
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
