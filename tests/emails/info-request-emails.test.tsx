/**
 * Info Request Email Templates Tests
 *
 * Tests for InfoRequestEmail and InfoResponseReceivedEmail
 */

import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { InfoRequestEmail } from "@/lib/email/templates/info-request";
import { InfoResponseReceivedEmail } from "@/lib/email/templates/info-response-received";

describe("InfoRequestEmail", () => {
  it("renders with all required props", async () => {
    const html = await render(
      <InfoRequestEmail
        clientName="Jane Doe"
        lawyerName="John Smith"
        responseUrl="https://app.matterflow.com/matters/matter-123/info-request/req-456"
      />
    );

    expect(html).toContain("Jane Doe");
    expect(html).toContain("John Smith");
    expect(html).toContain("Additional Information Needed");
    expect(html).toContain("https://app.matterflow.com/matters/matter-123/info-request/req-456");
  });

  it("includes call-to-action button", async () => {
    const responseUrl = "https://app.matterflow.com/matters/matter-123/info-request/req-456";
    const html = await render(
      <InfoRequestEmail
        clientName="Jane Doe"
        lawyerName="John Smith"
        responseUrl={responseUrl}
      />
    );

    expect(html).toContain("Provide Additional Information");
    expect(html).toContain(responseUrl);
  });

  it("renders personal message when provided", async () => {
    const message = "I need clarification on the employment dates you mentioned.";
    const html = await render(
      <InfoRequestEmail
        clientName="Jane Doe"
        lawyerName="John Smith"
        responseUrl="https://app.matterflow.com/matters/matter-123/info-request/req-456"
        message={message}
      />
    );

    expect(html).toContain(message);
  });

  it("renders deadline when provided", async () => {
    const html = await render(
      <InfoRequestEmail
        clientName="Jane Doe"
        lawyerName="John Smith"
        responseUrl="https://app.matterflow.com/matters/matter-123/info-request/req-456"
        deadline="Friday, January 5, 2025"
      />
    );

    expect(html).toContain("Friday, January 5, 2025");
  });
});

describe("InfoResponseReceivedEmail", () => {
  it("renders with lawyer notification", async () => {
    const html = await render(
      <InfoResponseReceivedEmail
        lawyerName="John Smith"
        clientName="Jane Doe"
        matterTitle="Employment Agreement Review"
        reviewUrl="https://app.matterflow.com/admin/info-requests/req-456"
        questionCount={3}
      />
    );

    expect(html).toContain("John Smith");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("Employment Agreement Review");
    expect(html).toContain("Client Response Received");
  });

  it("shows question count", async () => {
    const html = await render(
      <InfoResponseReceivedEmail
        lawyerName="John Smith"
        clientName="Jane Doe"
        matterTitle="Employment Agreement Review"
        reviewUrl="https://app.matterflow.com/admin/info-requests/req-456"
        questionCount={5}
      />
    );

    expect(html).toContain("5");
  });

  it("includes review button", async () => {
    const reviewUrl = "https://app.matterflow.com/admin/info-requests/req-456";
    const html = await render(
      <InfoResponseReceivedEmail
        lawyerName="John Smith"
        clientName="Jane Doe"
        matterTitle="Employment Agreement Review"
        reviewUrl={reviewUrl}
        questionCount={3}
      />
    );

    expect(html).toContain("Review Responses");
    expect(html).toContain(reviewUrl);
  });
});
