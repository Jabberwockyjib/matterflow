/**
 * Intake Form System
 *
 * Public exports for intake form functionality
 */

// Types
export type {
  IntakeFormFieldType,
  IntakeFormField,
  IntakeFormSection,
  IntakeFormTemplate,
  IntakeFormResponse,
  IntakeFileUpload,
  FormValidationError,
  FormValidationResult,
  IntakeFormSubmission,
  Result,
} from "./types";

// Templates
export {
  contractReviewTemplate,
  employmentAgreementTemplate,
  policyReviewTemplate,
  INTAKE_FORM_TEMPLATES,
  getTemplateForMatterType,
  getAllTemplates,
} from "./templates";

// Validation
export { validateFormResponse } from "./validation";

// Server Actions
export {
  getIntakeForm,
  saveIntakeFormDraft,
  submitIntakeForm,
  approveIntakeForm,
  getAllIntakeResponses,
  getIntakeResponseByMatterId,
  getTemplateFromDb,
  getIntakeFormTemplates,
  getIntakeFormTemplateById,
  saveIntakeFormTemplate,
  deleteIntakeFormTemplate,
} from "./actions";
