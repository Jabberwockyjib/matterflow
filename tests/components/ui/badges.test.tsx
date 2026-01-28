import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageBadge } from "@/components/ui/stage-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoleBadge } from "@/components/ui/role-badge";

// =============================================================================
// StageBadge Tests
// =============================================================================

describe("StageBadge", () => {
  const stages = [
    { stage: "Lead Created", expectedColor: "bg-slate-100" },
    { stage: "Intake Sent", expectedColor: "bg-blue-100" },
    { stage: "Intake Received", expectedColor: "bg-green-100" },
    { stage: "Waiting on Client", expectedColor: "bg-yellow-100" },
    { stage: "Under Review", expectedColor: "bg-purple-100" },
    { stage: "Conflict Check", expectedColor: "bg-purple-100" },
    { stage: "Draft Ready", expectedColor: "bg-indigo-100" },
    { stage: "Sent to Client", expectedColor: "bg-cyan-100" },
    { stage: "Billing Pending", expectedColor: "bg-orange-100" },
    { stage: "Completed", expectedColor: "bg-gray-100" },
    { stage: "Archived", expectedColor: "bg-gray-100" },
  ];

  it.each(stages)("renders '$stage' with correct styling", ({ stage, expectedColor }) => {
    render(<StageBadge stage={stage} />);

    const badge = screen.getByText(stage);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain(expectedColor);
  });

  it("renders unknown stage with default styling", () => {
    render(<StageBadge stage="Unknown Stage" />);

    const badge = screen.getByText("Unknown Stage");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-slate-100");
  });

  it("applies custom className", () => {
    render(<StageBadge stage="Completed" className="custom-class" />);

    const badge = screen.getByText("Completed");
    expect(badge.className).toContain("custom-class");
  });

  it("has correct base styles", () => {
    render(<StageBadge stage="Completed" />);

    const badge = screen.getByText("Completed");
    expect(badge.className).toContain("rounded-full");
    expect(badge.className).toContain("text-xs");
    expect(badge.className).toContain("font-medium");
  });
});

// =============================================================================
// StatusBadge Tests
// =============================================================================

describe("StatusBadge", () => {
  it("renders active status with correct styling", () => {
    render(<StatusBadge status="active" />);

    const badge = screen.getByText("Active");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });

  it("renders inactive status with correct styling", () => {
    render(<StatusBadge status="inactive" />);

    const badge = screen.getByText("Inactive");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-gray-100");
    expect(badge.className).toContain("text-gray-800");
  });
});

// =============================================================================
// RoleBadge Tests
// =============================================================================

describe("RoleBadge", () => {
  it("renders admin role with correct styling", () => {
    render(<RoleBadge role="admin" />);

    const badge = screen.getByText("Admin");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-red-100");
    expect(badge.className).toContain("text-red-800");
  });

  it("renders staff role with correct styling", () => {
    render(<RoleBadge role="staff" />);

    const badge = screen.getByText("Staff");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-blue-100");
    expect(badge.className).toContain("text-blue-800");
  });

  it("renders client role with correct styling", () => {
    render(<RoleBadge role="client" />);

    const badge = screen.getByText("Client");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-100");
    expect(badge.className).toContain("text-green-800");
  });
});
