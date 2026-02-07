/**
 * Google Forms to MatterFlow IntakeFormTemplate converter
 * Maps Google Form question types to MatterFlow field types
 */

import type { IntakeFormField, IntakeFormSection, IntakeFormTemplate } from "@/lib/intake/types";
import type { GoogleForm, GoogleFormItem } from "./client";

/**
 * Convert a Google Form item to MatterFlow form field(s)
 */
function convertItem(item: GoogleFormItem): IntakeFormField | null {
  // Page break → section_header
  if (item.pageBreakItem) {
    return {
      id: `field_${item.itemId}`,
      type: "section_header",
      label: item.title || "Section",
      description: item.description || item.pageBreakItem.description,
    };
  }

  // Text/info items → section_header (display only)
  if (item.textItem) {
    return {
      id: `field_${item.itemId}`,
      type: "section_header",
      label: item.title || "",
      description: item.description,
    };
  }

  // Skip image/video items (no equivalent in our system)
  if (item.imageItem || item.videoItem) {
    return null;
  }

  // Question group (grid) → convert each row as separate field
  // For simplicity, we'll skip grid questions as they don't map cleanly
  if (item.questionGroupItem) {
    // Create a section header to represent the grid
    return {
      id: `field_${item.itemId}`,
      type: "section_header",
      label: item.title || "Question Group",
      description: item.description || "(Grid questions - review and customize as needed)",
    };
  }

  // Regular question item
  if (!item.questionItem?.question) return null;

  const q = item.questionItem.question;
  const baseField: Partial<IntakeFormField> = {
    id: `field_${q.questionId}`,
    label: item.title || "Untitled Question",
    description: item.description,
    required: q.required || false,
  };

  // Text question
  if (q.textQuestion) {
    return {
      ...baseField,
      type: q.textQuestion.paragraph ? "textarea" : "text",
    } as IntakeFormField;
  }

  // Choice question (radio, checkbox, dropdown)
  if (q.choiceQuestion) {
    const options = (q.choiceQuestion.options || [])
      .filter(opt => !opt.isOther) // Skip "Other" option
      .map(opt => ({
        value: opt.value.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        label: opt.value,
      }));

    // Add "Other" option if present
    const hasOther = q.choiceQuestion.options?.some(opt => opt.isOther);
    if (hasOther) {
      options.push({ value: "other", label: "Other" });
    }

    const typeMap = {
      RADIO: "radio" as const,
      CHECKBOX: "multiselect" as const,
      DROP_DOWN: "select" as const,
    };

    return {
      ...baseField,
      type: typeMap[q.choiceQuestion.type] || "select",
      options,
    } as IntakeFormField;
  }

  // Scale question → select with generated options
  if (q.scaleQuestion) {
    const options = [];
    for (let i = q.scaleQuestion.low; i <= q.scaleQuestion.high; i++) {
      let label = String(i);
      if (i === q.scaleQuestion.low && q.scaleQuestion.lowLabel) {
        label = `${i} - ${q.scaleQuestion.lowLabel}`;
      }
      if (i === q.scaleQuestion.high && q.scaleQuestion.highLabel) {
        label = `${i} - ${q.scaleQuestion.highLabel}`;
      }
      options.push({ value: String(i), label });
    }

    return {
      ...baseField,
      type: "select",
      options,
    } as IntakeFormField;
  }

  // Date question
  if (q.dateQuestion) {
    return {
      ...baseField,
      type: "date",
    } as IntakeFormField;
  }

  // Time question → text with hint
  if (q.timeQuestion) {
    return {
      ...baseField,
      type: "text",
      placeholder: q.timeQuestion.duration ? "HH:MM:SS" : "HH:MM",
      description: (baseField.description || "") + (q.timeQuestion.duration ? " (Duration)" : " (Time)"),
    } as IntakeFormField;
  }

  // File upload question
  if (q.fileUploadQuestion) {
    return {
      ...baseField,
      type: "file",
      fileConfig: {
        maxFiles: q.fileUploadQuestion.maxFiles || 1,
        maxSize: q.fileUploadQuestion.maxFileSize
          ? parseInt(q.fileUploadQuestion.maxFileSize)
          : 10 * 1024 * 1024,
      },
    } as IntakeFormField;
  }

  // Rating question → select with star options
  if (q.ratingQuestion) {
    const max = q.ratingQuestion.ratingScaleLevel || 5;
    const options = [];
    for (let i = 1; i <= max; i++) {
      options.push({ value: String(i), label: `${i} star${i > 1 ? "s" : ""}` });
    }

    return {
      ...baseField,
      type: "select",
      options,
    } as IntakeFormField;
  }

  // Fallback: text field
  return {
    ...baseField,
    type: "text",
  } as IntakeFormField;
}

/**
 * Convert a Google Form to a MatterFlow IntakeFormTemplate
 *
 * Google Forms organize items linearly. Page breaks create section boundaries.
 * If there are no page breaks, all items go into a single section.
 */
export function convertGoogleFormToTemplate(form: GoogleForm): IntakeFormTemplate {
  const sections: IntakeFormSection[] = [];
  let currentSection: IntakeFormSection = {
    id: "section-1",
    title: form.info.title || "Form",
    description: form.info.description,
    fields: [],
  };

  let sectionCount = 1;

  for (const item of form.items) {
    // Page breaks create new sections
    if (item.pageBreakItem) {
      // Save current section if it has fields
      if (currentSection.fields.length > 0) {
        sections.push(currentSection);
      }

      sectionCount++;
      currentSection = {
        id: `section-${sectionCount}`,
        title: item.title || item.pageBreakItem.title || `Section ${sectionCount}`,
        description: item.description || item.pageBreakItem.description,
        fields: [],
      };
      continue;
    }

    const field = convertItem(item);
    if (field) {
      currentSection.fields.push(field);
    }
  }

  // Don't forget the last section
  if (currentSection.fields.length > 0) {
    sections.push(currentSection);
  }

  // If no sections were created, add a default one
  if (sections.length === 0) {
    sections.push({
      id: "section-1",
      title: form.info.title || "Form",
      fields: [],
    });
  }

  return {
    id: "", // Will be set by DB
    name: form.info.title || "Imported Form",
    matterType: "",
    description: form.info.description,
    sections,
    version: 1,
  };
}
