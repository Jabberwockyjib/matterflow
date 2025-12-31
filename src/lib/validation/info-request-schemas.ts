import { z } from 'zod';

// Enum for question types
export const questionTypeEnum = z.enum([
  'short_text',
  'long_text',
  'multiple_choice',
  'checkboxes',
  'file_upload',
  'date',
]);

// Base question schema with common fields
const baseQuestionSchema = z.object({
  question: z.string().min(1),
  required: z.boolean(),
});

// Question schema using discriminated union for type-specific validation
export const questionSchema = z.discriminatedUnion('type', [
  // short_text: No additional fields
  baseQuestionSchema.extend({
    type: z.literal('short_text'),
  }),

  // long_text: No additional fields
  baseQuestionSchema.extend({
    type: z.literal('long_text'),
  }),

  // multiple_choice: Requires options array with min 2 items
  baseQuestionSchema.extend({
    type: z.literal('multiple_choice'),
    options: z.array(z.string()).min(2),
  }),

  // checkboxes: Requires options array with min 1 item
  baseQuestionSchema.extend({
    type: z.literal('checkboxes'),
    options: z.array(z.string()).min(1),
  }),

  // file_upload: No additional fields
  baseQuestionSchema.extend({
    type: z.literal('file_upload'),
  }),

  // date: No additional fields
  baseQuestionSchema.extend({
    type: z.literal('date'),
  }),
]);

// Info request creation schema
export const infoRequestSchema = z.object({
  intakeResponseId: z.string().uuid(),
  questions: z.array(questionSchema).min(1),
  message: z.string().optional(),
  documents: z.array(z.string()).optional(),
  deadline: z.string().datetime().optional(),
});

// Info response submission schema
export const infoResponseSchema = z.object({
  infoRequestId: z.string().uuid(),
  responses: z.record(z.string(), z.unknown()),
});

// Type exports for TypeScript
export type QuestionType = z.infer<typeof questionTypeEnum>;
export type Question = z.infer<typeof questionSchema>;
export type InfoRequest = z.infer<typeof infoRequestSchema>;
export type InfoResponse = z.infer<typeof infoResponseSchema>;
