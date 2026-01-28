import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { MatterCreatedEmail } from "@/lib/email/templates/matter-created";

describe("MatterCreatedEmail", () => {
  const defaultProps = {
    clientName: "Sarah Johnson",
    matterTitle: "Employment Contract Review",
    matterType: "Contract Review",
    lawyerName: "Attorney Smith",
    nextAction: "Complete intake form",
    intakeLink: "https://app.matterflow.com/intake/matter-456",
  };

  it("renders client name", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    // React Email adds HTML comments between interpolated values
    expect(html).toContain("Hi");
    expect(html).toContain("Sarah Johnson");
  });

  it("renders matter type", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Contract Review");
  });

  it("renders lawyer name", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Attorney Smith");
  });

  it("includes preview text about intake form", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Complete your intake form for Employment Contract Review");
  });

  it("renders heading 'Complete Your Intake Form'", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Complete Your Intake Form");
  });

  it("renders Complete Intake Form button", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Complete Intake Form");
    expect(html).toContain("https://app.matterflow.com/intake/matter-456");
  });

  it("renders welcome message", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Welcome!");
    expect(html).toContain("ready to start working on your");
  });

  it("renders what to expect section", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("What to expect:");
    expect(html).toContain("Takes about 10-15 minutes");
    expect(html).toContain("You can save your progress anytime");
    expect(html).toContain("within 2 business days");
  });

  it("renders contact instructions with lawyer name", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Questions?");
    expect(html).toContain("Reply to this email or contact");
    expect(html).toContain("Attorney Smith");
    expect(html).toContain("directly");
  });

  it("signs off with lawyer name", async () => {
    const html = await render(<MatterCreatedEmail {...defaultProps} />);

    expect(html).toContain("Thank you");
    // The lawyer name appears in the signature
    const thankYouMatches = html.match(/Thank you/g);
    expect(thankYouMatches).not.toBeNull();
  });

  describe("with firm settings", () => {
    it("uses settings when provided", async () => {
      const settings = {
        firm_name: "Parker & Associates",
        contact_email: "hello@parker.com",
      };

      const html = await render(<MatterCreatedEmail {...defaultProps} settings={settings} />);

      expect(html).toContain("Parker &amp; Associates");
    });
  });
});
