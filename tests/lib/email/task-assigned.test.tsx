import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { TaskAssignedEmail } from "@/lib/email/templates/task-assigned";
import { DEFAULT_FIRM_SETTINGS } from "@/types/firm-settings";

describe("TaskAssignedEmail", () => {
  const defaultProps = {
    recipientName: "Jane Doe",
    taskTitle: "Sign engagement letter",
    matterTitle: "Employment Agreement Review",
    taskLink: "https://app.matterflow.com/tasks/123",
    isClientTask: true,
  };

  it("renders recipient name", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    // React Email adds HTML comments between interpolated values
    expect(html).toContain("Hi");
    expect(html).toContain("Jane Doe");
  });

  it("renders task title", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    expect(html).toContain("Sign engagement letter");
  });

  it("renders matter title", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    expect(html).toContain("Employment Agreement Review");
  });

  it("includes preview text with task title", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    expect(html).toContain("New task: Sign engagement letter");
  });

  it("renders heading 'You Have a New Task'", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    expect(html).toContain("You Have a New Task");
  });

  it("renders View Task Details button", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    expect(html).toContain("View Task Details");
    expect(html).toContain("https://app.matterflow.com/tasks/123");
  });

  describe("with due date", () => {
    it("renders due date when provided", async () => {
      const html = await render(
        <TaskAssignedEmail {...defaultProps} dueDate="January 30, 2026" />
      );

      expect(html).toContain("Due Date:");
      expect(html).toContain("January 30, 2026");
    });
  });

  describe("without due date", () => {
    it("does not render due date row", async () => {
      const html = await render(<TaskAssignedEmail {...defaultProps} />);

      expect(html).not.toContain("Due Date:");
    });
  });

  describe("client task messaging", () => {
    it("shows client-specific message when isClientTask is true", async () => {
      const html = await render(<TaskAssignedEmail {...defaultProps} isClientTask={true} />);

      expect(html).toContain("Please complete this task at your earliest convenience");
      expect(html).toContain("keep your matter moving forward");
    });

    it("signs off from 'Your Legal Team' for client tasks", async () => {
      const html = await render(<TaskAssignedEmail {...defaultProps} isClientTask={true} />);

      expect(html).toContain("Your Legal Team");
    });
  });

  describe("staff task messaging", () => {
    it("shows staff-specific message when isClientTask is false", async () => {
      const html = await render(<TaskAssignedEmail {...defaultProps} isClientTask={false} />);

      expect(html).toContain("This task has been added to your workflow");
    });

    it("signs off from 'MatterFlow System' for staff tasks", async () => {
      const html = await render(<TaskAssignedEmail {...defaultProps} isClientTask={false} />);

      expect(html).toContain("MatterFlow System");
    });
  });

  it("renders question prompt", async () => {
    const html = await render(<TaskAssignedEmail {...defaultProps} />);

    expect(html).toContain("If you have any questions about this task");
  });

  describe("with firm settings", () => {
    it("uses settings when provided", async () => {
      const settings = {
        ...DEFAULT_FIRM_SETTINGS,
        firm_name: "Johnson Law Group",
      };

      const html = await render(<TaskAssignedEmail {...defaultProps} settings={settings} />);

      expect(html).toContain("Johnson Law Group");
    });
  });
});
