import { describe, expect, it } from "vitest";
import { validateFormResponse } from "@/lib/intake/validation";
import type { IntakeFormTemplate } from "@/lib/intake/types";

// ============================================================================
// Helper: Create minimal template for testing
// ============================================================================

function createTemplate(
  fields: IntakeFormTemplate["sections"][0]["fields"],
): IntakeFormTemplate {
  return {
    id: "test-template",
    name: "Test Template",
    matterType: "Test",
    sections: [
      {
        id: "section-1",
        title: "Test Section",
        fields,
      },
    ],
    version: 1,
  };
}

// ============================================================================
// Basic Validation Tests
// ============================================================================

describe("validateFormResponse", () => {
  describe("required field validation", () => {
    it("returns valid when all required fields are filled", () => {
      const template = createTemplate([
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
      ]);

      const result = validateFormResponse(template, {
        name: "John Doe",
        email: "john@example.com",
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("returns error when required field is missing", () => {
      const template = createTemplate([
        { id: "name", type: "text", label: "Name", required: true },
      ]);

      const result = validateFormResponse(template, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: "name",
        message: "Name is required",
      });
    });

    it("returns error when required field is empty string", () => {
      const template = createTemplate([
        { id: "name", type: "text", label: "Name", required: true },
      ]);

      const result = validateFormResponse(template, { name: "" });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Name is required");
    });

    it("returns error when required field is null", () => {
      const template = createTemplate([
        { id: "name", type: "text", label: "Name", required: true },
      ]);

      const result = validateFormResponse(template, { name: null });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Name is required");
    });

    it("returns error when required array field is empty", () => {
      const template = createTemplate([
        {
          id: "selections",
          type: "multiselect",
          label: "Selections",
          required: true,
          options: [
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ],
        },
      ]);

      const result = validateFormResponse(template, { selections: [] });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Selections is required");
    });

    it("passes when optional field is missing", () => {
      const template = createTemplate([
        { id: "notes", type: "textarea", label: "Notes", required: false },
      ]);

      const result = validateFormResponse(template, {});

      expect(result.valid).toBe(true);
    });
  });

  describe("section header handling", () => {
    it("skips section_header fields during validation", () => {
      const template = createTemplate([
        { id: "header-1", type: "section_header", label: "Section Header" },
        { id: "name", type: "text", label: "Name", required: true },
      ]);

      const result = validateFormResponse(template, { name: "John" });

      expect(result.valid).toBe(true);
    });
  });

  describe("conditional display", () => {
    it("skips validation when condition is not met (single value)", () => {
      const template = createTemplate([
        {
          id: "has_pet",
          type: "radio",
          label: "Do you have a pet?",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          id: "pet_name",
          type: "text",
          label: "Pet Name",
          required: true,
          conditionalDisplay: { field: "has_pet", value: "yes" },
        },
      ]);

      // Condition not met - pet_name should not be required
      const result = validateFormResponse(template, { has_pet: "no" });

      expect(result.valid).toBe(true);
    });

    it("validates when condition is met (single value)", () => {
      const template = createTemplate([
        {
          id: "has_pet",
          type: "radio",
          label: "Do you have a pet?",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          id: "pet_name",
          type: "text",
          label: "Pet Name",
          required: true,
          conditionalDisplay: { field: "has_pet", value: "yes" },
        },
      ]);

      // Condition met - pet_name should be required
      const result = validateFormResponse(template, { has_pet: "yes" });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Pet Name is required");
    });

    it("validates when condition is met (array of values)", () => {
      const template = createTemplate([
        {
          id: "contract_type",
          type: "select",
          label: "Contract Type",
          required: true,
          options: [
            { value: "employment", label: "Employment" },
            { value: "nda", label: "NDA" },
            { value: "other", label: "Other" },
          ],
        },
        {
          id: "job_title",
          type: "text",
          label: "Job Title",
          required: true,
          conditionalDisplay: { field: "contract_type", value: ["employment", "nda"] },
        },
      ]);

      // Condition met - employment is in the array
      const result = validateFormResponse(template, { contract_type: "employment" });

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Job Title is required");
    });

    it("skips validation when condition array not met", () => {
      const template = createTemplate([
        {
          id: "contract_type",
          type: "select",
          label: "Contract Type",
          required: true,
          options: [
            { value: "employment", label: "Employment" },
            { value: "nda", label: "NDA" },
            { value: "other", label: "Other" },
          ],
        },
        {
          id: "job_title",
          type: "text",
          label: "Job Title",
          required: true,
          conditionalDisplay: { field: "contract_type", value: ["employment", "nda"] },
        },
      ]);

      // Condition not met - "other" is not in the array
      const result = validateFormResponse(template, { contract_type: "other" });

      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// Email Validation Tests
// ============================================================================

describe("email field validation", () => {
  const template = createTemplate([
    { id: "email", type: "email", label: "Email" },
  ]);

  it("accepts valid email addresses", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "user+tag@example.org",
      "simple@test.io",
    ];

    for (const email of validEmails) {
      const result = validateFormResponse(template, { email });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects invalid email addresses", () => {
    const invalidEmails = [
      "not-an-email",
      "@missing-local.com",
      "missing-at.com",
      "missing@domain",
    ];

    for (const email of invalidEmails) {
      const result = validateFormResponse(template, { email });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Email must be a valid email address");
    }
  });
});

// ============================================================================
// Phone Validation Tests
// ============================================================================

describe("phone field validation", () => {
  const template = createTemplate([
    { id: "phone", type: "phone", label: "Phone" },
  ]);

  it("accepts valid phone numbers", () => {
    const validPhones = [
      "1234567890",
      "123-456-7890",
      "(123) 456-7890",
      "123.456.7890",
      "1 123 456 7890", // 11 digits with spaces
      "12345678901234", // Up to 15 digits
    ];

    for (const phone of validPhones) {
      const result = validateFormResponse(template, { phone });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects invalid phone numbers", () => {
    const invalidPhones = [
      "123456789", // Too short (9 digits)
      "12345", // Too short
      "1234567890123456", // Too long (16 digits)
      "abc-def-ghij", // Letters
    ];

    for (const phone of invalidPhones) {
      const result = validateFormResponse(template, { phone });
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe("Phone must be a valid phone number");
    }
  });
});

// ============================================================================
// Number Validation Tests
// ============================================================================

describe("number field validation", () => {
  it("accepts valid numbers", () => {
    const template = createTemplate([
      { id: "amount", type: "number", label: "Amount" },
    ]);

    const result = validateFormResponse(template, { amount: 42 });
    expect(result.valid).toBe(true);
  });

  it("accepts numeric strings", () => {
    const template = createTemplate([
      { id: "amount", type: "number", label: "Amount" },
    ]);

    const result = validateFormResponse(template, { amount: "42" });
    expect(result.valid).toBe(true);
  });

  it("rejects non-numeric values", () => {
    const template = createTemplate([
      { id: "amount", type: "number", label: "Amount" },
    ]);

    const result = validateFormResponse(template, { amount: "not a number" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Amount must be a number");
  });

  it("validates minimum value", () => {
    const template = createTemplate([
      {
        id: "age",
        type: "number",
        label: "Age",
        validation: { min: 18 },
      },
    ]);

    const result = validateFormResponse(template, { age: 15 });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Age must be at least 18");
  });

  it("validates maximum value", () => {
    const template = createTemplate([
      {
        id: "quantity",
        type: "number",
        label: "Quantity",
        validation: { max: 100 },
      },
    ]);

    const result = validateFormResponse(template, { quantity: 150 });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Quantity must be at most 100");
  });

  it("accepts values within min/max range", () => {
    const template = createTemplate([
      {
        id: "rating",
        type: "number",
        label: "Rating",
        validation: { min: 1, max: 5 },
      },
    ]);

    const result = validateFormResponse(template, { rating: 3 });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Text/Textarea Validation Tests
// ============================================================================

describe("text field validation", () => {
  it("accepts string values", () => {
    const template = createTemplate([
      { id: "name", type: "text", label: "Name" },
    ]);

    const result = validateFormResponse(template, { name: "John Doe" });
    expect(result.valid).toBe(true);
  });

  it("rejects non-string values", () => {
    const template = createTemplate([
      { id: "name", type: "text", label: "Name" },
    ]);

    const result = validateFormResponse(template, { name: 123 });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Name must be text");
  });

  it("validates minimum length", () => {
    const template = createTemplate([
      {
        id: "bio",
        type: "textarea",
        label: "Bio",
        validation: { minLength: 10 },
      },
    ]);

    const result = validateFormResponse(template, { bio: "Short" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Bio must be at least 10 characters");
  });

  it("validates maximum length", () => {
    const template = createTemplate([
      {
        id: "title",
        type: "text",
        label: "Title",
        validation: { maxLength: 5 },
      },
    ]);

    const result = validateFormResponse(template, { title: "Too Long Title" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Title must be at most 5 characters");
  });

  it("validates pattern with custom message", () => {
    const template = createTemplate([
      {
        id: "code",
        type: "text",
        label: "Code",
        validation: {
          pattern: "^[A-Z]{3}$",
          patternMessage: "Code must be exactly 3 uppercase letters",
        },
      },
    ]);

    const result = validateFormResponse(template, { code: "abc" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Code must be exactly 3 uppercase letters");
  });

  it("validates pattern with default message", () => {
    const template = createTemplate([
      {
        id: "code",
        type: "text",
        label: "Code",
        validation: { pattern: "^[A-Z]{3}$" },
      },
    ]);

    const result = validateFormResponse(template, { code: "abc" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Code format is invalid");
  });

  it("accepts value matching pattern", () => {
    const template = createTemplate([
      {
        id: "code",
        type: "text",
        label: "Code",
        validation: { pattern: "^[A-Z]{3}$" },
      },
    ]);

    const result = validateFormResponse(template, { code: "ABC" });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Select/Radio Validation Tests
// ============================================================================

describe("select field validation", () => {
  const template = createTemplate([
    {
      id: "color",
      type: "select",
      label: "Favorite Color",
      options: [
        { value: "red", label: "Red" },
        { value: "blue", label: "Blue" },
        { value: "green", label: "Green" },
      ],
    },
  ]);

  it("accepts valid option value", () => {
    const result = validateFormResponse(template, { color: "blue" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid option value", () => {
    const result = validateFormResponse(template, { color: "purple" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Favorite Color has an invalid selection");
  });
});

describe("radio field validation", () => {
  const template = createTemplate([
    {
      id: "answer",
      type: "radio",
      label: "Answer",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
  ]);

  it("accepts valid option value", () => {
    const result = validateFormResponse(template, { answer: "yes" });
    expect(result.valid).toBe(true);
  });

  it("rejects invalid option value", () => {
    const result = validateFormResponse(template, { answer: "maybe" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Answer has an invalid selection");
  });
});

// ============================================================================
// Multiselect Validation Tests
// ============================================================================

describe("multiselect field validation", () => {
  const template = createTemplate([
    {
      id: "languages",
      type: "multiselect",
      label: "Languages",
      options: [
        { value: "en", label: "English" },
        { value: "es", label: "Spanish" },
        { value: "fr", label: "French" },
      ],
    },
  ]);

  it("accepts valid array of options", () => {
    const result = validateFormResponse(template, { languages: ["en", "es"] });
    expect(result.valid).toBe(true);
  });

  it("rejects non-array value", () => {
    const result = validateFormResponse(template, { languages: "en" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Languages must be an array of selections");
  });

  it("rejects array with invalid options", () => {
    const result = validateFormResponse(template, { languages: ["en", "de"] });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Languages contains invalid selections");
  });

  it("accepts empty array for optional field", () => {
    const result = validateFormResponse(template, { languages: [] });
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Date Validation Tests
// ============================================================================

describe("date field validation", () => {
  const template = createTemplate([
    { id: "birthdate", type: "date", label: "Birthdate" },
  ]);

  it("accepts valid date strings", () => {
    const validDates = [
      "2024-01-15",
      "2024-12-31T23:59:59Z",
      "January 1, 2024",
    ];

    for (const date of validDates) {
      const result = validateFormResponse(template, { birthdate: date });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects invalid date strings", () => {
    const result = validateFormResponse(template, { birthdate: "not-a-date" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Birthdate must be a valid date");
  });
});

// ============================================================================
// File Upload Validation Tests
// ============================================================================

describe("file field validation", () => {
  it("accepts valid file array", () => {
    const template = createTemplate([
      {
        id: "documents",
        type: "file",
        label: "Documents",
        fileConfig: {
          maxFiles: 5,
          maxSize: 10 * 1024 * 1024, // 10MB
          acceptedTypes: ["application/pdf", "image/*"],
        },
      },
    ]);

    const result = validateFormResponse(template, {
      documents: [
        { fileName: "doc.pdf", fileSize: 1024, mimeType: "application/pdf" },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("rejects non-array value", () => {
    const template = createTemplate([
      { id: "documents", type: "file", label: "Documents" },
    ]);

    const result = validateFormResponse(template, { documents: "file.pdf" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Documents must be an array of files");
  });

  it("rejects when exceeding max files", () => {
    const template = createTemplate([
      {
        id: "documents",
        type: "file",
        label: "Documents",
        fileConfig: { maxFiles: 2 },
      },
    ]);

    const result = validateFormResponse(template, {
      documents: [
        { fileName: "a.pdf", fileSize: 100, mimeType: "application/pdf" },
        { fileName: "b.pdf", fileSize: 100, mimeType: "application/pdf" },
        { fileName: "c.pdf", fileSize: 100, mimeType: "application/pdf" },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("Documents can have at most 2 files");
  });

  it("rejects file exceeding max size", () => {
    const template = createTemplate([
      {
        id: "documents",
        type: "file",
        label: "Documents",
        fileConfig: { maxSize: 1024 }, // 1KB
      },
    ]);

    const result = validateFormResponse(template, {
      documents: [
        { fileName: "large.pdf", fileSize: 2048, mimeType: "application/pdf" },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("large.pdf exceeds maximum file size of 1 KB");
  });

  it("rejects file with invalid type", () => {
    const template = createTemplate([
      {
        id: "documents",
        type: "file",
        label: "Documents",
        fileConfig: { acceptedTypes: ["application/pdf"] },
      },
    ]);

    const result = validateFormResponse(template, {
      documents: [
        { fileName: "image.png", fileSize: 1024, mimeType: "image/png" },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe("image.png has an invalid file type");
  });

  it("accepts file matching wildcard MIME type", () => {
    const template = createTemplate([
      {
        id: "images",
        type: "file",
        label: "Images",
        fileConfig: { acceptedTypes: ["image/*"] },
      },
    ]);

    const result = validateFormResponse(template, {
      images: [
        { fileName: "photo.png", fileSize: 1024, mimeType: "image/png" },
        { fileName: "photo.jpg", fileSize: 1024, mimeType: "image/jpeg" },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("accepts file when */* wildcard is used", () => {
    const template = createTemplate([
      {
        id: "files",
        type: "file",
        label: "Files",
        fileConfig: { acceptedTypes: ["*/*"] },
      },
    ]);

    const result = validateFormResponse(template, {
      files: [
        { fileName: "doc.docx", fileSize: 1024, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
      ],
    });

    expect(result.valid).toBe(true);
  });

  it("supports fileType property (form renderer uses this)", () => {
    const template = createTemplate([
      {
        id: "documents",
        type: "file",
        label: "Documents",
        fileConfig: { acceptedTypes: ["application/pdf"] },
      },
    ]);

    const result = validateFormResponse(template, {
      documents: [
        { fileName: "doc.pdf", fileSize: 1024, fileType: "application/pdf" },
      ],
    });

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Multiple Errors Tests
// ============================================================================

describe("multiple validation errors", () => {
  it("collects all errors from multiple fields", () => {
    const template = createTemplate([
      { id: "name", type: "text", label: "Name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "phone", type: "phone", label: "Phone", required: true },
    ]);

    const result = validateFormResponse(template, {
      name: "",
      email: "invalid",
      phone: "123",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errors.map((e) => e.field)).toContain("name");
    expect(result.errors.map((e) => e.field)).toContain("email");
    expect(result.errors.map((e) => e.field)).toContain("phone");
  });
});

// ============================================================================
// Multiple Sections Tests
// ============================================================================

describe("multiple sections validation", () => {
  it("validates fields across all sections", () => {
    const template: IntakeFormTemplate = {
      id: "multi-section",
      name: "Multi-Section Form",
      matterType: "Test",
      sections: [
        {
          id: "section-1",
          title: "Personal Info",
          fields: [
            { id: "name", type: "text", label: "Name", required: true },
          ],
        },
        {
          id: "section-2",
          title: "Contact Info",
          fields: [
            { id: "email", type: "email", label: "Email", required: true },
          ],
        },
      ],
      version: 1,
    };

    const result = validateFormResponse(template, {});

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].field).toBe("name");
    expect(result.errors[1].field).toBe("email");
  });
});
