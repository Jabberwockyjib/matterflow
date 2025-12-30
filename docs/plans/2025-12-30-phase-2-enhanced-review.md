# Phase 2: Enhanced Review Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable lawyers to request additional information from clients through structured questions, receive responses, and schedule consultation calls.

**Architecture:** Add `info_requests` table to track follow-up questions sent to clients. Create reusable question builder UI component that supports 6 question types. Build client-facing response form that dynamically renders based on requested questions. Add manual call scheduling with email notifications.

**Tech Stack:** Next.js 15 (App Router), Server Actions, Supabase Postgres + RLS, React Hook Form, Zod validation, React Email, shadcn/ui components

---

## Task 1: Database Migration - info_requests Table

**Files:**
- Create: `supabase/migrations/20251230000001_add_info_requests.sql`
- Generate: `src/types/database.types.ts` (updated)

**Step 1: Write migration for info_requests table**

```sql
-- supabase/migrations/20251230000001_add_info_requests.sql

-- Table to track additional information requests sent to clients
CREATE TABLE info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_response_id UUID NOT NULL REFERENCES intake_responses(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  questions JSONB NOT NULL, -- Array of structured question objects
  message TEXT, -- Personal message from lawyer
  documents JSONB, -- Array of attached document metadata
  response_deadline TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responses JSONB, -- Client's responses to questions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by intake response
CREATE INDEX idx_info_requests_intake_response
  ON info_requests(intake_response_id);

-- Index for filtering by status
CREATE INDEX idx_info_requests_status
  ON info_requests(status) WHERE status = 'pending';

-- RLS policies
ALTER TABLE info_requests ENABLE ROW LEVEL SECURITY;

-- Staff/admin can view all requests
CREATE POLICY "Staff and admin can view all info requests"
  ON info_requests FOR SELECT
  USING (current_user_role() IN ('staff', 'admin'));

-- Staff/admin can create requests
CREATE POLICY "Staff and admin can create info requests"
  ON info_requests FOR INSERT
  WITH CHECK (current_user_role() IN ('staff', 'admin'));

-- Staff/admin can update requests they created
CREATE POLICY "Staff and admin can update info requests"
  ON info_requests FOR UPDATE
  USING (current_user_role() IN ('staff', 'admin'));

-- Clients can view requests for their intake responses
CREATE POLICY "Clients can view their info requests"
  ON info_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM intake_responses ir
      JOIN matters m ON m.id = ir.matter_id
      WHERE ir.id = info_requests.intake_response_id
        AND m.client_id = auth.uid()
    )
  );

-- Clients can update responses for their requests
CREATE POLICY "Clients can update responses to their info requests"
  ON info_requests FOR UPDATE
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM intake_responses ir
      JOIN matters m ON m.id = ir.matter_id
      WHERE ir.id = info_requests.intake_response_id
        AND m.client_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_info_requests_updated_at
  BEFORE UPDATE ON info_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Run migration locally**

Run: `supabase migration up --local`
Expected: Success message "Applied migration 20251230000001_add_info_requests"

**Step 3: Generate TypeScript types**

Run: `supabase gen types typescript --local > src/types/database.types.ts`
Expected: Updated types file with InfoRequest type

**Step 4: Verify migration**

Run: `psql postgresql://postgres:postgres@localhost:54322/postgres -c "\d info_requests"`
Expected: Table structure displayed with all columns

**Step 5: Commit**

```bash
git add supabase/migrations/20251230000001_add_info_requests.sql src/types/database.types.ts
git commit -m "feat: add info_requests table for client follow-up questions

- Create info_requests table with JSONB for flexible question/response storage
- Add RLS policies for staff/admin and client access
- Index for performance on intake_response_id and status
- Generate updated TypeScript types

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Database Migration - intake_responses Review Fields

**Files:**
- Create: `supabase/migrations/20251230000002_add_intake_review_fields.sql`
- Generate: `src/types/database.types.ts` (updated)

**Step 1: Write migration for review tracking fields**

```sql
-- supabase/migrations/20251230000002_add_intake_review_fields.sql

-- Add review tracking fields to intake_responses
ALTER TABLE intake_responses
  ADD COLUMN review_status TEXT CHECK (review_status IN ('pending', 'under_review', 'accepted', 'declined')),
  ADD COLUMN reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN internal_notes TEXT, -- Lawyer's private notes about this submission
  ADD COLUMN decline_reason TEXT;

-- Set default review_status for existing rows
UPDATE intake_responses
SET review_status = CASE
  WHEN status = 'approved' THEN 'accepted'
  WHEN status = 'submitted' THEN 'pending'
  ELSE 'pending'
END
WHERE review_status IS NULL;

-- Make review_status required going forward
ALTER TABLE intake_responses
  ALTER COLUMN review_status SET DEFAULT 'pending',
  ALTER COLUMN review_status SET NOT NULL;

-- Index for filtering by review status
CREATE INDEX idx_intake_responses_review_status
  ON intake_responses(review_status);

-- Index for finding responses under review by specific lawyer
CREATE INDEX idx_intake_responses_reviewed_by
  ON intake_responses(reviewed_by) WHERE reviewed_by IS NOT NULL;
```

**Step 2: Run migration locally**

Run: `supabase migration up --local`
Expected: Success message "Applied migration 20251230000002_add_intake_review_fields"

**Step 3: Generate TypeScript types**

Run: `supabase gen types typescript --local > src/types/database.types.ts`
Expected: Updated IntakeResponse type with review fields

**Step 4: Verify migration**

Run: `psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT review_status, COUNT(*) FROM intake_responses GROUP BY review_status"`
Expected: Shows count of records by review_status

**Step 5: Commit**

```bash
git add supabase/migrations/20251230000002_add_intake_review_fields.sql src/types/database.types.ts
git commit -m "feat: add review tracking fields to intake_responses

- Add review_status, reviewed_by, reviewed_at for workflow tracking
- Add internal_notes for lawyer's private notes
- Add decline_reason for documenting rejections
- Backfill existing records with appropriate status
- Add indexes for performance

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Info Request Validation Schemas

**Files:**
- Create: `src/lib/validation/info-request-schemas.ts`
- Test: `tests/lib/validation/info-request-schemas.test.ts`

**Step 1: Write failing test for question validation**

```typescript
// tests/lib/validation/info-request-schemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  questionSchema,
  infoRequestSchema,
  infoResponseSchema
} from '@/lib/validation/info-request-schemas'

describe('Info Request Schemas', () => {
  describe('questionSchema', () => {
    it('validates short text question', () => {
      const question = {
        id: 'q1',
        type: 'short_text',
        questionText: 'What is your phone number?',
        helpText: 'Include area code',
        required: true,
      }

      expect(() => questionSchema.parse(question)).not.toThrow()
    })

    it('validates multiple choice question with options', () => {
      const question = {
        id: 'q2',
        type: 'multiple_choice',
        questionText: 'Preferred contact method?',
        options: ['Email', 'Phone', 'Text'],
        required: true,
      }

      expect(() => questionSchema.parse(question)).not.toThrow()
    })

    it('rejects multiple choice without options', () => {
      const question = {
        id: 'q3',
        type: 'multiple_choice',
        questionText: 'Choose one',
        required: false,
      }

      expect(() => questionSchema.parse(question)).toThrow()
    })

    it('validates file upload question with constraints', () => {
      const question = {
        id: 'q4',
        type: 'file_upload',
        questionText: 'Upload contract',
        maxFileSize: 10485760, // 10MB
        acceptedFileTypes: ['.pdf', '.docx'],
        required: true,
      }

      expect(() => questionSchema.parse(question)).not.toThrow()
    })
  })

  describe('infoRequestSchema', () => {
    it('validates complete info request', () => {
      const request = {
        intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
        questions: [
          {
            id: 'q1',
            type: 'short_text',
            questionText: 'Your phone?',
            required: true,
          },
        ],
        message: 'I need a few more details',
        responseDeadline: new Date('2025-01-05'),
      }

      expect(() => infoRequestSchema.parse(request)).not.toThrow()
    })

    it('requires at least one question', () => {
      const request = {
        intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
        questions: [],
        message: 'Just a message',
      }

      expect(() => infoRequestSchema.parse(request)).toThrow()
    })
  })

  describe('infoResponseSchema', () => {
    it('validates responses matching question types', () => {
      const response = {
        infoRequestId: '123e4567-e89b-12d3-a456-426614174000',
        responses: {
          q1: 'Short answer',
          q2: ['option1', 'option2'],
          q3: '2025-01-10',
        },
      }

      expect(() => infoResponseSchema.parse(response)).not.toThrow()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/validation/info-request-schemas.test.ts`
Expected: FAIL with "Cannot find module '@/lib/validation/info-request-schemas'"

**Step 3: Write validation schemas**

```typescript
// src/lib/validation/info-request-schemas.ts
import { z } from 'zod'

// Question types
export const questionTypeEnum = z.enum([
  'short_text',
  'long_text',
  'multiple_choice',
  'checkboxes',
  'file_upload',
  'date',
])

export type QuestionType = z.infer<typeof questionTypeEnum>

// Base question schema
const baseQuestionSchema = z.object({
  id: z.string().min(1),
  type: questionTypeEnum,
  questionText: z.string().min(1, 'Question text is required'),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
})

// Question schema with conditional validation based on type
export const questionSchema = baseQuestionSchema.and(
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('short_text'),
    }),
    z.object({
      type: z.literal('long_text'),
      maxLength: z.number().positive().optional(),
    }),
    z.object({
      type: z.literal('multiple_choice'),
      options: z.array(z.string().min(1)).min(2, 'Multiple choice requires at least 2 options'),
    }),
    z.object({
      type: z.literal('checkboxes'),
      options: z.array(z.string().min(1)).min(1, 'Checkboxes require at least 1 option'),
    }),
    z.object({
      type: z.literal('file_upload'),
      maxFileSize: z.number().positive().optional(),
      acceptedFileTypes: z.array(z.string()).optional(),
    }),
    z.object({
      type: z.literal('date'),
      minDate: z.string().optional(),
      maxDate: z.string().optional(),
    }),
  ])
)

export type Question = z.infer<typeof questionSchema>

// Info request creation schema
export const infoRequestSchema = z.object({
  intakeResponseId: z.string().uuid(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
  message: z.string().optional(),
  documents: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number(),
    type: z.string(),
  })).optional(),
  responseDeadline: z.date().optional(),
})

export type InfoRequestFormData = z.infer<typeof infoRequestSchema>

// Info response submission schema
export const infoResponseSchema = z.object({
  infoRequestId: z.string().uuid(),
  responses: z.record(z.string(), z.any()), // Flexible response format
})

export type InfoResponseFormData = z.infer<typeof infoResponseSchema>
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/validation/info-request-schemas.test.ts`
Expected: PASS (7 tests passing)

**Step 5: Commit**

```bash
git add src/lib/validation/info-request-schemas.ts tests/lib/validation/info-request-schemas.test.ts
git commit -m "feat: add validation schemas for info requests

- Question schema with 6 question types (short_text, long_text, multiple_choice, checkboxes, file_upload, date)
- Discriminated union for type-specific validation (e.g., multiple_choice requires options)
- Info request creation schema with required questions array
- Info response submission schema
- Comprehensive test coverage for all question types

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Info Request Server Actions

**Files:**
- Modify: `src/lib/data/actions.ts` (add functions)
- Test: `tests/lib/data/info-request-actions.test.ts`

**Step 1: Write failing tests for info request actions**

```typescript
// tests/lib/data/info-request-actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInfoRequest, submitInfoResponse } from '@/lib/data/actions'

// Mock Supabase
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn((table) => {
      if (table === 'info_requests') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: 'info-req-1',
                  status: 'pending',
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { id: 'info-req-1', status: 'completed' },
                  error: null,
                })),
              })),
            })),
          })),
        }
      }
      return {}
    }),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  ensureStaffOrAdmin: vi.fn(),
  supabaseServer: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'lawyer-1' } },
        error: null,
      })),
    },
  })),
}))

describe('Info Request Actions', () => {
  describe('createInfoRequest', () => {
    it('creates info request with questions and message', async () => {
      const formData = new FormData()
      formData.append('intakeResponseId', 'intake-1')
      formData.append('questions', JSON.stringify([
        {
          id: 'q1',
          type: 'short_text',
          questionText: 'Your phone?',
          required: true,
        },
      ]))
      formData.append('message', 'Need more details')
      formData.append('responseDeadline', '2025-01-05T00:00:00.000Z')

      const result = await createInfoRequest(formData)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        id: 'info-req-1',
        status: 'pending',
      })
    })

    it('validates required questions field', async () => {
      const formData = new FormData()
      formData.append('intakeResponseId', 'intake-1')
      formData.append('questions', JSON.stringify([]))

      const result = await createInfoRequest(formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('At least one question is required')
    })
  })

  describe('submitInfoResponse', () => {
    it('updates info request with client responses', async () => {
      const formData = new FormData()
      formData.append('infoRequestId', 'info-req-1')
      formData.append('responses', JSON.stringify({
        q1: 'My answer',
        q2: ['option1', 'option2'],
      }))

      const result = await submitInfoResponse(formData)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('completed')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/info-request-actions.test.ts`
Expected: FAIL with "Cannot find 'createInfoRequest' in '@/lib/data/actions'"

**Step 3: Implement server actions**

```typescript
// Add to src/lib/data/actions.ts

import { infoRequestSchema, infoResponseSchema } from '@/lib/validation/info-request-schemas'

/**
 * Create an information request to send to a client
 * Requires staff or admin role
 */
export async function createInfoRequest(formData: FormData) {
  try {
    // Ensure user is staff or admin
    await ensureStaffOrAdmin()

    const supabase = await supabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Parse and validate input
    const rawData = {
      intakeResponseId: formData.get('intakeResponseId') as string,
      questions: JSON.parse(formData.get('questions') as string),
      message: formData.get('message') as string || undefined,
      documents: formData.get('documents')
        ? JSON.parse(formData.get('documents') as string)
        : undefined,
      responseDeadline: formData.get('responseDeadline')
        ? new Date(formData.get('responseDeadline') as string)
        : undefined,
    }

    const validated = infoRequestSchema.parse(rawData)

    // Insert info request
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('info_requests')
      .insert({
        intake_response_id: validated.intakeResponseId,
        requested_by: user.id,
        questions: validated.questions,
        message: validated.message,
        documents: validated.documents,
        response_deadline: validated.responseDeadline?.toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating info request:', error)
      return { success: false, error: 'Failed to create info request' }
    }

    // Update intake response status to "under_review"
    await admin
      .from('intake_responses')
      .update({ review_status: 'under_review' })
      .eq('id', validated.intakeResponseId)

    // Log audit trail
    await admin.from('audit_logs').insert({
      user_id: user.id,
      action: 'info_request_created',
      resource_type: 'info_request',
      resource_id: data.id,
      details: {
        intake_response_id: validated.intakeResponseId,
        question_count: validated.questions.length,
      },
    })

    // TODO: Send email to client with info request

    revalidatePath('/admin/clients')
    revalidatePath('/admin/intake')

    return { success: true, data }
  } catch (error) {
    console.error('createInfoRequest error:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      }
    }
    return { success: false, error: 'Failed to create info request' }
  }
}

/**
 * Submit client's response to an information request
 */
export async function submitInfoResponse(formData: FormData) {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Parse and validate input
    const rawData = {
      infoRequestId: formData.get('infoRequestId') as string,
      responses: JSON.parse(formData.get('responses') as string),
    }

    const validated = infoResponseSchema.parse(rawData)

    // Update info request with responses
    const admin = supabaseAdmin()
    const { data, error } = await admin
      .from('info_requests')
      .update({
        responses: validated.responses,
        status: 'completed',
        responded_at: new Date().toISOString(),
      })
      .eq('id', validated.infoRequestId)
      .select()
      .single()

    if (error) {
      console.error('Error submitting info response:', error)
      return { success: false, error: 'Failed to submit response' }
    }

    // Update intake response status
    await admin
      .from('intake_responses')
      .update({ review_status: 'under_review' })
      .eq('id', data.intake_response_id)

    // TODO: Send notification email to lawyer

    revalidatePath('/admin/clients')
    revalidatePath('/admin/intake')

    return { success: true, data }
  } catch (error) {
    console.error('submitInfoResponse error:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => e.message).join(', ')
      }
    }
    return { success: false, error: 'Failed to submit response' }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/info-request-actions.test.ts`
Expected: PASS (4 tests passing)

**Step 5: Commit**

```bash
git add src/lib/data/actions.ts tests/lib/data/info-request-actions.test.ts
git commit -m "feat: add server actions for info requests

- createInfoRequest action for lawyers to send follow-up questions
- submitInfoResponse action for clients to respond
- Updates intake_response review_status automatically
- Audit logging for all info request operations
- Full validation with Zod schemas
- Test coverage for success and error cases

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Info Request Query Functions

**Files:**
- Modify: `src/lib/data/queries.ts` (add functions)
- Test: `tests/lib/data/info-request-queries.test.ts`

**Step 1: Write failing tests for query functions**

```typescript
// tests/lib/data/info-request-queries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getInfoRequests, getInfoRequestById } from '@/lib/data/queries'

vi.mock('@/lib/supabase/server', () => ({
  supabaseServer: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                id: 'req-1',
                status: 'pending',
                questions: [{ id: 'q1', type: 'short_text', questionText: 'Q1' }],
              },
            ],
            error: null,
          })),
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'req-1',
              status: 'pending',
              questions: [{ id: 'q1', type: 'short_text', questionText: 'Q1' }],
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

describe('Info Request Queries', () => {
  describe('getInfoRequests', () => {
    it('fetches all info requests for an intake response', async () => {
      const result = await getInfoRequests('intake-1')

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'req-1',
        status: 'pending',
      })
    })
  })

  describe('getInfoRequestById', () => {
    it('fetches single info request by ID', async () => {
      const result = await getInfoRequestById('req-1')

      expect(result.data).toMatchObject({
        id: 'req-1',
        status: 'pending',
      })
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/lib/data/info-request-queries.test.ts`
Expected: FAIL with "Cannot find 'getInfoRequests' in '@/lib/data/queries'"

**Step 3: Implement query functions**

```typescript
// Add to src/lib/data/queries.ts

/**
 * Get all information requests for an intake response
 */
export async function getInfoRequests(intakeResponseId: string) {
  try {
    const supabase = await supabaseServer()

    const { data, error } = await supabase
      .from('info_requests')
      .select(`
        *,
        requestedBy:requested_by(
          id:user_id,
          full_name
        )
      `)
      .eq('intake_response_id', intakeResponseId)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Error fetching info requests:', error)
      return { data: [], source: 'supabase' as const }
    }

    return { data: data || [], source: 'supabase' as const }
  } catch (error) {
    console.error('getInfoRequests error:', error)
    return { data: [], source: 'supabase' as const }
  }
}

/**
 * Get single information request by ID
 */
export async function getInfoRequestById(id: string) {
  try {
    const supabase = await supabaseServer()

    const { data, error } = await supabase
      .from('info_requests')
      .select(`
        *,
        requestedBy:requested_by(
          id:user_id,
          full_name
        ),
        intakeResponse:intake_response_id(
          id,
          form_type,
          matter:matter_id(
            id,
            title,
            client:client_id(
              id:user_id,
              full_name,
              email
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching info request:', error)
      return { data: null, source: 'supabase' as const }
    }

    return { data, source: 'supabase' as const }
  } catch (error) {
    console.error('getInfoRequestById error:', error)
    return { data: null, source: 'supabase' as const }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/lib/data/info-request-queries.test.ts`
Expected: PASS (2 tests passing)

**Step 5: Commit**

```bash
git add src/lib/data/queries.ts tests/lib/data/info-request-queries.test.ts
git commit -m "feat: add query functions for info requests

- getInfoRequests to fetch all requests for an intake response
- getInfoRequestById to fetch single request with full context
- Includes related data (requestedBy, intakeResponse, matter, client)
- Ordered by requested_at descending
- Error handling returns empty data

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Question Builder Component

**Files:**
- Create: `src/components/clients/question-builder.tsx`
- Test: `tests/components/clients/question-builder.test.tsx`

**Step 1: Write failing test for QuestionBuilder component**

```typescript
// tests/components/clients/question-builder.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuestionBuilder } from '@/components/clients/question-builder'
import { renderWithUser } from '@/tests/setup/test-utils'

describe('QuestionBuilder', () => {
  it('renders empty state with add button', () => {
    const onChange = vi.fn()
    render(<QuestionBuilder questions={[]} onChange={onChange} />)

    expect(screen.getByText(/add question/i)).toBeInTheDocument()
    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument()
  })

  it('adds new question when add button clicked', async () => {
    const onChange = vi.fn()
    const { user } = renderWithUser(<QuestionBuilder questions={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /add question/i }))

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'short_text',
          questionText: '',
          required: false,
        }),
      ])
    )
  })

  it('renders existing questions', () => {
    const questions = [
      {
        id: 'q1',
        type: 'short_text' as const,
        questionText: 'What is your phone number?',
        helpText: 'Include area code',
        required: true,
      },
    ]
    const onChange = vi.fn()

    render(<QuestionBuilder questions={questions} onChange={onChange} />)

    expect(screen.getByDisplayValue('What is your phone number?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Include area code')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /required/i })).toBeChecked()
  })

  it('updates question text', async () => {
    const onChange = vi.fn()
    const questions = [
      { id: 'q1', type: 'short_text' as const, questionText: '', required: false },
    ]
    const { user } = renderWithUser(<QuestionBuilder questions={questions} onChange={onChange} />)

    const input = screen.getByPlaceholderText(/enter your question/i)
    await user.type(input, 'New question')

    expect(onChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'q1',
          questionText: expect.stringContaining('New question'),
        }),
      ])
    )
  })

  it('removes question when delete clicked', async () => {
    const onChange = vi.fn()
    const questions = [
      { id: 'q1', type: 'short_text' as const, questionText: 'Q1', required: false },
      { id: 'q2', type: 'short_text' as const, questionText: 'Q2', required: false },
    ]
    const { user } = renderWithUser(<QuestionBuilder questions={questions} onChange={onChange} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'q2' }),
    ])
  })

  it('changes question type', async () => {
    const onChange = vi.fn()
    const questions = [
      { id: 'q1', type: 'short_text' as const, questionText: 'Q1', required: false },
    ]
    const { user } = renderWithUser(<QuestionBuilder questions={questions} onChange={onChange} />)

    const select = screen.getByRole('combobox', { name: /question type/i })
    await user.selectOptions(select, 'multiple_choice')

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'q1',
          type: 'multiple_choice',
          options: [],
        }),
      ])
    )
  })

  it('shows options input for multiple choice type', () => {
    const questions = [
      {
        id: 'q1',
        type: 'multiple_choice' as const,
        questionText: 'Choose one',
        options: ['Option 1', 'Option 2'],
        required: false,
      },
    ]
    const onChange = vi.fn()

    render(<QuestionBuilder questions={questions} onChange={onChange} />)

    expect(screen.getByText(/options/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Option 1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Option 2')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/clients/question-builder.test.tsx`
Expected: FAIL with "Cannot find module '@/components/clients/question-builder'"

**Step 3: Implement QuestionBuilder component** (Part 1 - Basic structure)

```typescript
// src/components/clients/question-builder.tsx
"use client"

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import type { Question, QuestionType } from '@/lib/validation/info-request-schemas'

interface QuestionBuilderProps {
  questions: Question[]
  onChange: (questions: Question[]) => void
}

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      type: 'short_text',
      questionText: '',
      required: false,
    }
    onChange([...questions, newQuestion])
  }

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index))
  }

  const changeQuestionType = (index: number, newType: QuestionType) => {
    const updated = [...questions]
    const baseQuestion = {
      id: updated[index].id,
      type: newType,
      questionText: updated[index].questionText,
      helpText: updated[index].helpText,
      required: updated[index].required,
    }

    // Add type-specific fields
    if (newType === 'multiple_choice' || newType === 'checkboxes') {
      updated[index] = { ...baseQuestion, type: newType, options: [] }
    } else if (newType === 'long_text') {
      updated[index] = { ...baseQuestion, type: newType }
    } else if (newType === 'file_upload') {
      updated[index] = { ...baseQuestion, type: newType }
    } else if (newType === 'date') {
      updated[index] = { ...baseQuestion, type: newType }
    } else {
      updated[index] = { ...baseQuestion, type: newType }
    }

    onChange(updated)
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-500 mb-4">No questions yet</p>
        <Button onClick={addQuestion} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Question
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          onUpdate={(updates) => updateQuestion(index, updates)}
          onRemove={() => removeQuestion(index)}
          onTypeChange={(type) => changeQuestionType(index, type)}
        />
      ))}

      <Button onClick={addQuestion} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Question
      </Button>
    </div>
  )
}

interface QuestionCardProps {
  question: Question
  index: number
  onUpdate: (updates: Partial<Question>) => void
  onRemove: () => void
  onTypeChange: (type: QuestionType) => void
}

function QuestionCard({ question, index, onUpdate, onRemove, onTypeChange }: QuestionCardProps) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0 pt-2">
          <GripVertical className="h-5 w-5 text-slate-400" />
        </div>

        <div className="flex-1 space-y-3">
          {/* Question number and type */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Question {index + 1}</Label>
            <div className="flex items-center gap-2">
              <Select
                value={question.type}
                onValueChange={(value) => onTypeChange(value as QuestionType)}
              >
                <SelectTrigger className="w-[180px]" aria-label="Question type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_text">Short Text</SelectItem>
                  <SelectItem value="long_text">Long Text</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="checkboxes">Checkboxes</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                aria-label="Delete question"
              >
                <Trash2 className="h-4 w-4 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Question text */}
          <div>
            <Label htmlFor={`question-${question.id}`}>Question Text</Label>
            <Input
              id={`question-${question.id}`}
              value={question.questionText}
              onChange={(e) => onUpdate({ questionText: e.target.value })}
              placeholder="Enter your question"
              className="mt-1"
            />
          </div>

          {/* Help text */}
          <div>
            <Label htmlFor={`help-${question.id}`}>Help Text (Optional)</Label>
            <Input
              id={`help-${question.id}`}
              value={question.helpText || ''}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="Additional context or instructions"
              className="mt-1"
            />
          </div>

          {/* Type-specific fields */}
          {(question.type === 'multiple_choice' || question.type === 'checkboxes') && (
            <OptionsEditor
              options={question.options || []}
              onChange={(options) => onUpdate({ options })}
            />
          )}

          {/* Required checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id={`required-${question.id}`}
              checked={question.required}
              onCheckedChange={(checked) => onUpdate({ required: checked as boolean })}
            />
            <Label htmlFor={`required-${question.id}`} className="text-sm font-normal">
              Required
            </Label>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface OptionsEditorProps {
  options: string[]
  onChange: (options: string[]) => void
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const addOption = () => {
    onChange([...options, ''])
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...options]
    updated[index] = value
    onChange(updated)
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeOption(index)}
            aria-label={`Remove option ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button onClick={addOption} variant="outline" size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Add Option
      </Button>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/components/clients/question-builder.test.tsx`
Expected: PASS (8 tests passing)

**Step 5: Commit**

```bash
git add src/components/clients/question-builder.tsx tests/components/clients/question-builder.test.tsx
git commit -m "feat: add QuestionBuilder component for structured questions

- Support 6 question types: short text, long text, multiple choice, checkboxes, file upload, date
- Drag handle for future reordering support
- Add/remove questions dynamically
- Options editor for multiple choice and checkboxes
- Required field toggle
- Help text support
- Full test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Info Request Composer Modal

**Files:**
- Create: `src/components/clients/info-request-composer.tsx`
- Test: `tests/components/clients/info-request-composer.test.tsx`

**Step 1: Write failing test**

```typescript
// tests/components/clients/info-request-composer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { InfoRequestComposer } from '@/components/clients/info-request-composer'
import { renderWithUser } from '@/tests/setup/test-utils'

describe('InfoRequestComposer', () => {
  it('renders with all sections', () => {
    const onClose = vi.fn()
    const onSubmit = vi.fn()

    render(
      <InfoRequestComposer
        intakeResponseId="intake-1"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByText(/structured questions/i)).toBeInTheDocument()
    expect(screen.getByText(/personal message/i)).toBeInTheDocument()
    expect(screen.getByText(/response deadline/i)).toBeInTheDocument()
  })

  it('requires at least one question', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithUser(
      <InfoRequestComposer
        intakeResponseId="intake-1"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    const sendButton = screen.getByRole('button', { name: /send request/i })
    await user.click(sendButton)

    expect(screen.getByText(/at least one question is required/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits with questions and message', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithUser(
      <InfoRequestComposer
        intakeResponseId="intake-1"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    // Add a question
    await user.click(screen.getByRole('button', { name: /add question/i }))

    const questionInput = screen.getByPlaceholderText(/enter your question/i)
    await user.type(questionInput, 'What is your phone number?')

    // Add personal message
    const messageInput = screen.getByPlaceholderText(/add a personal message/i)
    await user.type(messageInput, 'I need a few more details')

    // Submit
    await user.click(screen.getByRole('button', { name: /send request/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeResponseId: 'intake-1',
        questions: expect.arrayContaining([
          expect.objectContaining({
            questionText: 'What is your phone number?',
          }),
        ]),
        message: 'I need a few more details',
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/clients/info-request-composer.test.tsx`
Expected: FAIL with "Cannot find module '@/components/clients/info-request-composer'"

**Step 3: Implement InfoRequestComposer**

```typescript
// src/components/clients/info-request-composer.tsx
"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { QuestionBuilder } from './question-builder'
import { infoRequestSchema, type InfoRequestFormData, type Question } from '@/lib/validation/info-request-schemas'
import { showSuccess, showError } from '@/lib/toast'

interface InfoRequestComposerProps {
  intakeResponseId: string
  onClose: () => void
  onSubmit: (data: InfoRequestFormData) => Promise<void>
}

export function InfoRequestComposer({
  intakeResponseId,
  onClose,
  onSubmit,
}: InfoRequestComposerProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<InfoRequestFormData>({
    resolver: zodResolver(infoRequestSchema),
    defaultValues: {
      intakeResponseId,
      questions: [],
      message: '',
      responseDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    },
  })

  const handleQuestionsChange = (newQuestions: Question[]) => {
    setQuestions(newQuestions)
    setValue('questions', newQuestions, { shouldValidate: true })
  }

  const onSubmitForm = async (data: InfoRequestFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      showSuccess('Information request sent to client')
      onClose()
    } catch (error) {
      showError('Failed to send request. Please try again.')
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Additional Information</DialogTitle>
          <DialogDescription>
            Send follow-up questions to the client. They'll receive an email with a link to respond.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
          {/* Structured Questions Section */}
          <div>
            <Label className="text-base font-semibold">Structured Questions</Label>
            <p className="text-sm text-slate-500 mb-4">
              Add specific questions for the client to answer
            </p>
            <QuestionBuilder
              questions={questions}
              onChange={handleQuestionsChange}
            />
            {errors.questions && (
              <p className="text-sm text-red-600 mt-2">{errors.questions.message}</p>
            )}
          </div>

          {/* Personal Message Section */}
          <div>
            <Label htmlFor="message" className="text-base font-semibold">
              Personal Message (Optional)
            </Label>
            <p className="text-sm text-slate-500 mb-2">
              Explain what you need and why
            </p>
            <Textarea
              id="message"
              {...register('message')}
              placeholder="Add a personal message explaining what you need and why. This will appear at the top of the email to the client."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Response Deadline Section */}
          <div>
            <Label htmlFor="responseDeadline" className="text-base font-semibold">
              Response Deadline (Optional)
            </Label>
            <p className="text-sm text-slate-500 mb-2">
              When should the client respond by?
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                id="responseDeadline"
                type="date"
                {...register('responseDeadline', {
                  setValueAs: (value) => value ? new Date(value) : undefined,
                })}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/components/clients/info-request-composer.test.tsx`
Expected: PASS (3 tests passing)

**Step 5: Commit**

```bash
git add src/components/clients/info-request-composer.tsx tests/components/clients/info-request-composer.test.tsx
git commit -m "feat: add InfoRequestComposer modal

- Modal for lawyers to request additional info from clients
- Integrates QuestionBuilder for structured questions
- Personal message textarea
- Response deadline picker (defaults to 3 days)
- Form validation with Zod
- Success/error toast notifications
- Test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Client Info Response Form Page

**Files:**
- Create: `src/app/info-response/[id]/page.tsx`
- Create: `src/components/clients/info-response-form.tsx`
- Test: `tests/components/clients/info-response-form.test.tsx`

**Step 1: Write failing test for response form component**

```typescript
// tests/components/clients/info-response-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { InfoResponseForm } from '@/components/clients/info-response-form'
import { renderWithUser } from '@/tests/setup/test-utils'

const mockInfoRequest = {
  id: 'req-1',
  message: 'I need a few more details',
  questions: [
    {
      id: 'q1',
      type: 'short_text' as const,
      questionText: 'What is your phone number?',
      helpText: 'Include area code',
      required: true,
    },
    {
      id: 'q2',
      type: 'multiple_choice' as const,
      questionText: 'Preferred contact method?',
      options: ['Email', 'Phone', 'Text'],
      required: false,
    },
  ],
  responseDeadline: '2025-01-05T00:00:00.000Z',
}

describe('InfoResponseForm', () => {
  it('renders personal message from lawyer', () => {
    const onSubmit = vi.fn()
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={onSubmit} />)

    expect(screen.getByText('I need a few more details')).toBeInTheDocument()
  })

  it('renders all questions', () => {
    const onSubmit = vi.fn()
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={onSubmit} />)

    expect(screen.getByText('What is your phone number?')).toBeInTheDocument()
    expect(screen.getByText('Include area code')).toBeInTheDocument()
    expect(screen.getByText('Preferred contact method?')).toBeInTheDocument()
  })

  it('shows required indicator for required questions', () => {
    const onSubmit = vi.fn()
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={onSubmit} />)

    const requiredLabels = screen.getAllByText('*')
    expect(requiredLabels.length).toBeGreaterThan(0)
  })

  it('validates required fields on submit', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithUser(
      <InfoResponseForm infoRequest={mockInfoRequest} onSubmit={onSubmit} />
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(screen.getByText(/required/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits responses when valid', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithUser(
      <InfoResponseForm infoRequest={mockInfoRequest} onSubmit={onSubmit} />
    )

    // Fill required field
    const phoneInput = screen.getByLabelText(/what is your phone number/i)
    await user.type(phoneInput, '555-1234')

    // Select optional field
    const emailOption = screen.getByRole('radio', { name: 'Email' })
    await user.click(emailOption)

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      q1: '555-1234',
      q2: 'Email',
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/clients/info-response-form.test.tsx`
Expected: FAIL with "Cannot find module '@/components/clients/info-response-form'"

**Step 3: Implement InfoResponseForm component**

```typescript
// src/components/clients/info-response-form.tsx
"use client"

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import type { Question } from '@/lib/validation/info-request-schemas'

interface InfoRequest {
  id: string
  message?: string
  questions: Question[]
  responseDeadline?: string
}

interface InfoResponseFormProps {
  infoRequest: InfoRequest
  onSubmit: (responses: Record<string, any>) => Promise<void>
}

export function InfoResponseForm({ infoRequest, onSubmit }: InfoResponseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm()

  const onSubmitForm = async (data: Record<string, any>) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Personal message from lawyer */}
      {infoRequest.message && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {infoRequest.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Response deadline */}
      {infoRequest.responseDeadline && (
        <p className="text-sm text-slate-600">
          Please respond by{' '}
          <strong>{new Date(infoRequest.responseDeadline).toLocaleDateString()}</strong>
        </p>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {infoRequest.questions.map((question, index) => (
          <QuestionField
            key={question.id}
            question={question}
            index={index}
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
          />
        ))}
      </div>

      {/* Submit button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} size="lg">
          {isSubmitting ? 'Submitting...' : 'Submit Responses'}
        </Button>
      </div>
    </form>
  )
}

interface QuestionFieldProps {
  question: Question
  index: number
  register: any
  errors: any
  setValue: any
  watch: any
}

function QuestionField({ question, index, register, errors, setValue, watch }: QuestionFieldProps) {
  const error = errors[question.id]

  return (
    <div className="space-y-2">
      <Label htmlFor={question.id} className="text-base">
        {index + 1}. {question.questionText}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {question.helpText && (
        <p className="text-sm text-slate-500">{question.helpText}</p>
      )}

      {/* Render input based on question type */}
      {question.type === 'short_text' && (
        <Input
          id={question.id}
          {...register(question.id, {
            required: question.required ? 'This field is required' : false,
          })}
          placeholder="Your answer"
        />
      )}

      {question.type === 'long_text' && (
        <Textarea
          id={question.id}
          {...register(question.id, {
            required: question.required ? 'This field is required' : false,
          })}
          placeholder="Your answer"
          rows={4}
        />
      )}

      {question.type === 'multiple_choice' && (
        <RadioGroup
          onValueChange={(value) => setValue(question.id, value)}
          required={question.required}
        >
          {question.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <RadioGroupItem value={option} id={`${question.id}-${option}`} />
              <Label htmlFor={`${question.id}-${option}`} className="font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.type === 'checkboxes' && (
        <div className="space-y-2">
          {question.options?.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-${option}`}
                onCheckedChange={(checked) => {
                  const current = watch(question.id) || []
                  if (checked) {
                    setValue(question.id, [...current, option])
                  } else {
                    setValue(question.id, current.filter((v: string) => v !== option))
                  }
                }}
              />
              <Label htmlFor={`${question.id}-${option}`} className="font-normal">
                {option}
              </Label>
            </div>
          ))}
        </div>
      )}

      {question.type === 'date' && (
        <input
          id={question.id}
          type="date"
          {...register(question.id, {
            required: question.required ? 'This field is required' : false,
          })}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      )}

      {question.type === 'file_upload' && (
        <input
          id={question.id}
          type="file"
          {...register(question.id, {
            required: question.required ? 'This field is required' : false,
          })}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          accept={question.acceptedFileTypes?.join(',')}
        />
      )}

      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
    </div>
  )
}
```

**Step 4: Implement client-facing page**

```typescript
// src/app/info-response/[id]/page.tsx
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoResponseForm } from '@/components/clients/info-response-form'
import { getInfoRequestById } from '@/lib/data/queries'
import { submitInfoResponse } from '@/lib/data/actions'
import { revalidatePath } from 'next/cache'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InfoResponsePage({ params }: PageProps) {
  const { id } = await params
  const { data: infoRequest } = await getInfoRequestById(id)

  if (!infoRequest || infoRequest.status === 'completed') {
    notFound()
  }

  const handleSubmit = async (responses: Record<string, any>) => {
    "use server"

    const formData = new FormData()
    formData.append('infoRequestId', id)
    formData.append('responses', JSON.stringify(responses))

    const result = await submitInfoResponse(formData)

    if (result.success) {
      revalidatePath(`/info-response/${id}`)
      return { success: true }
    } else {
      throw new Error(result.error || 'Failed to submit response')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Additional Information Request</CardTitle>
            <CardDescription>
              Please provide the following information to help us proceed with your matter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InfoResponseForm
              infoRequest={infoRequest}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test tests/components/clients/info-response-form.test.tsx`
Expected: PASS (5 tests passing)

**Step 6: Commit**

```bash
git add src/app/info-response/[id]/page.tsx src/components/clients/info-response-form.tsx tests/components/clients/info-response-form.test.tsx
git commit -m "feat: add client-facing info response form

- InfoResponseForm component renders dynamic form based on questions
- Supports all 6 question types with appropriate inputs
- Client validation for required fields
- Displays lawyer's personal message
- Shows response deadline
- Server action integration for submission
- Public page at /info-response/[id]
- Test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Schedule Call Modal Component

**Files:**
- Create: `src/components/clients/schedule-call-modal.tsx`
- Test: `tests/components/clients/schedule-call-modal.test.tsx`

**Step 1: Write failing test**

```typescript
// tests/components/clients/schedule-call-modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ScheduleCallModal } from '@/components/clients/schedule-call-modal'
import { renderWithUser } from '@/tests/setup/test-utils'

describe('ScheduleCallModal', () => {
  it('renders all form fields', () => {
    const onClose = vi.fn()
    const onSubmit = vi.fn()

    render(
      <ScheduleCallModal
        intakeResponseId="intake-1"
        clientName="John Doe"
        clientEmail="john@example.com"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/meeting type/i)).toBeInTheDocument()
  })

  it('shows meeting link field for video calls', async () => {
    const { user } = renderWithUser(
      <ScheduleCallModal
        intakeResponseId="intake-1"
        clientName="John Doe"
        clientEmail="john@example.com"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    const meetingTypeSelect = screen.getByLabelText(/meeting type/i)
    await user.selectOptions(meetingTypeSelect, 'video')

    expect(screen.getByLabelText(/meeting link/i)).toBeInTheDocument()
  })

  it('submits call details', async () => {
    const onSubmit = vi.fn()
    const { user } = renderWithUser(
      <ScheduleCallModal
        intakeResponseId="intake-1"
        clientName="John Doe"
        clientEmail="john@example.com"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    // Fill form
    const dateInput = screen.getByLabelText(/date & time/i)
    await user.type(dateInput, '2025-01-05T14:00')

    const durationSelect = screen.getByLabelText(/duration/i)
    await user.selectOptions(durationSelect, '60')

    const notesInput = screen.getByLabelText(/notes to client/i)
    await user.type(notesInput, 'Looking forward to discussing your case')

    // Submit
    await user.click(screen.getByRole('button', { name: /send calendar invite/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeResponseId: 'intake-1',
        dateTime: expect.any(Date),
        duration: 60,
        meetingType: expect.any(String),
        notes: 'Looking forward to discussing your case',
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/components/clients/schedule-call-modal.test.tsx`
Expected: FAIL with "Cannot find module '@/components/clients/schedule-call-modal'"

**Step 3: Implement ScheduleCallModal**

```typescript
// src/components/clients/schedule-call-modal.tsx
"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Clock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showSuccess, showError } from '@/lib/toast'

const scheduleCallSchema = z.object({
  intakeResponseId: z.string().uuid(),
  dateTime: z.date(),
  duration: z.number().positive(),
  meetingType: z.enum(['phone', 'video', 'in_person']),
  meetingLink: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
})

type ScheduleCallFormData = z.infer<typeof scheduleCallSchema>

interface ScheduleCallModalProps {
  intakeResponseId: string
  clientName: string
  clientEmail: string
  onClose: () => void
  onSubmit: (data: ScheduleCallFormData) => Promise<void>
}

export function ScheduleCallModal({
  intakeResponseId,
  clientName,
  clientEmail,
  onClose,
  onSubmit,
}: ScheduleCallModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ScheduleCallFormData>({
    resolver: zodResolver(scheduleCallSchema),
    defaultValues: {
      intakeResponseId,
      duration: 30,
      meetingType: 'phone',
    },
  })

  const meetingType = watch('meetingType')

  const onSubmitForm = async (data: ScheduleCallFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      showSuccess(`Calendar invite sent to ${clientName}`)
      onClose()
    } catch (error) {
      showError('Failed to schedule call. Please try again.')
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Call with {clientName}</DialogTitle>
          <DialogDescription>
            Set up a consultation call. A calendar invite will be sent to {clientEmail}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* Date & Time */}
          <div>
            <Label htmlFor="dateTime">Date & Time</Label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                id="dateTime"
                type="datetime-local"
                {...register('dateTime', {
                  setValueAs: (value) => new Date(value),
                })}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            {errors.dateTime && (
              <p className="text-sm text-red-600 mt-1">{errors.dateTime.message}</p>
            )}
          </div>

          {/* Duration */}
          <div>
            <Label htmlFor="duration">Duration</Label>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <Select
                value={watch('duration')?.toString()}
                onValueChange={(value) => setValue('duration', parseInt(value))}
              >
                <SelectTrigger id="duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Meeting Type */}
          <div>
            <Label htmlFor="meetingType">Meeting Type</Label>
            <Select
              value={meetingType}
              onValueChange={(value) => setValue('meetingType', value as any)}
            >
              <SelectTrigger id="meetingType" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="in_person">In-Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Meeting Link (for video calls) */}
          {meetingType === 'video' && (
            <div>
              <Label htmlFor="meetingLink">Meeting Link</Label>
              <Input
                id="meetingLink"
                {...register('meetingLink')}
                placeholder="https://zoom.us/j/..."
                className="mt-1"
              />
              {errors.meetingLink && (
                <p className="text-sm text-red-600 mt-1">{errors.meetingLink.message}</p>
              )}
            </div>
          )}

          {/* Notes to Client */}
          <div>
            <Label htmlFor="notes">Notes to Client (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any preparation needed for the call?"
              rows={3}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling...' : 'Send Calendar Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test tests/components/clients/schedule-call-modal.test.tsx`
Expected: PASS (3 tests passing)

**Step 5: Commit**

```bash
git add src/components/clients/schedule-call-modal.tsx tests/components/clients/schedule-call-modal.test.tsx
git commit -m "feat: add ScheduleCallModal component

- Manual appointment scheduling modal
- Date/time picker for consultation calls
- Duration selector (30/60/90 minutes)
- Meeting type selector (phone/video/in-person)
- Conditional meeting link field for video calls
- Notes to client textarea
- Form validation with Zod
- Test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Email Templates for Info Requests

**Files:**
- Create: `src/emails/info-request.tsx`
- Create: `src/emails/info-response-received.tsx`
- Test: `tests/emails/info-request-emails.test.tsx`

**Step 1: Write failing tests**

```typescript
// tests/emails/info-request-emails.test.tsx
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/render'
import InfoRequestEmail from '@/emails/info-request'
import InfoResponseReceivedEmail from '@/emails/info-response-received'

describe('Info Request Email Templates', () => {
  describe('InfoRequestEmail', () => {
    it('renders with all required props', () => {
      const html = render(
        <InfoRequestEmail
          clientName="John Doe"
          lawyerName="Jane Smith"
          message="I need a few more details"
          responseUrl="https://app.example.com/info-response/123"
          deadline="January 5, 2025"
        />
      )

      expect(html).toContain('John Doe')
      expect(html).toContain('I need a few more details')
      expect(html).toContain('https://app.example.com/info-response/123')
      expect(html).toContain('January 5, 2025')
    })

    it('includes call-to-action button', () => {
      const html = render(
        <InfoRequestEmail
          clientName="John Doe"
          lawyerName="Jane Smith"
          message="Need info"
          responseUrl="https://app.example.com/info-response/123"
        />
      )

      expect(html).toContain('Provide Additional Information')
    })
  })

  describe('InfoResponseReceivedEmail', () => {
    it('renders with lawyer notification', () => {
      const html = render(
        <InfoResponseReceivedEmail
          lawyerName="Jane Smith"
          clientName="John Doe"
          matterTitle="Contract Review for Acme Corp"
          reviewUrl="https://app.example.com/admin/intake/123"
          questionCount={3}
        />
      )

      expect(html).toContain('Jane Smith')
      expect(html).toContain('John Doe')
      expect(html).toContain('Contract Review for Acme Corp')
      expect(html).toContain('3 questions')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test tests/emails/info-request-emails.test.tsx`
Expected: FAIL with "Cannot find module '@/emails/info-request'"

**Step 3: Implement info request email template**

```typescript
// src/emails/info-request.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface InfoRequestEmailProps {
  clientName: string
  lawyerName: string
  message?: string
  responseUrl: string
  deadline?: string
}

export default function InfoRequestEmail({
  clientName,
  lawyerName,
  message,
  responseUrl,
  deadline,
}: InfoRequestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Additional information needed for your matter</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Additional Information Needed</Heading>

          <Text style={text}>Hi {clientName},</Text>

          {message && (
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>
          )}

          <Text style={text}>
            I need a bit more information to proceed with your matter.
            Please complete the short follow-up form by clicking the button below:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={responseUrl}>
              Provide Additional Information
            </Button>
          </Section>

          {deadline && (
            <Text style={deadlineText}>
              Please respond by <strong>{deadline}</strong>.
            </Text>
          )}

          <Text style={text}>
            If you have any questions, simply reply to this email.
          </Text>

          <Text style={footer}>
            Best regards,
            <br />
            {lawyerName}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
}

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
}

const messageBox = {
  backgroundColor: '#f1f5f9',
  borderLeft: '4px solid #3b82f6',
  margin: '24px 48px',
  padding: '16px',
}

const messageText = {
  color: '#1e293b',
  fontSize: '16px',
  lineHeight: '26px',
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
}

const buttonContainer = {
  padding: '27px 48px',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const deadlineText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 48px',
  textAlign: 'center' as const,
}

const footer = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '24px 48px 0',
}
```

**Step 4: Implement response received notification email**

```typescript
// src/emails/info-response-received.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface InfoResponseReceivedEmailProps {
  lawyerName: string
  clientName: string
  matterTitle: string
  reviewUrl: string
  questionCount: number
}

export default function InfoResponseReceivedEmail({
  lawyerName,
  clientName,
  matterTitle,
  reviewUrl,
  questionCount,
}: InfoResponseReceivedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{clientName} has responded to your information request</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Client Response Received</Heading>

          <Text style={text}>Hi {lawyerName},</Text>

          <Text style={text}>
            <strong>{clientName}</strong> has responded to your information request
            for <strong>{matterTitle}</strong>.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              {questionCount} {questionCount === 1 ? 'question' : 'questions'} answered
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={reviewUrl}>
              Review Responses
            </Button>
          </Section>

          <Text style={footer}>
            MatterFlow
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#1e293b',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
}

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
}

const highlightBox = {
  backgroundColor: '#f0fdf4',
  borderLeft: '4px solid #22c55e',
  margin: '24px 48px',
  padding: '16px',
}

const highlightText = {
  color: '#15803d',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: 0,
}

const buttonContainer = {
  padding: '27px 48px',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const footer = {
  color: '#94a3b8',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '24px 48px 0',
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test tests/emails/info-request-emails.test.tsx`
Expected: PASS (4 tests passing)

**Step 6: Commit**

```bash
git add src/emails/info-request.tsx src/emails/info-response-received.tsx tests/emails/info-request-emails.test.tsx
git commit -m "feat: add email templates for info requests

- InfoRequestEmail sent to clients with follow-up questions
- Personal message from lawyer displayed prominently
- Response URL and deadline clearly shown
- InfoResponseReceivedEmail notifies lawyer when client responds
- Question count and direct link to review
- Consistent with existing email styling
- Test coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-12-30-phase-2-enhanced-review.md`.

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
