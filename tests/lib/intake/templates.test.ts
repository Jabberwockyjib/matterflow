import { describe, expect, it } from "vitest";
import {
  getTemplateForMatterType,
  getAllTemplates,
  INTAKE_FORM_TEMPLATES,
  contractReviewTemplate,
  employmentAgreementTemplate,
  policyReviewTemplate,
  generalIntakeTemplate,
} from "@/lib/intake/templates";

// =============================================================================
// getTemplateForMatterType Tests
// =============================================================================

describe("getTemplateForMatterType", () => {
  it("returns Contract Review template", () => {
    const template = getTemplateForMatterType("Contract Review");

    expect(template).not.toBeNull();
    expect(template?.id).toBe("contract-review-v1");
    expect(template?.matterType).toBe("Contract Review");
  });

  it("returns Employment Agreement template", () => {
    const template = getTemplateForMatterType("Employment Agreement");

    expect(template).not.toBeNull();
    expect(template?.id).toBe("employment-agreement-v1");
    expect(template?.matterType).toBe("Employment Agreement");
  });

  it("returns Policy Review template", () => {
    const template = getTemplateForMatterType("Policy Review");

    expect(template).not.toBeNull();
    expect(template?.id).toBe("policy-review-v1");
    expect(template?.matterType).toBe("Policy Review");
  });

  it("returns General template", () => {
    const template = getTemplateForMatterType("General");

    expect(template).not.toBeNull();
    expect(template?.id).toBe("general-intake-v1");
    expect(template?.matterType).toBe("General");
  });

  it("returns null for unknown matter type", () => {
    const template = getTemplateForMatterType("Unknown Type");

    expect(template).toBeNull();
  });

  it("returns null for empty string", () => {
    const template = getTemplateForMatterType("");

    expect(template).toBeNull();
  });
});

// =============================================================================
// getAllTemplates Tests
// =============================================================================

describe("getAllTemplates", () => {
  it("returns all templates", () => {
    const templates = getAllTemplates();

    expect(templates).toHaveLength(4);
    expect(templates).toContain(contractReviewTemplate);
    expect(templates).toContain(employmentAgreementTemplate);
    expect(templates).toContain(policyReviewTemplate);
    expect(templates).toContain(generalIntakeTemplate);
  });

  it("returns IntakeFormTemplate objects", () => {
    const templates = getAllTemplates();

    for (const template of templates) {
      expect(template).toHaveProperty("id");
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("matterType");
      expect(template).toHaveProperty("sections");
      expect(template).toHaveProperty("version");
    }
  });
});

// =============================================================================
// Template Structure Tests
// =============================================================================

describe("contractReviewTemplate", () => {
  it("has required fields", () => {
    expect(contractReviewTemplate.id).toBe("contract-review-v1");
    expect(contractReviewTemplate.name).toBe("Contract Review Intake");
    expect(contractReviewTemplate.matterType).toBe("Contract Review");
    expect(contractReviewTemplate.sections.length).toBeGreaterThan(0);
    expect(contractReviewTemplate.version).toBe(1);
  });

  it("has client information section", () => {
    const clientSection = contractReviewTemplate.sections.find(
      (s) => s.id === "client-info"
    );
    expect(clientSection).toBeDefined();
    expect(clientSection?.title).toBe("Client Information");
  });

  it("has required client email field", () => {
    const clientSection = contractReviewTemplate.sections.find(
      (s) => s.id === "client-info"
    );
    const emailField = clientSection?.fields.find((f) => f.id === "client_email");
    expect(emailField).toBeDefined();
    expect(emailField?.type).toBe("email");
    expect(emailField?.required).toBe(true);
  });
});

describe("employmentAgreementTemplate", () => {
  it("has required fields", () => {
    expect(employmentAgreementTemplate.id).toBe("employment-agreement-v1");
    expect(employmentAgreementTemplate.name).toBe("Employment Agreement Intake");
    expect(employmentAgreementTemplate.matterType).toBe("Employment Agreement");
    expect(employmentAgreementTemplate.sections.length).toBeGreaterThan(0);
  });

  it("has position details section", () => {
    const section = employmentAgreementTemplate.sections.find(
      (s) => s.id === "position-details"
    );
    expect(section).toBeDefined();
  });
});

describe("policyReviewTemplate", () => {
  it("has required fields", () => {
    expect(policyReviewTemplate.id).toBe("policy-review-v1");
    expect(policyReviewTemplate.name).toBe("Policy Review Intake");
    expect(policyReviewTemplate.matterType).toBe("Policy Review");
    expect(policyReviewTemplate.sections.length).toBeGreaterThan(0);
  });
});

describe("generalIntakeTemplate", () => {
  it("has required fields", () => {
    expect(generalIntakeTemplate.id).toBe("general-intake-v1");
    expect(generalIntakeTemplate.name).toBe("General Intake");
    expect(generalIntakeTemplate.matterType).toBe("General");
    expect(generalIntakeTemplate.sections.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// INTAKE_FORM_TEMPLATES Tests
// =============================================================================

describe("INTAKE_FORM_TEMPLATES", () => {
  it("maps matter types to templates", () => {
    expect(INTAKE_FORM_TEMPLATES["Contract Review"]).toBe(contractReviewTemplate);
    expect(INTAKE_FORM_TEMPLATES["Employment Agreement"]).toBe(employmentAgreementTemplate);
    expect(INTAKE_FORM_TEMPLATES["Policy Review"]).toBe(policyReviewTemplate);
    expect(INTAKE_FORM_TEMPLATES["General"]).toBe(generalIntakeTemplate);
  });

  it("has 4 templates", () => {
    expect(Object.keys(INTAKE_FORM_TEMPLATES)).toHaveLength(4);
  });
});
