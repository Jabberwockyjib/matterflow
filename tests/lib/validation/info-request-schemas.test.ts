import { describe, it, expect } from 'vitest';
import {
  questionTypeEnum,
  questionSchema,
  infoRequestSchema,
  infoResponseSchema,
} from '@/lib/validation/info-request-schemas';

describe('questionTypeEnum', () => {
  it('should validate valid question types', () => {
    expect(questionTypeEnum.safeParse('short_text').success).toBe(true);
    expect(questionTypeEnum.safeParse('long_text').success).toBe(true);
    expect(questionTypeEnum.safeParse('multiple_choice').success).toBe(true);
    expect(questionTypeEnum.safeParse('checkboxes').success).toBe(true);
    expect(questionTypeEnum.safeParse('file_upload').success).toBe(true);
    expect(questionTypeEnum.safeParse('date').success).toBe(true);
  });

  it('should reject invalid question types', () => {
    expect(questionTypeEnum.safeParse('invalid').success).toBe(false);
    expect(questionTypeEnum.safeParse('').success).toBe(false);
  });
});

describe('questionSchema', () => {
  it('should validate short_text question', () => {
    const question = {
      type: 'short_text',
      question: 'What is your name?',
      required: true,
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should validate long_text question', () => {
    const question = {
      type: 'long_text',
      question: 'Describe your situation',
      required: false,
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should validate multiple_choice question with valid options', () => {
    const question = {
      type: 'multiple_choice',
      question: 'Select one option',
      required: true,
      options: ['Option 1', 'Option 2'],
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should reject multiple_choice with less than 2 options', () => {
    const question = {
      type: 'multiple_choice',
      question: 'Select one option',
      required: true,
      options: ['Only one option'],
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });

  it('should validate checkboxes question with valid options', () => {
    const question = {
      type: 'checkboxes',
      question: 'Select all that apply',
      required: true,
      options: ['Option 1'],
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should reject checkboxes with empty options array', () => {
    const question = {
      type: 'checkboxes',
      question: 'Select all that apply',
      required: true,
      options: [],
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });

  it('should validate file_upload question', () => {
    const question = {
      type: 'file_upload',
      question: 'Upload your document',
      required: true,
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should validate date question', () => {
    const question = {
      type: 'date',
      question: 'When did this occur?',
      required: false,
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(true);
  });

  it('should reject question without required fields', () => {
    const question = {
      type: 'short_text',
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });

  it('should reject multiple_choice without options', () => {
    const question = {
      type: 'multiple_choice',
      question: 'Select one',
      required: true,
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });

  it('should reject checkboxes without options', () => {
    const question = {
      type: 'checkboxes',
      question: 'Select all',
      required: true,
    };
    const result = questionSchema.safeParse(question);
    expect(result.success).toBe(false);
  });
});

describe('infoRequestSchema', () => {
  it('should validate info request with required fields', () => {
    const request = {
      intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
      questions: [
        {
          type: 'short_text',
          question: 'What is your name?',
          required: true,
        },
      ],
    };
    const result = infoRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should validate info request with optional fields', () => {
    const request = {
      intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
      questions: [
        {
          type: 'short_text',
          question: 'What is your name?',
          required: true,
        },
      ],
      message: 'Please provide the following information',
      documents: ['doc1.pdf', 'doc2.pdf'],
      deadline: '2025-12-31T23:59:59Z',
    };
    const result = infoRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should reject info request with empty questions array', () => {
    const request = {
      intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
      questions: [],
    };
    const result = infoRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should reject info request without intakeResponseId', () => {
    const request = {
      questions: [
        {
          type: 'short_text',
          question: 'What is your name?',
          required: true,
        },
      ],
    };
    const result = infoRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it('should validate multiple questions with different types', () => {
    const request = {
      intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
      questions: [
        {
          type: 'short_text',
          question: 'Name?',
          required: true,
        },
        {
          type: 'multiple_choice',
          question: 'Choose one',
          required: true,
          options: ['A', 'B', 'C'],
        },
        {
          type: 'date',
          question: 'When?',
          required: false,
        },
      ],
    };
    const result = infoRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });
});

describe('infoResponseSchema', () => {
  it('should validate info response with required fields', () => {
    const response = {
      infoRequestId: '123e4567-e89b-12d3-a456-426614174000',
      responses: {
        question1: 'Answer 1',
        question2: 'Answer 2',
      },
    };
    const result = infoResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should validate info response with empty responses', () => {
    const response = {
      infoRequestId: '123e4567-e89b-12d3-a456-426614174000',
      responses: {},
    };
    const result = infoResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should reject info response without infoRequestId', () => {
    const response = {
      responses: {
        question1: 'Answer 1',
      },
    };
    const result = infoResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should reject info response without responses field', () => {
    const response = {
      infoRequestId: '123e4567-e89b-12d3-a456-426614174000',
    };
    const result = infoResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it('should validate responses with various value types', () => {
    const response = {
      infoRequestId: '123e4567-e89b-12d3-a456-426614174000',
      responses: {
        text: 'Some text',
        number: 42,
        array: ['item1', 'item2'],
        date: '2025-12-31',
      },
    };
    const result = infoResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
