import { describe, expect, it } from "vitest";

import {
  // Common patterns
  emailSchema,
  passwordSchema,
  requiredString,
  optionalString,
  uuidSchema,
  requiredUuid,
  optionalUuid,
  positiveNumber,
  nonNegativeNumber,
  optionalPositiveNumber,
  dateString,
  // Form schemas
  signInSchema,
  matterCreateSchema,
  matterUpdateSchema,
  taskCreateSchema,
  taskStatusSchema,
  timeEntryCreateSchema,
  stopTimeEntrySchema,
  invoiceCreateSchema,
  invoiceStatusSchema,
  // Helper function
  validateFormData,
  // Enum values
  billingModelValues,
  responsiblePartyValues,
  taskStatusValues,
  invoiceStatusValues,
  matterStageValues,
} from "@/lib/validation/schemas";

// ============================================================================
// Common Validation Patterns Tests
// ============================================================================

describe("emailSchema", () => {
  it("accepts valid email addresses", () => {
    expect(emailSchema.safeParse("test@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user.name+tag@domain.co.uk").success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email is required");
    }
  });

  it("rejects invalid email format", () => {
    const result = emailSchema.safeParse("not-an-email");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please enter a valid email address");
    }
  });

  it("rejects email without domain", () => {
    const result = emailSchema.safeParse("test@");
    expect(result.success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts valid passwords (8+ characters)", () => {
    expect(passwordSchema.safeParse("password123").success).toBe(true);
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("rejects empty string", () => {
    const result = passwordSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required");
    }
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = passwordSchema.safeParse("short");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password must be at least 8 characters");
    }
  });

  it("rejects 7-character passwords", () => {
    const result = passwordSchema.safeParse("1234567");
    expect(result.success).toBe(false);
  });
});

describe("requiredString", () => {
  it("accepts non-empty strings", () => {
    const schema = requiredString("Name");
    expect(schema.safeParse("John Doe").success).toBe(true);
  });

  it("rejects empty strings with custom field name", () => {
    const schema = requiredString("Name");
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Name is required");
    }
  });

  it("uses provided field name in error message", () => {
    const schema = requiredString("Title");
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Title is required");
    }
  });
});

describe("optionalString", () => {
  it("accepts non-empty strings", () => {
    const result = optionalString.safeParse("hello");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("hello");
    }
  });

  it("transforms empty string to null", () => {
    const result = optionalString.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it("accepts undefined", () => {
    const result = optionalString.safeParse(undefined);
    expect(result.success).toBe(true);
  });
});

describe("uuidSchema", () => {
  it("accepts valid UUIDs", () => {
    expect(uuidSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
    expect(uuidSchema.safeParse("6ba7b810-9dad-11d1-80b4-00c04fd430c8").success).toBe(true);
  });

  it("rejects invalid UUID format", () => {
    const result = uuidSchema.safeParse("not-a-uuid");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid ID format");
    }
  });

  it("rejects empty string", () => {
    const result = uuidSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("requiredUuid", () => {
  it("accepts valid UUIDs", () => {
    const schema = requiredUuid("Matter ID");
    expect(schema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects empty string with custom field name", () => {
    const schema = requiredUuid("Matter ID");
    const result = schema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Matter ID is required");
    }
  });

  it("rejects invalid UUID format with custom message", () => {
    const schema = requiredUuid("Matter ID");
    const result = schema.safeParse("invalid-uuid-format");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid matter id format");
    }
  });
});

describe("optionalUuid", () => {
  it("accepts valid UUIDs", () => {
    const result = optionalUuid.safeParse("550e8400-e29b-41d4-a716-446655440000");
    expect(result.success).toBe(true);
  });

  it("transforms empty string to null", () => {
    const result = optionalUuid.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it("accepts undefined", () => {
    const result = optionalUuid.safeParse(undefined);
    expect(result.success).toBe(true);
  });
});

describe("positiveNumber", () => {
  it("accepts positive numbers", () => {
    const schema = positiveNumber("Amount");
    expect(schema.safeParse(10).success).toBe(true);
    expect(schema.safeParse(0.01).success).toBe(true);
  });

  it("rejects zero", () => {
    const schema = positiveNumber("Amount");
    const result = schema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Amount must be greater than 0");
    }
  });

  it("rejects negative numbers", () => {
    const schema = positiveNumber("Amount");
    const result = schema.safeParse(-5);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Amount must be greater than 0");
    }
  });

  it("rejects non-numbers", () => {
    const schema = positiveNumber("Amount");
    const result = schema.safeParse("not a number");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Amount must be a number");
    }
  });
});

describe("nonNegativeNumber", () => {
  it("accepts positive numbers", () => {
    const schema = nonNegativeNumber("Minutes");
    expect(schema.safeParse(10).success).toBe(true);
  });

  it("accepts zero", () => {
    const schema = nonNegativeNumber("Minutes");
    expect(schema.safeParse(0).success).toBe(true);
  });

  it("rejects negative numbers", () => {
    const schema = nonNegativeNumber("Minutes");
    const result = schema.safeParse(-1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Minutes cannot be negative");
    }
  });
});

describe("optionalPositiveNumber", () => {
  it("accepts positive numbers", () => {
    const result = optionalPositiveNumber.safeParse(10);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(10);
    }
  });

  it("parses numeric strings", () => {
    const result = optionalPositiveNumber.safeParse("25");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(25);
    }
  });

  it("transforms empty string to null", () => {
    const result = optionalPositiveNumber.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it("transforms zero to null", () => {
    const result = optionalPositiveNumber.safeParse(0);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it("transforms negative numbers to null", () => {
    const result = optionalPositiveNumber.safeParse(-5);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });
});

describe("dateString", () => {
  it("accepts valid date strings", () => {
    const result = dateString.safeParse("2024-01-15");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("2024-01-15");
    }
  });

  it("accepts ISO date strings", () => {
    const result = dateString.safeParse("2024-01-15T10:30:00.000Z");
    expect(result.success).toBe(true);
  });

  it("transforms empty string to null", () => {
    const result = dateString.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(null);
    }
  });

  it("accepts undefined", () => {
    const result = dateString.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it("rejects invalid date strings", () => {
    const result = dateString.safeParse("not-a-date");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please enter a valid date");
    }
  });
});

// ============================================================================
// Sign-In Form Schema Tests
// ============================================================================

describe("signInSchema", () => {
  it("accepts valid sign-in data", () => {
    const result = signInSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = signInSchema.safeParse({
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = signInSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = signInSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Matter Schema Tests
// ============================================================================

describe("matterCreateSchema", () => {
  it("accepts valid matter creation data", () => {
    const result = matterCreateSchema.safeParse({
      title: "New Matter",
      billingModel: "hourly",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(true);
  });

  it("applies default matterType when not provided", () => {
    const result = matterCreateSchema.safeParse({
      title: "New Matter",
      billingModel: "hourly",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matterType).toBe("General");
    }
  });

  it("rejects missing title", () => {
    const result = matterCreateSchema.safeParse({
      billingModel: "hourly",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = matterCreateSchema.safeParse({
      title: "",
      billingModel: "hourly",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid billing model", () => {
    const result = matterCreateSchema.safeParse({
      title: "New Matter",
      billingModel: "invalid",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a billing model");
    }
  });

  it("accepts all valid billing model values", () => {
    for (const model of billingModelValues) {
      const result = matterCreateSchema.safeParse({
        title: "New Matter",
        billingModel: model,
        responsibleParty: "lawyer",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid responsible party", () => {
    const result = matterCreateSchema.safeParse({
      title: "New Matter",
      billingModel: "hourly",
      responsibleParty: "invalid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a responsible party");
    }
  });

  it("accepts all valid responsible party values", () => {
    for (const party of responsiblePartyValues) {
      const result = matterCreateSchema.safeParse({
        title: "New Matter",
        billingModel: "hourly",
        responsibleParty: party,
      });
      expect(result.success).toBe(true);
    }
  });

  it("transforms empty nextAction to null", () => {
    const result = matterCreateSchema.safeParse({
      title: "New Matter",
      billingModel: "hourly",
      responsibleParty: "lawyer",
      nextAction: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextAction).toBe(null);
    }
  });
});

describe("matterUpdateSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid matter update data", () => {
    const result = matterUpdateSchema.safeParse({
      id: validUuid,
      stage: "Under Review",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = matterUpdateSchema.safeParse({
      stage: "Under Review",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid stage", () => {
    const result = matterUpdateSchema.safeParse({
      id: validUuid,
      stage: "Invalid Stage",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a valid stage");
    }
  });

  it("accepts all valid stage values", () => {
    for (const stage of matterStageValues) {
      const result = matterUpdateSchema.safeParse({
        id: validUuid,
        stage,
        responsibleParty: "lawyer",
      });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// Task Schema Tests
// ============================================================================

describe("taskCreateSchema", () => {
  it("accepts valid task creation data", () => {
    const result = taskCreateSchema.safeParse({
      title: "New Task",
      matterId: "123",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = taskCreateSchema.safeParse({
      matterId: "123",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty matterId", () => {
    const result = taskCreateSchema.safeParse({
      title: "New Task",
      matterId: "",
      responsibleParty: "lawyer",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a matter");
    }
  });

  it("accepts valid date for dueDate", () => {
    const result = taskCreateSchema.safeParse({
      title: "New Task",
      matterId: "123",
      responsibleParty: "lawyer",
      dueDate: "2024-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("transforms empty dueDate to null", () => {
    const result = taskCreateSchema.safeParse({
      title: "New Task",
      matterId: "123",
      responsibleParty: "lawyer",
      dueDate: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueDate).toBe(null);
    }
  });
});

describe("taskStatusSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid task status update", () => {
    const result = taskStatusSchema.safeParse({
      id: validUuid,
      status: "done",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = taskStatusSchema.safeParse({
      id: validUuid,
      status: "invalid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a valid status");
    }
  });

  it("accepts all valid task status values", () => {
    for (const status of taskStatusValues) {
      const result = taskStatusSchema.safeParse({
        id: validUuid,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// Time Entry Schema Tests
// ============================================================================

describe("timeEntryCreateSchema", () => {
  it("accepts valid time entry data", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts time entry with minutes", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
      minutes: 30,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minutes).toBe(30);
    }
  });

  it("parses string minutes to number", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
      minutes: "45",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minutes).toBe(45);
    }
  });

  it("transforms empty minutes to null", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
      minutes: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minutes).toBe(null);
    }
  });

  it("rejects empty matterId", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a matter");
    }
  });

  it("rejects negative minutes", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
      minutes: -10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Minutes cannot be negative");
    }
  });

  it("applies default description", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Manual entry");
    }
  });

  it("accepts custom description", () => {
    const result = timeEntryCreateSchema.safeParse({
      matterId: "123",
      description: "Drafted document",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("Drafted document");
    }
  });
});

describe("stopTimeEntrySchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid stop time entry data", () => {
    const result = stopTimeEntrySchema.safeParse({
      id: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing id", () => {
    const result = stopTimeEntrySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID format", () => {
    const result = stopTimeEntrySchema.safeParse({
      id: "invalid-id",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Invoice Schema Tests
// ============================================================================

describe("invoiceCreateSchema", () => {
  it("accepts valid invoice creation data", () => {
    const result = invoiceCreateSchema.safeParse({
      matterId: "123",
      amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("parses string amount to number", () => {
    const result = invoiceCreateSchema.safeParse({
      matterId: "123",
      amount: "250.50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250.5);
    }
  });

  it("transforms empty amount to 0", () => {
    const result = invoiceCreateSchema.safeParse({
      matterId: "123",
      amount: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(0);
    }
  });

  it("rejects empty matterId", () => {
    const result = invoiceCreateSchema.safeParse({
      matterId: "",
      amount: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a matter");
    }
  });

  it("rejects negative amount", () => {
    const result = invoiceCreateSchema.safeParse({
      matterId: "123",
      amount: -50,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Amount cannot be negative");
    }
  });

  it("applies default status of draft", () => {
    const result = invoiceCreateSchema.safeParse({
      matterId: "123",
      amount: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("draft");
    }
  });

  it("accepts valid status values", () => {
    for (const status of invoiceStatusValues) {
      const result = invoiceCreateSchema.safeParse({
        matterId: "123",
        amount: 100,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("invoiceStatusSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid invoice status update", () => {
    const result = invoiceStatusSchema.safeParse({
      id: validUuid,
      status: "paid",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = invoiceStatusSchema.safeParse({
      id: validUuid,
      status: "invalid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please select a valid status");
    }
  });

  it("accepts all valid invoice status values", () => {
    for (const status of invoiceStatusValues) {
      const result = invoiceStatusSchema.safeParse({
        id: validUuid,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// validateFormData Helper Tests
// ============================================================================

describe("validateFormData", () => {
  it("returns success with data for valid input", () => {
    const result = validateFormData(signInSchema, {
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
      expect(result.data.password).toBe("password123");
    }
  });

  it("returns errors for invalid input", () => {
    const result = validateFormData(signInSchema, {
      email: "invalid",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBe("Please enter a valid email address");
      expect(result.errors.password).toBe("Password must be at least 8 characters");
    }
  });

  it("returns error for single invalid field", () => {
    const result = validateFormData(signInSchema, {
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeUndefined();
      expect(result.errors.password).toBeDefined();
    }
  });
});

// ============================================================================
// Enum Values Tests
// ============================================================================

describe("enum values", () => {
  it("has correct billing model values", () => {
    expect(billingModelValues).toEqual(["hourly", "flat", "hybrid"]);
  });

  it("has correct responsible party values", () => {
    expect(responsiblePartyValues).toEqual(["lawyer", "client"]);
  });

  it("has correct task status values", () => {
    expect(taskStatusValues).toEqual(["open", "in-progress", "done"]);
  });

  it("has correct invoice status values", () => {
    expect(invoiceStatusValues).toEqual(["draft", "sent", "paid", "overdue"]);
  });

  it("has correct matter stage values", () => {
    expect(matterStageValues).toContain("Lead Created");
    expect(matterStageValues).toContain("Completed");
    expect(matterStageValues).toContain("Archived");
    expect(matterStageValues.length).toBe(11);
  });
});
