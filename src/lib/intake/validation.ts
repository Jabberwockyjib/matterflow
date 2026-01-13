/**
 * Intake Form Validation
 *
 * Validates form responses against template schema
 */

import type {
  IntakeFormTemplate,
  IntakeFormField,
  FormValidationResult,
  FormValidationError,
} from "./types";

/**
 * Validate form responses against template
 */
export function validateFormResponse(
  template: IntakeFormTemplate,
  responses: Record<string, unknown>,
): FormValidationResult {
  const errors: FormValidationError[] = [];

  // Iterate through all sections and fields
  for (const section of template.sections) {
    for (const field of section.fields) {
      // Skip section headers
      if (field.type === "section_header") continue;

      // Check conditional display
      if (field.conditionalDisplay) {
        const conditionField = responses[field.conditionalDisplay.field];
        const expectedValue = field.conditionalDisplay.value;

        // If condition not met, skip validation
        if (Array.isArray(expectedValue)) {
          if (typeof conditionField === "string" && !expectedValue.includes(conditionField)) {
            continue;
          }
        } else {
          if (conditionField !== expectedValue) {
            continue;
          }
        }
      }

      // Required field validation
      if (field.required) {
        const value = responses[field.id];

        if (value === undefined || value === null || value === "") {
          errors.push({
            field: field.id,
            message: `${field.label} is required`,
          });
          continue;
        }

        // Check for empty arrays (multiselect, file uploads)
        if (Array.isArray(value) && value.length === 0) {
          errors.push({
            field: field.id,
            message: `${field.label} is required`,
          });
          continue;
        }
      }

      // Type-specific validation
      const value = responses[field.id];
      if (value !== undefined && value !== null && value !== "") {
        validateFieldValue(field, value, errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate individual field value
 */
function validateFieldValue(
  field: IntakeFormField,
  value: unknown,
  errors: FormValidationError[],
): void {
  switch (field.type) {
    case "email":
      if (typeof value === "string" && !isValidEmail(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a valid email address`,
        });
      }
      break;

    case "phone":
      if (typeof value === "string" && !isValidPhone(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a valid phone number`,
        });
      }
      break;

    case "number":
      // Handle both number and string representations (form inputs return strings)
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a number`,
        });
      } else {
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at least ${field.validation.min}`,
          });
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at most ${field.validation.max}`,
          });
        }
      }
      break;

    case "text":
    case "textarea":
      if (typeof value !== "string") {
        errors.push({
          field: field.id,
          message: `${field.label} must be text`,
        });
      } else {
        if (
          field.validation?.minLength !== undefined &&
          value.length < field.validation.minLength
        ) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at least ${field.validation.minLength} characters`,
          });
        }
        if (
          field.validation?.maxLength !== undefined &&
          value.length > field.validation.maxLength
        ) {
          errors.push({
            field: field.id,
            message: `${field.label} must be at most ${field.validation.maxLength} characters`,
          });
        }
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            errors.push({
              field: field.id,
              message:
                field.validation.patternMessage ||
                `${field.label} format is invalid`,
            });
          }
        }
      }
      break;

    case "select":
      if (field.options && typeof value === "string") {
        const validValues = field.options.map((opt) => opt.value);
        if (!validValues.includes(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} has an invalid selection`,
          });
        }
      }
      break;

    case "multiselect":
      if (!Array.isArray(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be an array of selections`,
        });
      } else if (field.options) {
        const validValues = field.options.map((opt) => opt.value);
        const invalidSelections = value.filter(
          (v) => !validValues.includes(v),
        );
        if (invalidSelections.length > 0) {
          errors.push({
            field: field.id,
            message: `${field.label} contains invalid selections`,
          });
        }
      }
      break;

    case "radio":
      if (field.options && typeof value === "string") {
        const validValues = field.options.map((opt) => opt.value);
        if (!validValues.includes(value)) {
          errors.push({
            field: field.id,
            message: `${field.label} has an invalid selection`,
          });
        }
      }
      break;

    case "date":
      if (typeof value === "string" && !isValidDate(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be a valid date`,
        });
      }
      break;

    case "file":
      if (!Array.isArray(value)) {
        errors.push({
          field: field.id,
          message: `${field.label} must be an array of files`,
        });
      } else {
        if (field.fileConfig?.maxFiles && value.length > field.fileConfig.maxFiles) {
          errors.push({
            field: field.id,
            message: `${field.label} can have at most ${field.fileConfig.maxFiles} files`,
          });
        }

        // Validate each file
        for (const file of value) {
          if (field.fileConfig?.maxSize && file.fileSize > field.fileConfig.maxSize) {
            errors.push({
              field: field.id,
              message: `${file.fileName} exceeds maximum file size of ${formatBytes(field.fileConfig.maxSize)}`,
            });
          }

          // Support both mimeType (server) and fileType (form renderer) property names
          const fileMimeType = file.mimeType || file.fileType;
          if (
            field.fileConfig?.acceptedTypes &&
            fileMimeType &&
            !field.fileConfig.acceptedTypes.some((type) =>
              matchesMimeType(fileMimeType, type),
            )
          ) {
            errors.push({
              field: field.id,
              message: `${file.fileName} has an invalid file type`,
            });
          }
        }
      }
      break;
  }
}

/**
 * Email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Phone validation (flexible format)
 */
function isValidPhone(phone: string): boolean {
  // Remove common phone number characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  // Check if it's 10-15 digits
  return /^\d{10,15}$/.test(cleaned);
}

/**
 * Date validation
 */
function isValidDate(date: string): boolean {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * MIME type matching (supports wildcards)
 */
function matchesMimeType(mimeType: string, pattern: string): boolean {
  if (pattern === "*/*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return mimeType.startsWith(prefix);
  }
  return mimeType === pattern;
}

/**
 * Format bytes for human reading
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
