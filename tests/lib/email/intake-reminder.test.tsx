import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { IntakeReminderEmail } from "@/lib/email/templates/intake-reminder";

describe("IntakeReminderEmail", () => {
  const defaultProps = {
    clientName: "Michael Brown",
    matterTitle: "Policy Review",
    intakeLink: "https://app.matterflow.com/intake/matter-789",
    daysWaiting: 3,
  };

  it("renders client name", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    // React Email adds HTML comments between interpolated values
    expect(html).toContain("Hi");
    expect(html).toContain("Michael Brown");
  });

  it("renders matter title", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("Policy Review");
  });

  it("includes preview text about reminder", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("Reminder: Complete your intake form");
  });

  it("renders heading 'Action Required'", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("Action Required: Complete Your Intake Form");
  });

  it("renders Complete Intake Form button", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("Complete Intake Form");
    expect(html).toContain("https://app.matterflow.com/intake/matter-789");
  });

  it("renders looking forward message", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("looking forward to working with you");
  });

  it("explains why intake form is needed", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("we need you to complete your intake form");
    expect(html).toContain("gather all the necessary information");
  });

  describe("days waiting message", () => {
    it("shows days waiting when greater than 0", async () => {
      const html = await render(<IntakeReminderEmail {...defaultProps} daysWaiting={3} />);

      expect(html).toContain("We sent this form");
      expect(html).toContain(">3<");
      // React Email splits "days" and "ago" with HTML comments
      expect(html).toContain(">days<");
      expect(html).toContain("ago");
    });

    it("uses singular 'day' when daysWaiting is 1", async () => {
      const html = await render(<IntakeReminderEmail {...defaultProps} daysWaiting={1} />);

      expect(html).toContain(">1<");
      expect(html).toContain(">day<");
    });

    it("uses plural 'days' when daysWaiting is more than 1", async () => {
      const html = await render(<IntakeReminderEmail {...defaultProps} daysWaiting={5} />);

      expect(html).toContain(">5<");
      expect(html).toContain(">days<");
    });

    it("does not show days waiting message when daysWaiting is 0", async () => {
      const html = await render(<IntakeReminderEmail {...defaultProps} daysWaiting={0} />);

      expect(html).not.toContain("We sent this form");
    });
  });

  it("renders help prompt", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("If you have any questions or need assistance");
  });

  it("signs off from Your Legal Team", async () => {
    const html = await render(<IntakeReminderEmail {...defaultProps} />);

    expect(html).toContain("Thank you");
    expect(html).toContain("Your Legal Team");
  });

  describe("with firm settings", () => {
    it("uses settings when provided", async () => {
      const settings = {
        firm_name: "Williams Law Firm",
        contact_email: "support@williams.com",
      };

      const html = await render(<IntakeReminderEmail {...defaultProps} settings={settings} />);

      expect(html).toContain("Williams Law Firm");
    });
  });
});
