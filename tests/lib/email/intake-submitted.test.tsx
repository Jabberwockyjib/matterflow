import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { IntakeSubmittedEmail } from "@/lib/email/templates/intake-submitted";
import { DEFAULT_FIRM_SETTINGS } from "@/types/firm-settings";

describe("IntakeSubmittedEmail", () => {
  const defaultProps = {
    lawyerName: "Attorney Miller",
    clientName: "Emily Davis",
    formType: "Employment Agreement Intake",
    matterId: "matter-abc123def456",
    reviewLink: "https://app.matterflow.com/admin/intake/intake-123",
  };

  it("renders lawyer name", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    // React Email adds HTML comments between interpolated values
    expect(html).toContain("Hi");
    expect(html).toContain("Attorney Miller");
  });

  it("renders client name", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Emily Davis");
    expect(html).toContain("has submitted their intake form");
  });

  it("renders form type", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Form Type:");
    expect(html).toContain("Employment Agreement Intake");
  });

  it("renders truncated matter ID", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Matter ID:");
    // Matter ID is truncated to first 8 chars and uppercased
    expect(html).toContain("MATTER-A");
  });

  it("includes preview text with client name", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Emily Davis submitted intake form");
  });

  it("renders heading 'Intake Form Submitted'", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Intake Form Submitted");
  });

  it("renders Review Intake Form button", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Review Intake Form");
    expect(html).toContain("https://app.matterflow.com/admin/intake/intake-123");
  });

  it("renders instructions for next steps", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("Please review the submitted information");
    expect(html).toContain("approve the intake to move the matter forward");
  });

  it("renders automated notification footer", async () => {
    const html = await render(<IntakeSubmittedEmail {...defaultProps} />);

    expect(html).toContain("This is an automated notification from MatterFlow");
  });

  describe("default values", () => {
    it("uses default lawyerName when not provided", async () => {
      const html = await render(
        <IntakeSubmittedEmail
          clientName="Test Client"
          formType="General"
          matterId="m123"
          reviewLink="https://example.com"
        />
      );

      // Default is "Counselor" - React Email splits with HTML comments
      expect(html).toContain("Hi");
      expect(html).toContain("Counselor");
    });
  });

  describe("with firm settings", () => {
    it("uses settings when provided", async () => {
      const settings = {
        ...DEFAULT_FIRM_SETTINGS,
        firm_name: "Davis & Partners",
      };

      const html = await render(<IntakeSubmittedEmail {...defaultProps} settings={settings} />);

      expect(html).toContain("Davis &amp; Partners");
    });
  });
});
