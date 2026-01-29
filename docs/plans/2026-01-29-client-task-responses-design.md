# Client Task Responses Design

## Overview

Enable clients to respond to tasks assigned to them from the My Matters page. Supports document uploads, information requests, confirmations, and general tasks with a unified response flow.

## Requirements

- Clients can view and respond to tasks assigned to them (responsible_party = 'client')
- Task types: Document Upload, Information Request, Confirmation, General
- Inline response on My Matters page (expand task card)
- Confirmations auto-complete; other types require lawyer review
- Lawyer notified via email + dashboard "Tasks to Review" section
- File uploads integrate with existing Google Drive system

## Database Changes

### 1. Extend `tasks` table

```sql
ALTER TABLE tasks
ADD COLUMN task_type text NOT NULL DEFAULT 'general'
  CHECK (task_type IN ('document_upload', 'information_request', 'confirmation', 'general'));

ALTER TABLE tasks
ADD COLUMN instructions text;

COMMENT ON COLUMN tasks.task_type IS 'Type of response expected from client';
COMMENT ON COLUMN tasks.instructions IS 'Detailed instructions for the client on what is needed';
```

### 2. Create `task_responses` table

```sql
CREATE TABLE task_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES profiles(user_id),
  response_text text,
  confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
  reviewer_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_responses_task ON task_responses(task_id);
CREATE INDEX idx_task_responses_submitted_by ON task_responses(submitted_by);
CREATE INDEX idx_task_responses_status ON task_responses(status);

ALTER TABLE task_responses ENABLE ROW LEVEL SECURITY;

-- Clients can view responses for tasks on their matters
CREATE POLICY "task_responses_select_policy" ON task_responses FOR SELECT
USING (
  submitted_by = auth.uid()
  OR current_user_role() IN ('admin', 'staff')
);

-- Clients can insert responses for tasks assigned to them
CREATE POLICY "task_responses_insert_policy" ON task_responses FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN matters m ON t.matter_id = m.id
    WHERE t.id = task_id
    AND t.responsible_party = 'client'
    AND m.client_id = auth.uid()
  )
);

-- Staff/admin can update responses (approve/reject)
CREATE POLICY "task_responses_update_policy" ON task_responses FOR UPDATE
USING (current_user_role() IN ('admin', 'staff'));

CREATE TRIGGER update_task_responses_updated_at
  BEFORE UPDATE ON task_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Extend `documents` table

```sql
ALTER TABLE documents
ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_task ON documents(task_id);
```

### 4. Extend `tasks` table status

```sql
-- Update status check to include pending_review
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'pending_review', 'done', 'cancelled'));
```

## Client UI

### My Matters Page (`/my-matters`)

Task cards become expandable:

**Collapsed state:**
- Task title
- Task type icon (visual indicator)
- Due date + overdue badge
- Status badge: "Action Needed" | "Pending Review" | "Completed"
- Click anywhere or "Respond" button to expand

**Expanded state - Confirmation:**
- Instructions text (from task.instructions)
- "I Confirm" button
- On click: creates response with confirmed_at, marks task done immediately

**Expanded state - Standard Response (document_upload, information_request, general):**
- Instructions text
- Text area (required for information_request, optional label "Add notes" for others)
- File dropzone (multiple files allowed)
- "Submit Response" button
- On submit: creates response, sets task status to pending_review, notifies lawyer

**Post-submission state:**
- Shows submitted response (read-only)
- Shows uploaded file list with links
- Status: "Pending Review" or "Approved"

## Lawyer UI

### Task Creation Form

Add to existing TaskForm component:

```
Task Type: [Dropdown]
- Document Upload
- Information Request
- Confirmation
- General (default)

Instructions: [Textarea]
"What do you need from the client?"
```

### Dashboard - Tasks to Review Section

New section between existing dashboard cards:

```
┌─────────────────────────────────────────┐
│ Tasks to Review (3)                     │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Upload W-2 Forms                    │ │
│ │ Smith Employment Matter • Jane Doe  │ │
│ │ Submitted 2 hours ago               │ │
│ │ [Expand to review]                  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Confirm settlement amount           │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Expanded review view:**
- Client's response text
- List of uploaded documents (clickable links)
- "Approve" button → marks task done, notifies client
- "Request Revision" button → shows text input for notes, keeps task open, notifies client

### Matter Detail Page

Task list shows response status indicator:
- No response: (no indicator)
- Pending review: yellow dot
- Approved: green checkmark

## Server Actions

### `submitTaskResponse`

```typescript
async function submitTaskResponse(data: {
  taskId: string;
  responseText?: string;
  isConfirmation?: boolean;
}): Promise<{ success: boolean; error?: string }>
```

- Validates client owns the matter
- Creates task_response record
- If confirmation: sets confirmed_at, marks task done
- Otherwise: sets task status to pending_review
- Triggers email notification to lawyer (non-confirmation only)
- Logs to audit_logs

### `approveTaskResponse`

```typescript
async function approveTaskResponse(
  responseId: string
): Promise<{ success: boolean; error?: string }>
```

- Updates response status to 'approved'
- Sets task status to 'done'
- Sends approval email to client
- Logs to audit_logs

### `requestTaskRevision`

```typescript
async function requestTaskRevision(
  responseId: string,
  notes: string
): Promise<{ success: boolean; error?: string }>
```

- Updates response status to 'rejected'
- Stores reviewer_notes
- Sets task status back to 'open'
- Sends revision request email to client
- Logs to audit_logs

## Queries

### `fetchTasksForReview`

Returns tasks with pending_review status for dashboard section.

### `fetchTaskResponse`

Returns response for a specific task, including uploaded documents.

### `fetchTasksForClient` (update existing)

Include task_type, instructions, and response status in returned data.

## Email Notifications

### Task Response Submitted (to lawyer)

- Subject: "Client response: {task title}"
- Body: Matter name, task title, response preview, link to dashboard

### Task Approved (to client)

- Subject: "Task completed: {task title}"
- Body: Task title, matter name, confirmation message

### Revision Requested (to client)

- Subject: "Action needed: {task title}"
- Body: Task title, lawyer's notes, link to My Matters

## File Upload Flow

1. Client selects files in dropzone
2. On form submit, files upload to Google Drive (matter's "01 Source Docs" folder)
3. Document records created with task_id set
4. Response record created linking to task
5. Documents visible in matter documents list and task response view

## Implementation Order

1. Database migration (task columns + task_responses table + documents.task_id)
2. Update TaskForm with task_type and instructions
3. Update queries (fetchTasksForClient, fetchTasksForReview, fetchTaskResponse)
4. Create server actions (submitTaskResponse, approveTaskResponse, requestTaskRevision)
5. Build TaskResponseForm component
6. Update My Matters page with expandable task cards
7. Add "Tasks to Review" dashboard section
8. Add email templates and notifications
9. Update matter detail page task indicators

## Out of Scope

- Task response history (only latest response stored)
- Client-to-client task assignment
- Recurring tasks
- Task templates
