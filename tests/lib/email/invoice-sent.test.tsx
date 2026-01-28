import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { InvoiceSentEmail } from "@/lib/email/templates/invoice-sent";

describe("InvoiceSentEmail", () => {
  const defaultProps = {
    clientName: "John Doe",
    matterTitle: "Contract Review",
    invoiceAmount: "$1,500.00",
    dueDate: "February 15, 2026",
  };

  it("renders client name", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    // React Email adds HTML comments between interpolated values
    expect(html).toContain("Hi");
    expect(html).toContain("John Doe");
  });

  it("renders matter title", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("Contract Review");
  });

  it("renders invoice amount", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("$1,500.00");
  });

  it("renders due date", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("February 15, 2026");
  });

  it("includes preview text with matter and amount", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("Invoice for Contract Review - $1,500.00");
  });

  it("renders heading 'New Invoice'", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("New Invoice");
  });

  describe("with payment link", () => {
    it("renders payment button when paymentLink provided", async () => {
      const html = await render(
        <InvoiceSentEmail {...defaultProps} paymentLink="https://pay.example.com/inv123" />
      );

      expect(html).toContain("View &amp; Pay Invoice");
      expect(html).toContain("https://pay.example.com/inv123");
    });

    it("renders payment instruction text", async () => {
      const html = await render(
        <InvoiceSentEmail {...defaultProps} paymentLink="https://pay.example.com/inv123" />
      );

      expect(html).toContain("Click the button below to view and pay your invoice");
    });
  });

  describe("without payment link", () => {
    it("does not render payment button", async () => {
      const html = await render(<InvoiceSentEmail {...defaultProps} />);

      expect(html).not.toContain("View &amp; Pay Invoice");
    });
  });

  describe("with invoice number", () => {
    it("renders invoice number when provided", async () => {
      const html = await render(<InvoiceSentEmail {...defaultProps} invoiceNumber="INV-2026-001" />);

      expect(html).toContain("Invoice #:");
      expect(html).toContain("INV-2026-001");
    });
  });

  describe("without invoice number", () => {
    it("does not render invoice number row", async () => {
      const html = await render(<InvoiceSentEmail {...defaultProps} />);

      expect(html).not.toContain("Invoice #:");
    });
  });

  it("renders thank you message", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("Thank you");
    expect(html).toContain("Your Legal Team");
  });

  it("renders question prompt", async () => {
    const html = await render(<InvoiceSentEmail {...defaultProps} />);

    expect(html).toContain("If you have any questions about this invoice");
  });

  describe("with firm settings", () => {
    it("uses settings when provided", async () => {
      const settings = {
        firm_name: "Smith & Associates",
        contact_email: "contact@smith.com",
      };

      const html = await render(<InvoiceSentEmail {...defaultProps} settings={settings} />);

      // The base layout should use firm name
      expect(html).toContain("Smith &amp; Associates");
    });
  });
});
