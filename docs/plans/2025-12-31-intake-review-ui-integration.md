# Intake Review UI/UX Integration - Full Workflow Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete UI/UX integration for Phase 1 + Phase 2 client intake features by enhancing the admin intake review page with full workflow actions.

**Architecture:** Enhance IntakeReviewClient with InfoRequestComposer, ScheduleCallModal, DeclineIntakeModal, internal notes, and info request history. Add three new server actions for decline, schedule call, and note updates.

**Tech Stack:** Next.js 15 App Router, React Hook Form, Zod validation, Supabase, shadcn/ui components

---

## Task 1: Server Actions - Decline Intake

**Files:**
- Modify: `src/lib/data/actions.ts` (append at end)
- Modify: `src/lib/validation/schemas.ts` (add decline schema)

**Step 1: Add decline validation schema**

In `src/lib/validation/schemas.ts`, add:

```typescript
export const declineIntakeSchema = z.object({
  intakeResponseId: z.string().uuid(),
  reason: z.enum(['incomplete_info', 'not_good_fit', 'client_unresponsive', 'other']),
  notes: z.string().optional(),
});

export type DeclineIntakeData = z.infer<typeof declineIntakeSchema>;
```

**Step 2: Implement declineIntakeForm action**

In `src/lib/data/actions.ts`, add:

```typescript
/**
 * Decline an intake form
 * Updates status and sends notification to client
 */
export async function declineIntakeForm(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const intakeResponseId = formData.get("intakeResponseId") as string;
    const reason = formData.get("reason") as string;
    const notes = formData.get("notes") as string | null;

    const validated = declineIntakeSchema.parse({
      intakeResponseId,
      reason,
      notes: notes || undefined,
    });

    // Get intake response with matter
    const { data: intakeResponse, error: fetchError } = await supabase
      .from("intake_responses")
      .select("*, matters!intake_responses_matter_id_fkey(id, title)")
      .eq("id", validated.intakeResponseId)
      .single();

    if (fetchError || !intakeResponse) {
      return { ok: false, error: "Intake response not found" };
    }

    // Update intake response status
    const reviewNotes = validated.notes
      ? `DECLINED: ${validated.reason}\n\n${validated.notes}`
      : `DECLINED: ${validated.reason}`;

    const { error: updateError } = await supabase
      .from("intake_responses")
      .update({
        status: "declined",
        review_status: "declined",
        review_notes: reviewNotes,
      })
      .eq("id", validated.intakeResponseId);

    if (updateError) {
      console.error("Failed to decline intake:", updateError);
      return { ok: false, error: updateError.message };
    }

    // Update matter stage to "Declined"
    const { error: matterError } = await supabase
      .from("matters")
      .update({
        stage: "Declined",
        next_action: "Follow up if client reapplies",
        responsible_party: "lawyer",
      })
      .eq("id", intakeResponse.matter_id);

    if (matterError) {
      console.error("Failed to update matter stage:", matterError);
      // Don't fail the whole operation
    }

    // Log to audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "decline_intake",
      entityType: "intake_response",
      entityId: validated.intakeResponseId,
      metadata: {
        reason: validated.reason,
        notes: validated.notes,
      },
    });

    // TODO: Send email notification to client
    // This will be implemented in email integration phase

    revalidatePath("/admin/intake");
    revalidatePath(`/admin/intake/${validated.intakeResponseId}`);

    return { ok: true };
  } catch (err) {
    console.error("Error declining intake:", err);
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Failed to decline intake" };
  }
}
```

**Step 3: Export schema from validation/schemas.ts**

Verify `declineIntakeSchema` is exported.

**Step 4: Commit**

```bash
git add src/lib/data/actions.ts src/lib/validation/schemas.ts
git commit -m "feat: add declineIntakeForm server action

- Add decline validation schema with reason enum
- Implement declineIntakeForm action
- Update intake_responses and matter status
- Log to audit_logs
- Revalidate paths

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Server Actions - Schedule Call

**Files:**
- Modify: `src/lib/data/actions.ts` (append at end)
- Modify: `src/lib/validation/schemas.ts` (add schema)

**Step 1: Add schedule call validation schema**

In `src/lib/validation/schemas.ts`, add:

```typescript
export const scheduleCallSchema = z.object({
  intakeResponseId: z.string().uuid(),
  dateTime: z.string().datetime(),
  duration: z.number().int().positive(),
  meetingType: z.enum(['phone', 'video', 'in_person']),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export type ScheduleCallData = z.infer<typeof scheduleCallSchema>;
```

**Step 2: Implement scheduleCallAction**

In `src/lib/data/actions.ts`, add:

```typescript
/**
 * Schedule a consultation call for an intake
 * Creates a task and sends calendar invite to client
 */
export async function scheduleCallAction(formData: FormData): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const intakeResponseId = formData.get("intakeResponseId") as string;
    const dateTime = formData.get("dateTime") as string;
    const duration = parseInt(formData.get("duration") as string);
    const meetingType = formData.get("meetingType") as string;
    const meetingLink = formData.get("meetingLink") as string | null;
    const notes = formData.get("notes") as string | null;

    const validated = scheduleCallSchema.parse({
      intakeResponseId,
      dateTime,
      duration,
      meetingType,
      meetingLink: meetingLink || undefined,
      notes: notes || undefined,
    });

    // Get intake response with matter
    const { data: intakeResponse, error: fetchError } = await supabase
      .from("intake_responses")
      .select("*, matters!intake_responses_matter_id_fkey(id, title, client_id)")
      .eq("id", validated.intakeResponseId)
      .single();

    if (fetchError || !intakeResponse) {
      return { ok: false, error: "Intake response not found" };
    }

    const matter = intakeResponse.matters;

    // Create task for the call
    const taskDescription = JSON.stringify({
      meetingType: validated.meetingType,
      meetingLink: validated.meetingLink,
      duration: validated.duration,
      notes: validated.notes,
    });

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        matter_id: matter.id,
        title: "Consultation Call",
        description: taskDescription,
        due_date: validated.dateTime,
        status: "pending",
        responsible_party: "client",
      })
      .select()
      .single();

    if (taskError) {
      console.error("Failed to create task:", taskError);
      return { ok: false, error: taskError.message };
    }

    // Log to audit
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "schedule_call",
      entityType: "task",
      entityId: task.id,
      metadata: {
        intake_response_id: validated.intakeResponseId,
        meeting_type: validated.meetingType,
        date_time: validated.dateTime,
      },
    });

    // TODO: Send calendar invite email to client
    // This will be implemented in email integration phase

    revalidatePath("/admin/intake");
    revalidatePath(`/admin/intake/${validated.intakeResponseId}`);
    revalidatePath(`/admin/matters/${matter.id}`);

    return { ok: true, data: task };
  } catch (err) {
    console.error("Error scheduling call:", err);
    if (err instanceof z.ZodError) {
      return { ok: false, error: err.issues.map((e) => e.message).join(", ") };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Failed to schedule call" };
  }
}
```

**Step 3: Export schema**

Verify `scheduleCallSchema` is exported.

**Step 4: Commit**

```bash
git add src/lib/data/actions.ts src/lib/validation/schemas.ts
git commit -m "feat: add scheduleCallAction server action

- Add schedule call validation schema
- Create task for consultation call
- Store meeting details in task description
- Log to audit_logs
- Revalidate paths

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Server Actions - Update Internal Notes

**Files:**
- Modify: `src/lib/data/actions.ts` (append at end)

**Step 1: Implement updateIntakeNotes action**

In `src/lib/data/actions.ts`, add:

```typescript
/**
 * Update internal notes for an intake response
 * Used for lawyer's private notes, not visible to client
 */
export async function updateIntakeNotes(
  intakeResponseId: string,
  notes: string
): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin();
  if ("error" in roleCheck) return roleCheck;

  try {
    const supabase = ensureSupabase();

    const { error: updateError } = await supabase
      .from("intake_responses")
      .update({ review_notes: notes })
      .eq("id", intakeResponseId);

    if (updateError) {
      console.error("Failed to update intake notes:", updateError);
      return { ok: false, error: updateError.message };
    }

    // Log to audit (silent, no need for full revalidation)
    await logAudit({
      supabase,
      actorId: roleCheck.session.user.id,
      eventType: "update_intake_notes",
      entityType: "intake_response",
      entityId: intakeResponseId,
      metadata: { notes_length: notes.length },
    });

    return { ok: true };
  } catch (err) {
    console.error("Error updating intake notes:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update notes" };
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: add updateIntakeNotes server action

- Add internal notes update action
- No revalidation (silent update)
- Log to audit_logs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: DeclineIntakeModal Component

**Files:**
- Create: `src/components/clients/decline-intake-modal.tsx`

**Step 1: Create DeclineIntakeModal component**

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const declineFormSchema = z.object({
  reason: z.enum(["incomplete_info", "not_good_fit", "client_unresponsive", "other"]),
  notes: z.string().optional(),
});

type DeclineFormData = z.infer<typeof declineFormSchema>;

interface DeclineIntakeModalProps {
  intakeId: string;
  clientName: string;
  onClose: () => void;
  onSubmit: (data: DeclineFormData) => Promise<void>;
}

const REASON_LABELS = {
  incomplete_info: "Incomplete Information",
  not_good_fit: "Not a Good Fit",
  client_unresponsive: "Client Unresponsive",
  other: "Other",
};

export function DeclineIntakeModal({
  intakeId,
  clientName,
  onClose,
  onSubmit,
}: DeclineIntakeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeclineFormData>({
    resolver: zodResolver(declineFormSchema),
    defaultValues: {
      reason: "incomplete_info",
      notes: "",
    },
  });

  const reason = watch("reason");

  const onSubmitForm = async (data: DeclineFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      toast.success("Intake form declined");
      onClose();
    } catch (error) {
      toast.error("Failed to decline intake form");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Decline Intake Form</DialogTitle>
          <DialogDescription>
            Decline the intake form for {clientName}. This will update the matter status and notify the client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          {/* Warning Alert */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action will decline the intake and update the matter to "Declined" status.
            </p>
          </div>

          {/* Reason Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Declining</Label>
            <Select
              onValueChange={(value) =>
                setValue("reason", value as any)
              }
              defaultValue="incomplete_info"
            >
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context for your team..."
              {...register("notes")}
              rows={4}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Declining..." : "Decline Intake"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/clients/decline-intake-modal.tsx
git commit -m "feat: add DeclineIntakeModal component

- Reason dropdown with 4 options
- Additional notes textarea
- Warning alert about action consequences
- Form validation with react-hook-form

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: InfoRequestHistorySection Component

**Files:**
- Create: `src/components/clients/info-request-history-section.tsx`

**Step 1: Create InfoRequestHistorySection component**

```typescript
"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import type { InfoRequestSummary } from "@/lib/data/queries";

interface InfoRequestHistorySectionProps {
  infoRequests: InfoRequestSummary[];
}

export function InfoRequestHistorySection({
  infoRequests,
}: InfoRequestHistorySectionProps) {
  if (infoRequests.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-sm text-gray-500 text-center">
          No additional information requested yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Information Requests ({infoRequests.length})
      </h3>

      <Accordion type="single" collapsible className="space-y-2">
        {infoRequests.map((request) => {
          const isPending = request.status === "pending";
          const isCompleted = request.status === "completed";
          const isOverdue =
            isPending &&
            request.responseDeadline &&
            new Date(request.responseDeadline) < new Date();

          const statusColor = isCompleted
            ? "bg-green-100 text-green-800"
            : isOverdue
            ? "bg-red-100 text-red-800"
            : "bg-yellow-100 text-yellow-800";

          const statusLabel = isCompleted
            ? "Completed"
            : isOverdue
            ? "Overdue"
            : "Pending Response";

          return (
            <AccordionItem
              key={request.id}
              value={request.id}
              className="border rounded-lg"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Info Request #{infoRequests.indexOf(request) + 1}
                      </span>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.requestedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {Array.isArray(request.questions)
                        ? request.questions.length
                        : Object.keys(request.questions).length}{" "}
                      questions
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Personal Message */}
                  {request.message && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        Personal Message:
                      </p>
                      <p className="text-sm text-blue-800">{request.message}</p>
                    </div>
                  )}

                  {/* Deadline */}
                  {request.responseDeadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Deadline:{" "}
                        {new Date(request.responseDeadline).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  )}

                  {/* Questions */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Questions:
                    </p>
                    <ol className="list-decimal list-inside space-y-2">
                      {(Array.isArray(request.questions)
                        ? request.questions
                        : Object.values(request.questions)
                      ).map((q: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700">
                          {q.question || q.questionText || q.text}
                          {q.required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Client Responses */}
                  {isCompleted && request.responses && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Client Responses:
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800 mb-2">
                          <strong>Completed on:</strong>{" "}
                          {request.respondedAt &&
                            new Date(request.respondedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                        </p>
                        <div className="space-y-2">
                          {Object.entries(request.responses).map(
                            ([key, value]) => (
                              <div key={key}>
                                <p className="text-sm font-medium text-gray-700">
                                  {key}:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/clients/info-request-history-section.tsx
git commit -m "feat: add InfoRequestHistorySection component

- Accordion list of all info requests
- Status badges (pending/completed/overdue)
- Show questions and client responses
- Deadline tracking with visual indicators
- Empty state for no requests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: InternalNotesSection Component

**Files:**
- Create: `src/components/clients/internal-notes-section.tsx`

**Step 1: Create InternalNotesSection component**

```typescript
"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

interface InternalNotesSectionProps {
  notes: string;
  onChange: (notes: string) => void;
  isSaving?: boolean;
  lastSaved?: Date;
}

export function InternalNotesSection({
  notes,
  onChange,
  isSaving = false,
  lastSaved,
}: InternalNotesSectionProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (seconds < 60) {
        setTimeAgo("just now");
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeAgo(`${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours} ${hours === 1 ? "hour" : "hours"} ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [lastSaved]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="internal-notes" className="text-base font-semibold">
          Internal Notes
        </Label>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span>Saved {timeAgo}</span>
            </>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Private notes for your team. Not visible to clients.
      </p>
      <Textarea
        id="internal-notes"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add internal notes about this intake..."
        rows={4}
        className="resize-none"
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/clients/internal-notes-section.tsx
git commit -m "feat: add InternalNotesSection component

- Auto-save indicator with timestamp
- Loading state during save
- Time ago calculation (just now, N minutes ago)
- Clear placeholder text

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: useDebounce Hook

**Files:**
- Create: `src/hooks/use-debounce.ts`

**Step 1: Create useDebounce hook**

```typescript
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Step 2: Commit**

```bash
git add src/hooks/use-debounce.ts
git commit -m "feat: add useDebounce hook for auto-save

- Generic debounce hook
- Configurable delay (default 500ms)
- Used for internal notes auto-save

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update IntakeReviewPage - Fetch Info Requests

**Files:**
- Modify: `src/app/admin/intake/[intakeId]/page.tsx`

**Step 1: Import getInfoRequests**

Add to imports:
```typescript
import { getInfoRequests } from "@/lib/data/queries";
```

**Step 2: Fetch info requests in server component**

After fetching intake response, add:

```typescript
// Get info requests for this intake
const { data: infoRequests } = await getInfoRequests(intakeId);
```

**Step 3: Pass to IntakeReviewClient**

Update the IntakeReviewClient usage:

```typescript
{intakeResponse.status === "submitted" && (
  <IntakeReviewClient
    intakeId={intakeId}
    intakeResponse={intakeResponse}
    matter={matter}
    client={{
      userId: matter.client?.users?.id || "",
      fullName: matter.client?.full_name || "Unknown",
      email: matter.client?.users?.email || "",
    }}
    infoRequests={infoRequests}
  />
)}
```

**Step 4: Commit**

```bash
git add src/app/admin/intake/[intakeId]/page.tsx
git commit -m "feat: fetch and pass info requests to IntakeReviewClient

- Import getInfoRequests query
- Fetch info requests for intake
- Pass to IntakeReviewClient component

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Update IntakeReviewClient - Full Workflow Integration

**Files:**
- Modify: `src/app/admin/intake/[intakeId]/intake-review-client.tsx`

**Step 1: Update imports**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/lib/toast";
import { approveIntakeForm, declineIntakeForm, scheduleCallAction, updateIntakeNotes } from "@/lib/data/actions";
import { InfoRequestComposer } from "@/components/clients/info-request-composer";
import { ScheduleCallModal } from "@/components/clients/schedule-call-modal";
import { DeclineIntakeModal } from "@/components/clients/decline-intake-modal";
import { InternalNotesSection } from "@/components/clients/internal-notes-section";
import { InfoRequestHistorySection } from "@/components/clients/info-request-history-section";
import { useDebounce } from "@/hooks/use-debounce";
import type { InfoRequestSummary } from "@/lib/data/queries";
```

**Step 2: Update IntakeReviewClientProps interface**

```typescript
interface IntakeReviewClientProps {
  intakeId: string;
  intakeResponse: {
    id: string;
    status: string;
    review_notes: string | null;
    review_status: string | null;
  };
  matter: {
    id: string;
    title: string;
    client_id: string | null;
  };
  client: {
    userId: string;
    fullName: string;
    email: string;
  };
  infoRequests: InfoRequestSummary[];
}
```

**Step 3: Implement full component**

```typescript
export function IntakeReviewClient({
  intakeId,
  intakeResponse,
  matter,
  client,
  infoRequests,
}: IntakeReviewClientProps) {
  const router = useRouter();

  // Modal state
  const [showInfoRequestModal, setShowInfoRequestModal] = useState(false);
  const [showScheduleCallModal, setShowScheduleCallModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Internal notes state with auto-save
  const [notes, setNotes] = useState(intakeResponse.review_notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const debouncedNotes = useDebounce(notes, 1000);

  // Auto-save notes when debounced value changes
  useEffect(() => {
    if (debouncedNotes !== (intakeResponse.review_notes || "")) {
      setIsSavingNotes(true);
      updateIntakeNotes(intakeId, debouncedNotes)
        .then(() => {
          setLastSaved(new Date());
        })
        .catch((err) => {
          console.error("Failed to save notes:", err);
        })
        .finally(() => {
          setIsSavingNotes(false);
        });
    }
  }, [debouncedNotes, intakeId, intakeResponse.review_notes]);

  // Action handlers
  const handleApprove = async () => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);

    const result = await approveIntakeForm(formData);
    if (result.ok) {
      showSuccess("Intake form approved successfully");
      router.refresh();
    } else {
      showError(result.error || "Failed to approve intake form");
    }
  };

  const handleInfoRequest = async (data: any) => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);
    formData.append("questions", JSON.stringify(data.questions));
    if (data.message) formData.append("message", data.message);
    if (data.deadline) formData.append("deadline", data.deadline);

    const result = await approveIntakeForm(formData); // TODO: Use createInfoRequest
    if (result.ok) {
      showSuccess("Information request sent successfully");
      router.refresh();
    } else {
      showError(result.error || "Failed to send information request");
    }
  };

  const handleScheduleCall = async (data: any) => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);
    formData.append("dateTime", data.dateTime);
    formData.append("duration", data.duration.toString());
    formData.append("meetingType", data.meetingType);
    if (data.meetingLink) formData.append("meetingLink", data.meetingLink);
    if (data.notes) formData.append("notes", data.notes);

    const result = await scheduleCallAction(formData);
    if (result.ok) {
      showSuccess("Call scheduled successfully");
      router.refresh();
    } else {
      showError(result.error || "Failed to schedule call");
    }
  };

  const handleDecline = async (data: any) => {
    const formData = new FormData();
    formData.append("intakeResponseId", intakeId);
    formData.append("reason", data.reason);
    if (data.notes) formData.append("notes", data.notes);

    const result = await declineIntakeForm(formData);
    if (result.ok) {
      showSuccess("Intake form declined");
      router.refresh();
    } else {
      showError(result.error || "Failed to decline intake form");
    }
  };

  // Check if there's a pending info request
  const hasPendingInfoRequest = infoRequests.some(
    (req) => req.status === "pending"
  );

  return (
    <div className="space-y-6">
      {/* Primary Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Button onClick={handleApprove} size="default">
          Approve Intake
        </Button>
        <Button
          onClick={() => setShowInfoRequestModal(true)}
          variant="outline"
          disabled={hasPendingInfoRequest}
        >
          Request More Info
        </Button>
        <Button
          onClick={() => setShowScheduleCallModal(true)}
          variant="outline"
        >
          Schedule Call
        </Button>
        <Button
          onClick={() => setShowDeclineModal(true)}
          variant="outline"
          className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
        >
          Decline
        </Button>
      </div>

      {/* Status Badge if info request pending */}
      {hasPendingInfoRequest && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Waiting for client response</strong> - An information request is pending.
          </p>
        </div>
      )}

      {/* Internal Notes Section */}
      <InternalNotesSection
        notes={notes}
        onChange={setNotes}
        isSaving={isSavingNotes}
        lastSaved={lastSaved}
      />

      {/* Info Request History */}
      <InfoRequestHistorySection infoRequests={infoRequests} />

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" onClick={() => router.push("/admin/intake")}>
          Back to Intake List
        </Button>
      </div>

      {/* Modals */}
      {showInfoRequestModal && (
        <InfoRequestComposer
          intakeResponseId={intakeId}
          onClose={() => setShowInfoRequestModal(false)}
          onSubmit={handleInfoRequest}
        />
      )}

      {showScheduleCallModal && (
        <ScheduleCallModal
          intakeResponseId={intakeId}
          clientName={client.fullName}
          clientEmail={client.email}
          onClose={() => setShowScheduleCallModal(false)}
          onSubmit={handleScheduleCall}
        />
      )}

      {showDeclineModal && (
        <DeclineIntakeModal
          intakeId={intakeId}
          clientName={client.fullName}
          onClose={() => setShowDeclineModal(false)}
          onSubmit={handleDecline}
        />
      )}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/admin/intake/[intakeId]/intake-review-client.tsx
git commit -m "feat: complete IntakeReviewClient full workflow integration

- Add all 4 action buttons (Approve, Request Info, Schedule, Decline)
- Integrate InfoRequestComposer, ScheduleCallModal, DeclineIntakeModal
- Add InternalNotesSection with auto-save
- Add InfoRequestHistorySection
- Disable Request More Info if pending request exists
- Show pending request status badge

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Fix InfoRequest Action Wire-up

**Files:**
- Modify: `src/app/admin/intake/[intakeId]/intake-review-client.tsx`

**Step 1: Import createInfoRequest**

Update imports to include:
```typescript
import { approveIntakeForm, declineIntakeForm, scheduleCallAction, updateIntakeNotes, createInfoRequest } from "@/lib/data/actions";
```

**Step 2: Fix handleInfoRequest to use createInfoRequest**

Replace the TODO in handleInfoRequest:

```typescript
const handleInfoRequest = async (data: any) => {
  const formData = new FormData();
  formData.append("intakeResponseId", intakeId);
  formData.append("questions", JSON.stringify(data.questions));
  if (data.message) formData.append("message", data.message);
  if (data.deadline) formData.append("deadline", data.deadline);

  const result = await createInfoRequest(formData);
  if (result.ok) {
    showSuccess("Information request sent successfully");
    router.refresh();
  } else {
    showError(result.error || "Failed to send information request");
  }
};
```

**Step 3: Commit**

```bash
git add src/app/admin/intake/[intakeId]/intake-review-client.tsx
git commit -m "fix: wire up createInfoRequest action properly

- Import createInfoRequest from actions
- Use correct action in handleInfoRequest
- Remove TODO comment

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Add "Declined" Matter Stage to Schema

**Files:**
- Create: `supabase/migrations/20251231000001_add_declined_stage.sql`

**Step 1: Create migration**

```sql
-- Add "Declined" to matter stage enum
ALTER TYPE matter_stage ADD VALUE IF NOT EXISTS 'Declined';

-- Update RLS policies to handle Declined stage (no changes needed, existing policies cover it)

-- Add helpful comment
COMMENT ON TYPE matter_stage IS 'Matter pipeline stages including Declined for rejected intakes';
```

**Step 2: Apply migration**

```bash
supabase migration up
```

**Step 3: Regenerate TypeScript types**

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

**Step 4: Commit**

```bash
git add supabase/migrations/20251231000001_add_declined_stage.sql src/types/database.types.ts
git commit -m "feat: add Declined stage to matter pipeline

- Add Declined to matter_stage enum
- Regenerate TypeScript types
- Used when intake form is declined

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Comprehensive Testing

**Files:**
- Modify: `test-info-request-flow.mjs` (update to test full workflow)

**Step 1: Update test script to test all actions**

Update the test script to include testing for:
- Approve intake
- Request more info
- Schedule call
- Decline intake
- Internal notes

Add comprehensive test scenarios at the end:

```javascript
console.log('📚 FULL WORKFLOW TEST SCENARIOS')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\\n')

console.log('1. Test Approve Workflow:')
console.log('   - Visit admin intake review URL')
console.log('   - Click "Approve Intake" button')
console.log('   - Verify matter stage advances to "Under Review"')
console.log('   - Verify status shows "Approved"\\n')

console.log('2. Test Request More Info Workflow:')
console.log('   - Click "Request More Info" button')
console.log('   - Add 2-3 structured questions')
console.log('   - Add personal message')
console.log('   - Set deadline')
console.log('   - Submit and verify info request appears in history\\n')

console.log('3. Test Schedule Call Workflow:')
console.log('   - Click "Schedule Call" button')
console.log('   - Select date/time, duration, meeting type')
console.log('   - Submit and verify task created in database\\n')

console.log('4. Test Decline Workflow:')
console.log('   - Click "Decline" button')
console.log('   - Select reason and add notes')
console.log('   - Confirm and verify matter stage = "Declined"\\n')

console.log('5. Test Internal Notes Auto-save:')
console.log('   - Type notes in Internal Notes section')
console.log('   - Wait 1 second')
console.log('   - Verify "Saved" indicator appears')
console.log('   - Refresh page and verify notes persisted\\n')

console.log('6. Test Info Request History:')
console.log('   - Verify all info requests appear')
console.log('   - Expand accordion items')
console.log('   - Verify questions and responses displayed correctly\\n')
```

**Step 2: Run test script**

```bash
node test-info-request-flow.mjs
```

Expected: All test data created, URLs displayed, test scenarios listed.

**Step 3: Manual testing**

Follow each test scenario in browser, verify all actions work correctly.

**Step 4: Run full test suite**

```bash
pnpm test
```

Expected: All tests passing.

**Step 5: TypeScript check**

```bash
pnpm typecheck
```

Expected: No TypeScript errors.

**Step 6: Build check**

```bash
pnpm build
```

Expected: Production build succeeds.

**Step 7: Commit test updates**

```bash
git add test-info-request-flow.mjs
git commit -m "test: add full workflow test scenarios

- Update test script with comprehensive scenarios
- Cover all 4 actions (approve, info request, schedule, decline)
- Test internal notes auto-save
- Test info request history display

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

- ✅ All 3 server actions implemented (decline, schedule, notes)
- ✅ All 3 new components created (DeclineModal, InfoRequestHistory, InternalNotes)
- ✅ IntakeReviewClient fully integrated with all actions
- ✅ Auto-save working for internal notes
- ✅ Info request history displaying correctly
- ✅ All TypeScript types correct
- ✅ All tests passing
- ✅ Production build succeeds
- ✅ Manual testing scenarios verified

Once complete, the admin intake review page will have complete UI/UX integration for Phase 1 + Phase 2 features, ready to move to Phase 3.
