import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import React from "react";
import ActivityReminderEmail from "@/lib/email/templates/activity-reminder";

describe("ActivityReminderEmail", () => {
  const baseProps = {
    recipientName: "John Doe",
    matterTitle: "Contract Review - Acme Corp",
    nextAction: "Review and sign the contract",
    daysIdle: 5,
    matterLink: "https://app.example.com/matters/123",
  };

  describe("client reminder", () => {
    it("renders client-specific content", async () => {
      const html = await render(
        React.createElement(ActivityReminderEmail, {
          ...baseProps,
          isClientReminder: true,
        })
      );

      expect(html).toContain("John Doe");
      expect(html).toContain("Contract Review - Acme Corp");
      expect(html).toContain("Review and sign the contract");
      // React renders numbers and text separately
      expect(html).toContain("5");
      expect(html).toContain("days");
      expect(html).toContain("waiting on your response");
      expect(html).toContain("Your Legal Team");
    });

    it("shows singular day for 1 day idle", async () => {
      const html = await render(
        React.createElement(ActivityReminderEmail, {
          ...baseProps,
          daysIdle: 1,
          isClientReminder: true,
        })
      );

      // React renders the text as separate elements
      expect(html).toContain(">1<");
      expect(html).toContain(">day<");
      expect(html).not.toContain(">days<");
    });
  });

  describe("lawyer reminder", () => {
    it("renders lawyer-specific content", async () => {
      const html = await render(
        React.createElement(ActivityReminderEmail, {
          ...baseProps,
          isClientReminder: false,
        })
      );

      expect(html).toContain("John Doe");
      expect(html).toContain("Contract Review - Acme Corp");
      expect(html).toContain("waiting on your team");
      expect(html).toContain("MatterFlow System");
    });
  });

  it("includes action button with link", async () => {
    const html = await render(
      React.createElement(ActivityReminderEmail, {
        ...baseProps,
        isClientReminder: true,
      })
    );

    expect(html).toContain("View Matter Details");
    expect(html).toContain("matters/123");
  });

  it("includes preview text", async () => {
    const html = await render(
      React.createElement(ActivityReminderEmail, {
        ...baseProps,
        isClientReminder: true,
      })
    );

    expect(html).toContain("Reminder:");
    expect(html).toContain("needs attention");
  });
});
