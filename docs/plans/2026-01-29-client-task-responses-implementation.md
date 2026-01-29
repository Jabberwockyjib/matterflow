# Client Task Responses Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable clients to respond to assigned tasks from the My Matters page with text responses and file uploads.

**Architecture:** Extend the tasks table with type/instructions columns, add task_responses table for client submissions, create inline expandable response forms on My Matters page, add "Tasks to Review" dashboard section for lawyers.

**Tech Stack:** Next.js 15, Supabase (Postgres + RLS), React Hook Form, Zod, Google Drive API for file uploads, React Email for notifications.

---

## Task 1: Database Migration - Extend Tasks Table

**Files:**
- Create: `supabase/migrations/20260129000001_task_responses.sql`

**Step 1: Write the migration SQL**

```sql
-- Add task_type and instructions columns to tasks table
ALTER TABLE tasks
ADD COLUMN task_type text NOT NULL DEFAULT 'general'
  CHECK (task_type IN ('document_upload', 'information_request', 'confirmation', 'general'));

ALTER TABLE tasks
ADD COLUMN instructions text;

COMMENT ON COLUMN tasks.task_type IS 'Type of response expected from client';
COMMENT ON COLUMN tasks.instructions IS 'Detailed instructions for the client on what is needed';

-- Update status check to include pending_review
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'pending_review', 'done', 'cancelled'));

-- Create task_responses table
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

-- Add task_id to documents table for linking uploads to tasks
ALTER TABLE documents ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX idx_documents_task ON documents(task_id);

-- Enable RLS
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

-- Trigger for updated_at
CREATE TRIGGER update_task_responses_updated_at
  BEFORE UPDATE ON task_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration to production**

Run: `mcp__supabase-therapy__apply_migration` with name `task_responses` and the SQL above.

**Step 3: Regenerate TypeScript types**

Run: `pnpm supabase gen types typescript --project-id <project-id> > src/types/database.types.ts`

Or use MCP: `mcp__supabase-therapy__generate_typescript_types`

**Step 4: Commit**

```bash
git add supabase/migrations/20260129000001_task_responses.sql src/types/database.types.ts
git commit -m "feat: add task_responses table and extend tasks schema"
```

---

## Task 2: Update Validation Schemas

**Files:**
- Modify: `src/lib/validation/schemas.ts`

**Step 1: Add task type values and update task status values**

Add after line 109 (after `responsiblePartyValues`):

```typescript
export const taskTypeValues = ["document_upload", "information_request", "confirmation", "general"] as const;
export const taskStatusValues = ["open", "pending_review", "done", "cancelled"] as const;
export const taskResponseStatusValues = ["submitted", "approved", "rejected"] as const;
```

**Step 2: Add task response schema**

Add after `taskCreateSchema` (around line 282):

```typescript
export const taskResponseSchema = z.object({
  taskId: requiredUuid("Task ID"),
  responseText: optionalString,
  isConfirmation: z.boolean().optional(),
});

export type TaskResponseFormData = z.infer<typeof taskResponseSchema>;

export const approveTaskResponseSchema = z.object({
  responseId: requiredUuid("Response ID"),
});

export const rejectTaskResponseSchema = z.object({
  responseId: requiredUuid("Response ID"),
  notes: requiredString("Revision notes"),
});
```

**Step 3: Commit**

```bash
git add src/lib/validation/schemas.ts
git commit -m "feat: add task response validation schemas"
```

---

## Task 3: Update TaskForm Component

**Files:**
- Modify: `src/components/forms/TaskForm.tsx`

**Step 1: Add task type to schema**

Update `taskFormSchema` to include task_type and instructions:

```typescript
const taskFormSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .min(1, { error: "Title is required" }),
  matterId: z
    .string({ error: "Please select a matter" })
    .min(1, { error: "Please select a matter" }),
  dueDate: z.string().optional(),
  responsibleParty: z.enum(responsiblePartyValues, {
    error: "Please select a responsible party",
  }),
  taskType: z.enum(["document_upload", "information_request", "confirmation", "general"], {
    error: "Please select a task type",
  }),
  instructions: z.string().optional(),
});
```

**Step 2: Add task type options**

```typescript
const taskTypeOptions = [
  { value: "general", label: "General" },
  { value: "document_upload", label: "Document Upload" },
  { value: "information_request", label: "Information Request" },
  { value: "confirmation", label: "Confirmation" },
];
```

**Step 3: Update defaultValues**

```typescript
defaultValues: {
  title: "",
  matterId: "",
  dueDate: "",
  responsibleParty: "lawyer",
  taskType: "general",
  instructions: "",
},
```

**Step 4: Update form fields and onSubmit**

Add to onSubmit:
```typescript
formData.append("taskType", data.taskType);
if (data.instructions) {
  formData.append("instructions", data.instructions);
}
```

Add to form JSX (after responsibleParty select):
```tsx
<FormSelect
  label="Task Type"
  options={taskTypeOptions}
  registration={register("taskType")}
  error={errors.taskType}
  required
/>
<div className="md:col-span-2">
  <FormInput
    label="Instructions for Client"
    placeholder="What do you need from the client?"
    registration={register("instructions")}
    error={errors.instructions}
    as="textarea"
  />
</div>
```

**Step 5: Commit**

```bash
git add src/components/forms/TaskForm.tsx
git commit -m "feat: add task type and instructions to TaskForm"
```

---

## Task 4: Update createTask Server Action

**Files:**
- Modify: `src/lib/data/actions.ts`

**Step 1: Update createTask to handle new fields**

Find `createTask` function (around line 541) and update to extract and save task_type and instructions:

```typescript
export async function createTask(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();
    const title = (formData.get("title") as string) || "New Task";
    const matterId = formData.get("matterId") as string;
    const dueDate = (formData.get("dueDate") as string) || null;
    const responsible = (formData.get("responsibleParty") as string) || "lawyer";
    const taskType = (formData.get("taskType") as string) || "general";
    const instructions = (formData.get("instructions") as string) || null;

    if (!matterId) {
      return { error: "Matter ID is required" };
    }

    const { data: newTask, error } = await supabase.from("tasks").insert({
      title,
      matter_id: matterId,
      due_date: dueDate,
      responsible_party: responsible,
      task_type: taskType,
      instructions,
      status: "open",
    }).select("id").single();

    // ... rest of function unchanged
```

**Step 2: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: update createTask to handle task_type and instructions"
```

---

## Task 5: Add Task Response Server Actions

**Files:**
- Modify: `src/lib/data/actions.ts`

**Step 1: Add submitTaskResponse action**

Add after existing task actions:

```typescript
/**
 * Submit a client response to a task
 * For confirmations: auto-completes the task
 * For other types: sets task to pending_review
 */
export async function submitTaskResponse(formData: FormData): Promise<ActionResult> {
  const { session, profile } = await getSessionWithProfile();
  if (!session) {
    return { error: "Unauthorized: please sign in" };
  }
  if (profile?.role !== "client") {
    return { error: "Only clients can submit task responses" };
  }

  try {
    const supabase = ensureSupabase();
    const taskId = formData.get("taskId") as string;
    const responseText = (formData.get("responseText") as string) || null;
    const isConfirmation = formData.get("isConfirmation") === "true";

    if (!taskId) {
      return { error: "Task ID is required" };
    }

    // Verify task belongs to client's matter and is assigned to client
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        task_type,
        status,
        responsible_party,
        matter_id,
        matters!inner(id, client_id, title)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return { error: "Task not found" };
    }

    const matter = task.matters as { id: string; client_id: string | null; title: string };
    if (matter.client_id !== session.user.id) {
      return { error: "You do not have access to this task" };
    }

    if (task.responsible_party !== "client") {
      return { error: "This task is not assigned to you" };
    }

    if (task.status !== "open") {
      return { error: "This task has already been responded to" };
    }

    // Create the response
    const { data: response, error: responseError } = await supabase
      .from("task_responses")
      .insert({
        task_id: taskId,
        submitted_by: session.user.id,
        response_text: responseText,
        confirmed_at: isConfirmation ? new Date().toISOString() : null,
        status: "submitted",
      })
      .select("id")
      .single();

    if (responseError) {
      return { error: responseError.message };
    }

    // Update task status
    const newTaskStatus = isConfirmation ? "done" : "pending_review";
    await supabase
      .from("tasks")
      .update({ status: newTaskStatus })
      .eq("id", taskId);

    // Log audit
    await logAudit({
      supabase,
      actorId: session.user.id,
      eventType: "task_response_submitted",
      entityType: "task_response",
      entityId: response.id,
      metadata: { taskId, isConfirmation },
    });

    // Send email notification to lawyer (if not a confirmation that auto-completed)
    if (!isConfirmation) {
      try {
        await sendTaskResponseNotification(taskId, task.title, matter.title, profile?.full_name || "Client");
      } catch (emailError) {
        console.error("Failed to send task response notification:", emailError);
        // Don't fail the action if email fails
      }
    }

    revalidatePath("/my-matters");
    revalidatePath("/dashboard");
    revalidatePath(`/matters/${matter.id}`);

    return { ok: true, data: { responseId: response.id } };
  } catch (error) {
    console.error("Submit task response error:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit response" };
  }
}

/**
 * Approve a task response (staff/admin only)
 */
export async function approveTaskResponse(responseId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    // Get response and task
    const { data: response, error: responseError } = await supabase
      .from("task_responses")
      .select(`
        id,
        task_id,
        submitted_by,
        tasks!inner(id, title, matter_id)
      `)
      .eq("id", responseId)
      .single();

    if (responseError || !response) {
      return { error: "Response not found" };
    }

    // Update response status
    await supabase
      .from("task_responses")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: roleCheck.session.user.id,
      })
      .eq("id", responseId);

    // Update task to done
    const task = response.tasks as { id: string; title: string; matter_id: string };
    await supabase
      .from("tasks")
      .update({ status: "done" })
      .eq("id", task.id);

    // Log audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_response_approved",
      entityType: "task_response",
      entityId: responseId,
      metadata: { taskId: task.id },
    });

    // Send approval email to client
    try {
      await sendTaskApprovalEmail(response.submitted_by, task.title);
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    revalidatePath("/dashboard");
    revalidatePath(`/matters/${task.matter_id}`);

    return { ok: true };
  } catch (error) {
    console.error("Approve task response error:", error);
    return { error: error instanceof Error ? error.message : "Failed to approve response" };
  }
}

/**
 * Request revision on a task response (staff/admin only)
 */
export async function requestTaskRevision(responseId: string, notes: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  if (!notes || notes.trim().length === 0) {
    return { error: "Revision notes are required" };
  }

  try {
    const supabase = ensureSupabase();

    // Get response and task
    const { data: response, error: responseError } = await supabase
      .from("task_responses")
      .select(`
        id,
        task_id,
        submitted_by,
        tasks!inner(id, title, matter_id)
      `)
      .eq("id", responseId)
      .single();

    if (responseError || !response) {
      return { error: "Response not found" };
    }

    // Update response status
    await supabase
      .from("task_responses")
      .update({
        status: "rejected",
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: roleCheck.session.user.id,
      })
      .eq("id", responseId);

    // Set task back to open
    const task = response.tasks as { id: string; title: string; matter_id: string };
    await supabase
      .from("tasks")
      .update({ status: "open" })
      .eq("id", task.id);

    // Log audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "task_revision_requested",
      entityType: "task_response",
      entityId: responseId,
      metadata: { taskId: task.id, notes },
    });

    // Send revision email to client
    try {
      await sendTaskRevisionEmail(response.submitted_by, task.title, notes);
    } catch (emailError) {
      console.error("Failed to send revision email:", emailError);
    }

    revalidatePath("/my-matters");
    revalidatePath("/dashboard");
    revalidatePath(`/matters/${task.matter_id}`);

    return { ok: true };
  } catch (error) {
    console.error("Request task revision error:", error);
    return { error: error instanceof Error ? error.message : "Failed to request revision" };
  }
}
```

**Step 2: Add placeholder email functions (implement in Task 9)**

```typescript
// Placeholder - implement in email task
async function sendTaskResponseNotification(taskId: string, taskTitle: string, matterTitle: string, clientName: string) {
  // TODO: Implement in Task 9
  console.log("TODO: Send task response notification", { taskId, taskTitle, matterTitle, clientName });
}

async function sendTaskApprovalEmail(clientUserId: string, taskTitle: string) {
  // TODO: Implement in Task 9
  console.log("TODO: Send task approval email", { clientUserId, taskTitle });
}

async function sendTaskRevisionEmail(clientUserId: string, taskTitle: string, notes: string) {
  // TODO: Implement in Task 9
  console.log("TODO: Send task revision email", { clientUserId, taskTitle, notes });
}
```

**Step 3: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: add task response server actions"
```

---

## Task 6: Add Query Functions

**Files:**
- Modify: `src/lib/data/queries.ts`

**Step 1: Add ClientTaskSummary type update**

Update the `ClientTaskSummary` type (around where `fetchTasksForClient` is defined):

```typescript
export type ClientTaskSummary = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  matterId: string;
  matterTitle: string;
  taskType: string;
  instructions: string | null;
  response: {
    id: string;
    responseText: string | null;
    confirmedAt: string | null;
    status: string;
    reviewerNotes: string | null;
    submittedAt: string;
  } | null;
  documents: Array<{
    id: string;
    title: string;
    webViewLink: string | null;
  }>;
};
```

**Step 2: Update fetchTasksForClient**

Update the query to include task_type, instructions, and response data:

```typescript
export async function fetchTasksForClient(): Promise<{
  data: ClientTaskSummary[];
  source: DataSource;
  error?: string;
}> {
  const { session, profile } = await getSessionWithProfile();

  if (!session || profile?.role !== "client") {
    return { data: [], source: "mock" };
  }

  if (!supabaseEnvReady()) {
    return { data: [], source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        status,
        matter_id,
        responsible_party,
        task_type,
        instructions,
        matters!inner(id, title, client_id),
        task_responses(
          id,
          response_text,
          confirmed_at,
          status,
          reviewer_notes,
          submitted_at
        ),
        documents(
          id,
          title,
          web_view_link
        )
      `)
      .eq("responsible_party", "client")
      .eq("matters.client_id", session.user.id)
      .in("status", ["open", "pending_review", "done"])
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      return { data: [], source: "supabase", error: error.message };
    }

    const tasks: ClientTaskSummary[] = (data || []).map((task) => {
      const matter = task.matters as { id: string; title: string; client_id: string };
      const responses = task.task_responses as Array<{
        id: string;
        response_text: string | null;
        confirmed_at: string | null;
        status: string;
        reviewer_notes: string | null;
        submitted_at: string;
      }>;
      const latestResponse = responses?.[0] || null;
      const docs = (task.documents as Array<{
        id: string;
        title: string;
        web_view_link: string | null;
      }>) || [];

      return {
        id: task.id,
        title: task.title,
        dueDate: task.due_date,
        status: task.status,
        matterId: matter.id,
        matterTitle: matter.title,
        taskType: task.task_type || "general",
        instructions: task.instructions,
        response: latestResponse ? {
          id: latestResponse.id,
          responseText: latestResponse.response_text,
          confirmedAt: latestResponse.confirmed_at,
          status: latestResponse.status,
          reviewerNotes: latestResponse.reviewer_notes,
          submittedAt: latestResponse.submitted_at,
        } : null,
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          webViewLink: d.web_view_link,
        })),
      };
    });

    return { data: tasks, source: "supabase" };
  } catch (error) {
    return {
      data: [],
      source: "supabase",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

**Step 3: Add fetchTasksForReview query**

```typescript
export type TaskForReview = {
  id: string;
  taskId: string;
  taskTitle: string;
  matterId: string;
  matterTitle: string;
  clientName: string | null;
  responseText: string | null;
  submittedAt: string;
  documents: Array<{
    id: string;
    title: string;
    webViewLink: string | null;
  }>;
};

export async function fetchTasksForReview(): Promise<{
  data: TaskForReview[];
  source: DataSource;
  error?: string;
}> {
  const { profile } = await getSessionWithProfile();

  if (profile?.role === "client") {
    return { data: [], source: "mock" };
  }

  if (!supabaseEnvReady()) {
    return { data: [], source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("task_responses")
      .select(`
        id,
        response_text,
        submitted_at,
        tasks!inner(
          id,
          title,
          matter_id,
          matters!inner(
            id,
            title,
            client_id,
            profiles:client_id(full_name)
          )
        ),
        documents:documents!task_id(
          id,
          title,
          web_view_link
        )
      `)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true });

    if (error) {
      return { data: [], source: "supabase", error: error.message };
    }

    const reviews: TaskForReview[] = (data || []).map((response) => {
      const task = response.tasks as {
        id: string;
        title: string;
        matter_id: string;
        matters: {
          id: string;
          title: string;
          client_id: string;
          profiles: { full_name: string | null } | null;
        };
      };
      const docs = (response.documents as Array<{
        id: string;
        title: string;
        web_view_link: string | null;
      }>) || [];

      return {
        id: response.id,
        taskId: task.id,
        taskTitle: task.title,
        matterId: task.matters.id,
        matterTitle: task.matters.title,
        clientName: task.matters.profiles?.full_name || null,
        responseText: response.response_text,
        submittedAt: response.submitted_at,
        documents: docs.map((d) => ({
          id: d.id,
          title: d.title,
          webViewLink: d.web_view_link,
        })),
      };
    });

    return { data: reviews, source: "supabase" };
  } catch (error) {
    return {
      data: [],
      source: "supabase",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/data/queries.ts
git commit -m "feat: add task response query functions"
```

---

## Task 7: Create TaskResponseForm Component

**Files:**
- Create: `src/components/forms/TaskResponseForm.tsx`

**Step 1: Write the component**

```tsx
"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, FileText, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-field";
import { submitTaskResponse } from "@/lib/data/actions";
import { showFormSuccess, showFormError } from "@/lib/toast";

const responseSchema = z.object({
  responseText: z.string().optional(),
});

type ResponseFormData = z.infer<typeof responseSchema>;

interface UploadedFile {
  id: string;
  name: string;
  webViewLink?: string;
}

interface TaskResponseFormProps {
  taskId: string;
  taskType: string;
  instructions: string | null;
  matterId: string;
  onSuccess?: () => void;
}

export function TaskResponseForm({
  taskId,
  taskType,
  instructions,
  matterId,
  onSuccess,
}: TaskResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConfirmation = taskType === "confirmation";
  const requiresText = taskType === "information_request";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResponseFormData>({
    resolver: zodResolver(
      requiresText
        ? responseSchema.extend({
            responseText: z.string().min(1, "Response is required"),
          })
        : responseSchema
    ),
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("matterId", matterId);
        formData.append("taskId", taskId);

        const response = await fetch("/api/tasks/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.ok) {
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: result.data.documentId,
              name: file.name,
              webViewLink: result.data.webViewLink,
            },
          ]);
        } else {
          showFormError("File", "upload");
        }
      } catch (error) {
        console.error("Upload error:", error);
        showFormError("File", "upload");
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const onSubmit = async (data: ResponseFormData) => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("taskId", taskId);
      if (data.responseText) {
        formData.append("responseText", data.responseText);
      }
      formData.append("isConfirmation", String(isConfirmation));

      const result = await submitTaskResponse(formData);

      if (result.error) {
        showFormError("Response", "submit");
      } else {
        showFormSuccess("Response", "submitted");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Submit error:", error);
      showFormError("Response", "submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("taskId", taskId);
      formData.append("isConfirmation", "true");

      const result = await submitTaskResponse(formData);

      if (result.error) {
        showFormError("Confirmation", "submit");
      } else {
        showFormSuccess("Task", "completed");
        onSuccess?.();
      }
    } catch (error) {
      console.error("Confirm error:", error);
      showFormError("Confirmation", "submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation-only form
  if (isConfirmation) {
    return (
      <div className="space-y-4">
        {instructions && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
            {instructions}
          </div>
        )}
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              I Confirm
            </>
          )}
        </Button>
      </div>
    );
  }

  // Standard response form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {instructions && (
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
          {instructions}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {requiresText ? "Your Response *" : "Notes (optional)"}
        </label>
        <textarea
          {...register("responseText")}
          className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={
            requiresText
              ? "Please provide your response..."
              : "Add any notes or comments..."
          }
        />
        {errors.responseText && (
          <p className="mt-1 text-sm text-red-600">
            {errors.responseText.message}
          </p>
        )}
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Attachments
        </label>
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Upload className="h-6 w-6" />
              <span className="text-sm">
                Click to upload or drag and drop files
              </span>
            </div>
          )}
        </div>

        {/* Uploaded files list */}
        {uploadedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-700">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          "Submit Response"
        )}
      </Button>
    </form>
  );
}

export default TaskResponseForm;
```

**Step 2: Commit**

```bash
git add src/components/forms/TaskResponseForm.tsx
git commit -m "feat: create TaskResponseForm component"
```

---

## Task 8: Create Task Upload API Route

**Files:**
- Create: `src/app/api/tasks/upload/route.ts`

**Step 1: Write the route**

```typescript
/**
 * API route for uploading files for task responses
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { uploadFileToDrive } from "@/lib/google-drive/documents";
import type { Json } from "@/types/database.types";

async function getPracticeRefreshToken(): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("practice_settings")
    .select("google_refresh_token")
    .limit(1)
    .maybeSingle();
  return data?.google_refresh_token || null;
}

async function getMatterFolderId(matterId: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("matter_folders")
    .select("folder_structure, matter_folder_id")
    .eq("matter_id", matterId)
    .maybeSingle();

  if (!data) return null;

  // Try to find "01 Source Docs" folder, fall back to matter folder
  const folderStructure = data.folder_structure as Record<string, { id: string }> | null;
  const sourceDocsFolder =
    folderStructure?.["01 Source Docs"] ||
    folderStructure?.["01_Source_Docs"];

  return sourceDocsFolder?.id || data.matter_folder_id || null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const matterId = formData.get("matterId") as string;
    const taskId = formData.get("taskId") as string;
    const file = formData.get("file") as File;

    if (!matterId || !taskId || !file) {
      return NextResponse.json(
        { ok: false, error: "Matter ID, Task ID, and file are required" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // Get practice Google refresh token
    const refreshToken = await getPracticeRefreshToken();
    if (!refreshToken) {
      return NextResponse.json(
        { ok: false, error: "Google Drive not connected" },
        { status: 400 }
      );
    }

    // Get folder ID
    const folderId = await getMatterFolderId(matterId);
    if (!folderId) {
      return NextResponse.json(
        { ok: false, error: "Matter folders not initialized" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Drive
    const uploadResult = await uploadFileToDrive(
      refreshToken,
      {
        name: file.name,
        mimeType: file.type,
        buffer,
      },
      folderId,
      "Uploaded via task response"
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || "Upload failed" },
        { status: 500 }
      );
    }

    // Store document metadata with task_id reference
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        matter_id: matterId,
        task_id: taskId,
        title: file.name,
        drive_file_id: uploadResult.fileId!,
        folder_path: "01 Source Docs",
        version: 1,
        status: "uploaded",
        web_view_link: uploadResult.webViewLink || null,
        metadata: {
          mimeType: file.type,
          size: file.size,
          uploadedVia: "task_response",
        } as Json,
      })
      .select("id")
      .single();

    if (docError) {
      console.error("Error storing document metadata:", docError);
    }

    return NextResponse.json({
      ok: true,
      data: {
        documentId: document?.id || "",
        driveFileId: uploadResult.fileId!,
        webViewLink: uploadResult.webViewLink || "",
      },
    });
  } catch (error) {
    console.error("Task upload error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/tasks/upload/route.ts
git commit -m "feat: add task file upload API route"
```

---

## Task 9: Update My Matters Page with Expandable Tasks

**Files:**
- Modify: `src/app/my-matters/page.tsx`

**Step 1: Create client component for expandable task**

Create `src/app/my-matters/task-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CalendarClock, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskResponseForm } from "@/components/forms/TaskResponseForm";
import type { ClientTaskSummary } from "@/lib/data/queries";

interface TaskCardProps {
  task: ClientTaskSummary;
}

const taskTypeIcons: Record<string, string> = {
  document_upload: "📄",
  information_request: "❓",
  confirmation: "✓",
  general: "📝",
};

export function TaskCard({ task }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const hasResponse = task.response !== null;
  const isPendingReview = task.status === "pending_review";
  const isDone = task.status === "done";
  const needsRevision = task.response?.status === "rejected";

  const getStatusBadge = () => {
    if (isDone) {
      return <Badge variant="success">Completed</Badge>;
    }
    if (isPendingReview) {
      return <Badge variant="warning">Pending Review</Badge>;
    }
    if (needsRevision) {
      return <Badge variant="danger">Revision Needed</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="danger">Overdue</Badge>;
    }
    return <Badge variant="default">Action Needed</Badge>;
  };

  const canRespond = task.status === "open" || needsRevision;

  return (
    <div
      className={`bg-white rounded-lg border transition-all ${
        isOverdue && !isDone ? "border-red-200 bg-red-50/50" : "border-slate-200"
      }`}
    >
      {/* Header - always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{taskTypeIcons[task.taskType]}</span>
              <h3 className="font-medium text-slate-900">{task.title}</h3>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{task.matterTitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 text-sm ${
                  isOverdue && !isDone ? "text-red-600" : "text-slate-500"
                }`}
              >
                <CalendarClock className="h-4 w-4" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
            {getStatusBadge()}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          {/* Show revision notes if rejected */}
          {needsRevision && task.response?.reviewerNotes && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Revision Requested
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {task.response.reviewerNotes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show response form if can respond */}
          {canRespond && (
            <TaskResponseForm
              taskId={task.id}
              taskType={task.taskType}
              instructions={task.instructions}
              matterId={task.matterId}
              onSuccess={() => window.location.reload()}
            />
          )}

          {/* Show submitted response if pending review or done */}
          {hasResponse && !canRespond && (
            <div className="space-y-3">
              {task.response?.confirmedAt ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Confirmed on{" "}
                    {new Date(task.response.confirmedAt).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <>
                  {task.response?.responseText && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                        Your Response
                      </p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                        {task.response.responseText}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Show uploaded documents */}
              {task.documents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">
                    Attached Files
                  </p>
                  <div className="space-y-2">
                    {task.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.webViewLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700">{doc.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {isPendingReview && (
                <div className="flex items-center gap-2 text-amber-600 pt-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Awaiting review from your lawyer</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update My Matters page to use TaskCard**

Update `src/app/my-matters/page.tsx` to import and use the new component:

```tsx
import { TaskCard } from "./task-card";
// ... existing imports

// In the JSX, replace the tasks.map section:
{tasks.length > 0 && (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4">
      <CheckSquare className="h-5 w-5" />
      My Tasks
    </h2>
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/app/my-matters/page.tsx src/app/my-matters/task-card.tsx
git commit -m "feat: add expandable task cards with response forms to My Matters"
```

---

## Task 10: Add Tasks to Review Dashboard Section

**Files:**
- Create: `src/components/dashboard/tasks-to-review.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Create TasksToReview component**

```tsx
"use client";

import { useState } from "react";
import { ClipboardCheck, ChevronDown, ChevronUp, FileText, Check, X } from "lucide-react";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";
import { approveTaskResponse, requestTaskRevision } from "@/lib/data/actions";
import { showFormSuccess, showFormError } from "@/lib/toast";
import type { TaskForReview } from "@/lib/data/queries";

interface TasksToReviewProps {
  tasks: TaskForReview[];
}

function ReviewCard({ task }: { task: TaskForReview }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    const result = await approveTaskResponse(task.id);
    if (result.error) {
      showFormError("Response", "approve");
    } else {
      showFormSuccess("Response", "approved");
      window.location.reload();
    }
    setIsApproving(false);
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) return;
    setIsRequesting(true);
    const result = await requestTaskRevision(task.id, revisionNotes);
    if (result.error) {
      showFormError("Revision", "request");
    } else {
      showFormSuccess("Revision", "requested");
      window.location.reload();
    }
    setIsRequesting(false);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors">
      <div
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">
              {task.taskTitle}
            </h4>
            <p className="text-xs text-muted-foreground">
              {task.matterTitle} {task.clientName && `• ${task.clientName}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Submitted {new Date(task.submittedAt).toLocaleDateString()}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {/* Response text */}
          {task.responseText && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                Client Response
              </p>
              <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                {task.responseText}
              </p>
            </div>
          )}

          {/* Documents */}
          {task.documents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Attached Files ({task.documents.length})
              </p>
              <div className="space-y-2">
                {task.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.webViewLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{doc.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Revision form */}
          {showRevisionForm ? (
            <div className="space-y-3">
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Explain what changes are needed..."
                className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRequestRevision}
                  disabled={isRequesting || !revisionNotes.trim()}
                >
                  {isRequesting ? "Sending..." : "Send Revision Request"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionNotes("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApprove} disabled={isApproving}>
                <Check className="h-4 w-4 mr-1" />
                {isApproving ? "Approving..." : "Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
              >
                <X className="h-4 w-4 mr-1" />
                Request Revision
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TasksToReview({ tasks }: TasksToReviewProps) {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <ContentCard className="border-blue-200 dark:border-blue-800 mb-6">
      <ContentCardHeader>
        <ContentCardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Tasks to Review ({tasks.length})
        </ContentCardTitle>
      </ContentCardHeader>
      <ContentCardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <ReviewCard key={task.id} task={task} />
          ))}
        </div>
      </ContentCardContent>
    </ContentCard>
  );
}
```

**Step 2: Update dashboard page**

Add import and fetch call to `src/app/dashboard/page.tsx`:

```tsx
import { fetchTasksForReview } from "@/lib/data/queries";
import { TasksToReview } from "@/components/dashboard/tasks-to-review";

// In DashboardContent, add to Promise.all:
const [
  { data: matters, source, error },
  { data: awaitingReview },
  { data: awaitingIntake },
  { data: overdue },
  { data: tasksToReview },
] = await Promise.all([
  fetchMattersWithFilters(filters),
  fetchMattersAwaitingReview(),
  fetchMattersAwaitingIntake(),
  fetchOverdueMatters(),
  fetchTasksForReview(),
]);

// In the return JSX, add after NeedsAttention:
<TasksToReview tasks={tasksToReview} />
```

**Step 3: Commit**

```bash
git add src/components/dashboard/tasks-to-review.tsx src/app/dashboard/page.tsx
git commit -m "feat: add Tasks to Review section on dashboard"
```

---

## Task 11: Add Email Notifications

**Files:**
- Create: `src/lib/email/templates/task-response-submitted.tsx`
- Create: `src/lib/email/templates/task-approved.tsx`
- Create: `src/lib/email/templates/task-revision-requested.tsx`
- Modify: `src/lib/data/actions.ts`

**Step 1: Create TaskResponseSubmittedEmail template**

```tsx
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskResponseSubmittedEmailProps {
  recipientName: string;
  clientName: string;
  taskTitle: string;
  matterTitle: string;
  responsePreview?: string;
  dashboardLink: string;
  settings?: FirmSettings;
}

export const TaskResponseSubmittedEmail = ({
  recipientName,
  clientName,
  taskTitle,
  matterTitle,
  responsePreview,
  dashboardLink,
  settings,
}: TaskResponseSubmittedEmailProps) => (
  <BaseLayout
    preview={`Client response: ${taskTitle}`}
    heading="Task Response Received"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      <strong>{clientName}</strong> has submitted a response for the task:{" "}
      <strong>{taskTitle}</strong>
    </Text>

    <div style={details}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
      {responsePreview && (
        <Text style={detailRow}>
          <strong>Response:</strong> {responsePreview}
        </Text>
      )}
    </div>

    <Text style={paragraph}>
      Please review the response and approve it or request revisions.
    </Text>

    <Button href={dashboardLink} style={button}>
      Review Response
    </Button>
  </BaseLayout>
);

export default TaskResponseSubmittedEmail;

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const details = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #2563eb",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
  margin: "24px 0",
};
```

**Step 2: Create TaskApprovedEmail template**

```tsx
import { Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskApprovedEmailProps {
  recipientName: string;
  taskTitle: string;
  matterTitle: string;
  settings?: FirmSettings;
}

export const TaskApprovedEmail = ({
  recipientName,
  taskTitle,
  matterTitle,
  settings,
}: TaskApprovedEmailProps) => (
  <BaseLayout
    preview={`Task completed: ${taskTitle}`}
    heading="Task Completed"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      Great news! Your response for <strong>{taskTitle}</strong> has been
      reviewed and approved.
    </Text>

    <div style={details}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Status:</strong> ✓ Completed
      </Text>
    </div>

    <Text style={paragraph}>
      Thank you for your prompt response. If you have any questions, please
      don&apos;t hesitate to reach out.
    </Text>
  </BaseLayout>
);

export default TaskApprovedEmail;

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const details = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #16a34a",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};
```

**Step 3: Create TaskRevisionRequestedEmail template**

```tsx
import { Button, Text } from "@react-email/components";
import * as React from "react";
import { BaseLayout } from "./base-layout";
import type { FirmSettings } from "@/types/firm-settings";

interface TaskRevisionRequestedEmailProps {
  recipientName: string;
  taskTitle: string;
  matterTitle: string;
  revisionNotes: string;
  taskLink: string;
  settings?: FirmSettings;
}

export const TaskRevisionRequestedEmail = ({
  recipientName,
  taskTitle,
  matterTitle,
  revisionNotes,
  taskLink,
  settings,
}: TaskRevisionRequestedEmailProps) => (
  <BaseLayout
    preview={`Action needed: ${taskTitle}`}
    heading="Revision Requested"
    settings={settings}
  >
    <Text style={paragraph}>Hi {recipientName},</Text>
    <Text style={paragraph}>
      Your response for <strong>{taskTitle}</strong> needs some revisions before
      it can be completed.
    </Text>

    <div style={details}>
      <Text style={detailRow}>
        <strong>Matter:</strong> {matterTitle}
      </Text>
      <Text style={detailRow}>
        <strong>Task:</strong> {taskTitle}
      </Text>
    </div>

    <div style={notesBox}>
      <Text style={notesLabel}>Revision Notes:</Text>
      <Text style={notesText}>{revisionNotes}</Text>
    </div>

    <Text style={paragraph}>
      Please review the feedback and submit an updated response.
    </Text>

    <Button href={taskLink} style={button}>
      Update Response
    </Button>
  </BaseLayout>
);

export default TaskRevisionRequestedEmail;

const paragraph = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "16px 0",
};

const details = {
  backgroundColor: "#f8fafc",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #f59e0b",
};

const detailRow = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "8px 0",
};

const notesBox = {
  backgroundColor: "#fffbeb",
  borderRadius: "6px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #fcd34d",
};

const notesLabel = {
  color: "#92400e",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "0 0 8px 0",
};

const notesText = {
  color: "#78350f",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const button = {
  backgroundColor: "#f59e0b",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 20px",
  margin: "24px 0",
};
```

**Step 4: Update actions.ts with real email implementations**

Replace the placeholder functions with real implementations that use the email templates.

**Step 5: Commit**

```bash
git add src/lib/email/templates/task-response-submitted.tsx src/lib/email/templates/task-approved.tsx src/lib/email/templates/task-revision-requested.tsx src/lib/data/actions.ts
git commit -m "feat: add task response email notifications"
```

---

## Task 12: Final Testing and Verification

**Step 1: Run TypeScript check**

```bash
pnpm typecheck
```

Expected: No errors

**Step 2: Run linter**

```bash
pnpm lint
```

Expected: No errors

**Step 3: Run tests**

```bash
pnpm test
```

Expected: All tests pass

**Step 4: Manual testing checklist**

1. [ ] Create a task with type "Document Upload" assigned to client
2. [ ] Log in as client and view My Matters
3. [ ] Expand task and see instructions
4. [ ] Upload a file and submit response
5. [ ] Verify task shows "Pending Review"
6. [ ] Log in as lawyer and check dashboard
7. [ ] See task in "Tasks to Review" section
8. [ ] Approve the response
9. [ ] Verify client sees "Completed" status
10. [ ] Test revision flow with rejection and re-submission

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete client task responses implementation"
```

---

## Summary

This plan implements:
1. Database schema for task types and responses
2. Task creation with type and instructions
3. Client-facing response forms (inline on My Matters)
4. File upload integration with Google Drive
5. Lawyer review dashboard section
6. Approval and revision workflow
7. Email notifications for all state changes

Total estimated tasks: 12
