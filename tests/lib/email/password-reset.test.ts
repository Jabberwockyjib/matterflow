import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import React from "react";
import PasswordResetEmail from "@/lib/email/templates/password-reset";

describe("PasswordResetEmail", () => {
  const defaultProps = {
    resetLink: "https://app.example.com/reset-password?token=abc123",
  };

  it("renders with reset link", async () => {
    const html = await render(
      React.createElement(PasswordResetEmail, defaultProps)
    );

    expect(html).toContain("reset-password?token=abc123");
    expect(html).toContain("Reset Password");
    expect(html).toContain("Reset your password");
  });

  it("includes MatterFlow branding", async () => {
    const html = await render(
      React.createElement(PasswordResetEmail, defaultProps)
    );

    expect(html).toContain("MatterFlow");
  });

  it("includes expiration notice", async () => {
    const html = await render(
      React.createElement(PasswordResetEmail, defaultProps)
    );

    expect(html).toContain("expires in 1 hour");
  });

  it("includes safety message for unintended requests", async () => {
    const html = await render(
      React.createElement(PasswordResetEmail, defaultProps)
    );

    // Apostrophe is HTML-encoded as &#x27;
    expect(html).toContain("didn&#x27;t request this");
    expect(html).toContain("safely ignore");
  });

  it("includes preview text", async () => {
    const html = await render(
      React.createElement(PasswordResetEmail, defaultProps)
    );

    expect(html).toContain("Reset your MatterFlow");
  });
});
