import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskRevisionRequestedEmailProps {
  recipientName: string;
  taskTitle: string;
  matterTitle: string;
  revisionNotes: string;
  taskLink: string;
  settings?: FirmSettings;
}

export const TaskRevisionRequestedEmail = ({
  recipientName,
  taskTitle,
  matterTitle,
  revisionNotes,
  taskLink,
  settings,
}: TaskRevisionRequestedEmailProps) => (
  <BaseLayout
    preview={`Action needed: ${taskTitle}`}
    heading="Revision Requested"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      Your response for <strong>{taskTitle}</strong> needs some revisions before
      it can be completed.
    </Text>

    <div style={details}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
    </div>

    <div style={notesBox}>
      <Text style={notesLabel}>Revision Notes:</Text>
      <Text style={notesText}>{revisionNotes}</Text>
    </div>

    <Text style={paragraph}>
      Please review the feedback and submit an updated response.
    </Text>

    <Button href={taskLink} style={button}>
      Update Response
    </Button>
  </BaseLayout>
);

export default TaskRevisionRequestedEmail;

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
  borderLeft: "4px solid #f59e0b",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};

const notesBox = {
  backgroundColor: "#fffbeb",
  borderRadius: "6px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const notesLabel = {
  color: "#92400e",
  fontSize: "12px",
  fontWeight: "600" as const,
  textTransform: "uppercase" as const,
  margin: "0 0 8px 0",
};

const notesText = {
  color: "#78350f",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const button = {
  backgroundColor: "#f59e0b",
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
