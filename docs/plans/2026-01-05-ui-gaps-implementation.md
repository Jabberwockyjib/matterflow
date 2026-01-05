# UI Gaps Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining UI gaps: Add Task/Time Entry modals, Invoice Detail page, and Document Template Admin UI.

**Architecture:** Three independent features using existing server actions and shadcn/ui components. Modals follow InviteClientModal pattern. Invoice detail requires new query function. Template admin requires mammoth.js + Claude API for document parsing.

**Tech Stack:** Next.js 15 (App Router), React Hook Form, Zod, shadcn/ui Dialog, Supabase, mammoth.js, @anthropic-ai/sdk

---

## Phase 1: Add Task Modal

### Task 1.1: Create Add Task Modal Component

**Files:**
- Create: `src/components/matters/add-task-modal.tsx`

**Step 1: Create the modal component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTask } from "@/lib/data/actions";

interface AddTaskModalProps {
  matterId: string;
}

export function AddTaskModal({ matterId }: AddTaskModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("matterId", matterId);

    const result = await createTask(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task for this matter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Review contract draft"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsibleParty">Responsible Party *</Label>
            <Select name="responsibleParty" defaultValue="lawyer">
              <SelectTrigger>
                <SelectValue placeholder="Select responsible party" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lawyer">Lawyer</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify file created**

Run: `ls -la src/components/matters/add-task-modal.tsx`
Expected: File exists

---

### Task 1.2: Wire Add Task Modal to Matter Detail Page

**Files:**
- Modify: `src/app/matters/[id]/page.tsx`

**Step 1: Import and use the modal**

Add import at top:
```tsx
import { AddTaskModal } from "@/components/matters/add-task-modal";
```

**Step 2: Replace disabled button in Tasks tab**

Find this line (around line 160):
```tsx
<Button size="sm" disabled>
  Add Task
</Button>
```

Replace with:
```tsx
<AddTaskModal matterId={id} />
```

**Step 3: Test the modal**

Run: `curl -s http://localhost:3001/matters` (ensure dev server running)
Manual test: Open a matter → Tasks tab → Click "Add Task" → Modal should open

**Step 4: Commit**

```bash
git add src/components/matters/add-task-modal.tsx src/app/matters/[id]/page.tsx
git commit -m "feat: add task modal on matter detail page"
```

---

## Phase 2: Add Time Entry Modal

### Task 2.1: Create Add Time Entry Modal Component

**Files:**
- Create: `src/components/matters/add-time-entry-modal.tsx`

**Step 1: Create the modal component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTimeEntry } from "@/lib/data/actions";

interface AddTimeEntryModalProps {
  matterId: string;
}

export function AddTimeEntryModal({ matterId }: AddTimeEntryModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billable, setBillable] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("matterId", matterId);

    // Convert hours to minutes
    const hours = parseFloat(formData.get("hours") as string) || 0;
    const minutes = Math.round(hours * 60);
    formData.set("minutes", String(minutes));
    formData.delete("hours");

    const result = await createTimeEntry(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Time Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>
            Log time spent on this matter.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="e.g., Reviewed contract and made revisions..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours *</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                step="0.25"
                min="0.25"
                placeholder="1.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={today}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="billable"
              name="billable"
              checked={billable}
              onCheckedChange={(checked) => setBillable(checked as boolean)}
            />
            <Label htmlFor="billable" className="text-sm font-normal">
              Billable time
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify file created**

Run: `ls -la src/components/matters/add-time-entry-modal.tsx`
Expected: File exists

---

### Task 2.2: Wire Add Time Entry Modal to Matter Detail Page

**Files:**
- Modify: `src/app/matters/[id]/page.tsx`

**Step 1: Import the modal**

Add import at top:
```tsx
import { AddTimeEntryModal } from "@/components/matters/add-time-entry-modal";
```

**Step 2: Replace disabled button in Time tab**

Find this line (around line 223):
```tsx
<Button size="sm" disabled>
  Add Time Entry
</Button>
```

Replace with:
```tsx
<AddTimeEntryModal matterId={id} />
```

**Step 3: Test the modal**

Manual test: Open a matter → Time tab → Click "Add Time Entry" → Modal should open

**Step 4: Commit**

```bash
git add src/components/matters/add-time-entry-modal.tsx src/app/matters/[id]/page.tsx
git commit -m "feat: add time entry modal on matter detail page"
```

---

## Phase 3: Invoice Detail Page

### Task 3.1: Add getInvoice Query Function

**Files:**
- Modify: `src/lib/data/queries.ts`

**Step 1: Add the query function**

Add after `fetchInvoices` function:

```typescript
export async function getInvoice(invoiceId: string): Promise<{
  data: {
    id: string;
    matterId: string;
    matterTitle: string;
    clientEmail: string | null;
    clientName: string | null;
    status: string;
    totalCents: number;
    dueDate: string | null;
    squareInvoiceId: string | null;
    lineItems: Array<{
      description: string;
      hours?: number;
      rate?: number;
      amount: number;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
  error?: string;
}> {
  if (!supabaseEnvReady()) {
    return { data: null, error: "Supabase not configured" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        matter_id,
        status,
        total_cents,
        due_date,
        square_invoice_id,
        line_items,
        created_at,
        updated_at,
        matters (
          title,
          client_id
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message || "Invoice not found" };
    }

    // Get client info if client_id exists
    let clientEmail: string | null = null;
    let clientName: string | null = null;

    const matter = data.matters as { title: string; client_id: string | null } | null;

    if (matter?.client_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", matter.client_id)
        .single();

      const { data: { user } } = await supabase.auth.admin.getUserById(matter.client_id);

      clientEmail = user?.email || null;
      clientName = profile?.full_name || null;
    }

    return {
      data: {
        id: data.id,
        matterId: data.matter_id,
        matterTitle: matter?.title || "Unknown Matter",
        clientEmail,
        clientName,
        status: data.status,
        totalCents: data.total_cents,
        dueDate: data.due_date,
        squareInvoiceId: data.square_invoice_id,
        lineItems: (data.line_items as Array<{
          description: string;
          hours?: number;
          rate?: number;
          amount: number;
        }>) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data/queries.ts
git commit -m "feat: add getInvoice query function"
```

---

### Task 3.2: Create Invoice Detail Page

**Files:**
- Create: `src/app/billing/[invoiceId]/page.tsx`

**Step 1: Create the directory and page**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, Mail, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInvoice } from "@/lib/data/queries";
import { InvoiceActions } from "./invoice-actions";

interface InvoiceDetailPageProps {
  params: Promise<{ invoiceId: string }>;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format((cents || 0) / 100);

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "secondary", icon: <Clock className="h-4 w-4" /> },
  sent: { label: "Sent", variant: "default", icon: <Mail className="h-4 w-4" /> },
  paid: { label: "Paid", variant: "outline", icon: <CheckCircle className="h-4 w-4 text-green-600" /> },
  overdue: { label: "Overdue", variant: "destructive", icon: <AlertCircle className="h-4 w-4" /> },
  partial: { label: "Partial", variant: "secondary", icon: <Clock className="h-4 w-4" /> },
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const { data: invoice, error } = await getInvoice(invoiceId);

  if (error || !invoice) {
    notFound();
  }

  const status = statusConfig[invoice.status] || statusConfig.draft;
  const squarePaymentUrl = invoice.squareInvoiceId
    ? `https://squareup.com/pay-invoice/${invoice.squareInvoiceId}`
    : null;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Billing
          </Button>
        </Link>
      </div>

      {/* Invoice Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Invoice #{invoice.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-lg text-slate-600 mt-1">{invoice.matterTitle}</p>
          {invoice.clientEmail && (
            <p className="text-sm text-slate-500 mt-1">
              {invoice.clientName || invoice.clientEmail}
            </p>
          )}
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          squarePaymentUrl={squarePaymentUrl}
        />
      </div>

      {/* Status and Amount Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
            Status
          </p>
          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
            {status.icon}
            {status.label}
          </Badge>
          <p className="text-sm text-slate-500 mt-2">
            Issued: {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-slate-500">
              Due: {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
            Amount
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(invoice.totalCents)}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Balance: {formatCurrency(invoice.status === "paid" ? 0 : invoice.totalCents)}
          </p>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-slate-200 bg-white mb-8">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Description
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Hours
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Rate
                </th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.lineItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No line items
                  </td>
                </tr>
              ) : (
                invoice.lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {item.hours ? item.hours.toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 text-right">
                      {item.rate ? formatCurrency(item.rate * 100) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                      {formatCurrency(item.amount * 100)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                  Total
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                  {formatCurrency(invoice.totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Link */}
      {squarePaymentUrl && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment Link</h2>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-100 px-3 py-2 rounded text-sm text-slate-700 truncate">
              {squarePaymentUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(squarePaymentUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify directory created**

Run: `ls -la src/app/billing/[invoiceId]/`
Expected: page.tsx exists

---

### Task 3.3: Create Invoice Actions Component

**Files:**
- Create: `src/app/billing/[invoiceId]/invoice-actions.tsx`

**Step 1: Create the client component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateInvoiceStatus } from "@/lib/data/actions";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
  squarePaymentUrl: string | null;
}

export function InvoiceActions({ invoiceId, status, squarePaymentUrl }: InvoiceActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleMarkPaid() {
    setLoading("paid");
    const formData = new FormData();
    formData.set("id", invoiceId);
    formData.set("status", "paid");

    await updateInvoiceStatus(formData);
    setLoading(null);
    router.refresh();
  }

  async function handleResendEmail() {
    setLoading("resend");
    // TODO: Call sendInvoiceEmail action when available
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(null);
    router.refresh();
  }

  async function handleCopyLink() {
    if (squarePaymentUrl) {
      await navigator.clipboard.writeText(squarePaymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {squarePaymentUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
      )}

      {status === "sent" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleResendEmail}
          disabled={loading === "resend"}
        >
          <Mail className="h-4 w-4 mr-2" />
          {loading === "resend" ? "Sending..." : "Resend Email"}
        </Button>
      )}

      {status !== "paid" && (
        <Button
          size="sm"
          onClick={handleMarkPaid}
          disabled={loading === "paid"}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {loading === "paid" ? "Updating..." : "Mark Paid"}
        </Button>
      )}
    </div>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/billing/[invoiceId]/
git commit -m "feat: add invoice detail page with actions"
```

---

### Task 3.4: Add Link from Billing List to Invoice Detail

**Files:**
- Modify: `src/app/billing/page.tsx`

**Step 1: Make invoice rows clickable**

Find the invoice card/row rendering and wrap with Link, or add a "View" button.

Add import:
```tsx
import Link from "next/link";
```

Find where invoices are mapped and add a View link:
```tsx
<Link href={`/billing/${invoice.id}`}>
  <Button variant="ghost" size="sm">View</Button>
</Link>
```

**Step 2: Test navigation**

Manual test: Go to /billing → Click View on an invoice → Should navigate to detail page

**Step 3: Commit**

```bash
git add src/app/billing/page.tsx
git commit -m "feat: add link from billing list to invoice detail"
```

---

## Phase 4: Document Template Admin UI

### Task 4.1: Install Dependencies

**Step 1: Install mammoth and Anthropic SDK**

Run:
```bash
pnpm add mammoth @anthropic-ai/sdk
```

**Step 2: Add type declarations if needed**

Run: `pnpm typecheck`
If mammoth types are missing, add to `src/types/mammoth.d.ts`:
```typescript
declare module 'mammoth' {
  export function extractRawText(options: { buffer: Buffer }): Promise<{ value: string }>;
  export function convertToHtml(options: { buffer: Buffer }): Promise<{ value: string }>;
}
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add mammoth and anthropic-sdk dependencies"
```

---

### Task 4.2: Create Document Parsing Service

**Files:**
- Create: `src/lib/document-templates/parsing.ts`

**Step 1: Create the parsing module**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import type { ParsedTemplate, ParsedSection, ParsedPlaceholder } from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function parseDocumentTemplate(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedTemplate> {
  // Extract text from DOCX
  const { value: rawText } = await mammoth.extractRawText({ buffer: fileBuffer });
  const { value: htmlContent } = await mammoth.convertToHtml({ buffer: fileBuffer });

  // Use Claude to analyze the document
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Analyze this legal document template and extract its structure.

IMPORTANT: Do NOT modify any wording. Only analyze and extract.

Document content:
---
${rawText}
---

Return a JSON object with:
1. suggestedName: A short name for this template
2. suggestedCategory: One of "consent", "billing", "privacy", "engagement", "other"
3. sections: Array of sections, each with:
   - name: Section heading or "Main Content" if no heading
   - content: The exact text content (DO NOT MODIFY)
   - suggestedConditional: true if this section might be conditional (e.g., telehealth-specific)
   - suggestedConditionField: If conditional, what field would control it
   - placeholders: Array of detected placeholders in this section
4. allPlaceholders: Array of all unique placeholders found, each with:
   - original: The exact text as it appears (e.g., "{{client_name}}", "[PRACTICE NAME]", "___________")
   - suggestedFieldName: snake_case field name
   - suggestedLabel: Human-readable label
   - suggestedType: One of "text", "multi_line", "date", "currency", "number", "select", "checkbox"
   - suggestedOutputType: "merge" if lawyer fills, "fillable" if patient fills in PDF
   - context: A few words of surrounding text for context

Return ONLY valid JSON, no markdown.`,
      },
    ],
  });

  // Parse Claude's response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    const parsed = JSON.parse(content.text) as ParsedTemplate;
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse Claude response: ${err}`);
  }
}
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm typecheck`
Expected: No errors (or only warnings about ANTHROPIC_API_KEY)

**Step 3: Commit**

```bash
git add src/lib/document-templates/parsing.ts
git commit -m "feat: add document template parsing with Claude API"
```

---

### Task 4.3: Create Template Upload Action

**Files:**
- Modify: `src/lib/document-templates/actions.ts`

**Step 1: Add upload and parse action**

Add at the end of the file:

```typescript
import { parseDocumentTemplate } from "./parsing";
import type { ParsedTemplate } from "./types";

export async function uploadAndParseTemplate(
  formData: FormData
): Promise<ActionResult<{ template: DocumentTemplate; parsed: ParsedTemplate }>> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!supabaseEnvReady()) {
    return { success: false, error: "Service unavailable" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!file.name.endsWith(".docx")) {
    return { success: false, error: "Only .docx files are supported" };
  }

  try {
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the document with AI
    const parsed = await parseDocumentTemplate(buffer, file.name);

    // Upload original file to Supabase Storage
    const supabase = supabaseAdmin();
    const storagePath = `templates/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue without storage - not critical for MVP
    }

    // Create template record
    const { data: template, error: insertError } = await supabase
      .from("document_templates")
      .insert({
        name: parsed.suggestedName || file.name.replace(".docx", ""),
        description: null,
        category: parsed.suggestedCategory || null,
        original_file_url: uploadError ? null : storagePath,
        created_by: auth.session.user.id,
        status: "draft",
        version: "1.0",
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/admin/templates");

    return {
      success: true,
      data: {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          version: template.version,
          status: template.status as TemplateStatus,
          originalFileUrl: template.original_file_url,
          createdBy: template.created_by,
          createdAt: template.created_at ?? new Date().toISOString(),
          updatedAt: template.updated_at ?? new Date().toISOString(),
        },
        parsed,
      },
    };
  } catch (err) {
    console.error("Template parsing error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to parse template",
    };
  }
}
```

**Step 2: Add import for parseDocumentTemplate**

Add at top of file:
```typescript
import { parseDocumentTemplate } from "./parsing";
```

**Step 3: Verify no TypeScript errors**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/document-templates/actions.ts
git commit -m "feat: add uploadAndParseTemplate action"
```

---

### Task 4.4: Create Template List Page

**Files:**
- Create: `src/app/admin/templates/page.tsx`

**Step 1: Create the directory and page**

```tsx
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchDocumentTemplates } from "@/lib/document-templates/queries";

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  active: "default",
  archived: "outline",
};

export default async function TemplatesPage() {
  const { data: templates, error } = await fetchDocumentTemplates();

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Document Templates
          </h1>
          <p className="text-slate-600 mt-1">
            Manage legal document templates for client matters
          </p>
        </div>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload Template
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Template Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-slate-200">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No templates yet</h3>
            <p className="text-slate-600 mt-1">Upload your first document template to get started.</p>
            <Link href="/admin/templates/new" className="mt-4 inline-block">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Template
              </Button>
            </Link>
          </div>
        ) : (
          templates.map((template) => (
            <Link
              key={template.id}
              href={`/admin/templates/${template.id}`}
              className="block bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{template.name}</h3>
                  {template.category && (
                    <p className="text-sm text-slate-500 capitalize">{template.category}</p>
                  )}
                </div>
                <Badge variant={statusVariants[template.status] || "secondary"}>
                  {template.status}
                </Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span>v{template.version}</span>
                <span>{template.fieldCount || 0} fields</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify directory created**

Run: `ls -la src/app/admin/templates/`
Expected: page.tsx exists

**Step 3: Commit**

```bash
git add src/app/admin/templates/page.tsx
git commit -m "feat: add template list page"
```

---

### Task 4.5: Create Template Upload Page

**Files:**
- Create: `src/app/admin/templates/new/page.tsx`
- Create: `src/app/admin/templates/new/upload-form.tsx`

**Step 1: Create the page**

```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadForm } from "./upload-form";

export default function NewTemplatePage() {
  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Upload New Template
        </h1>
        <p className="text-slate-600 mb-6">
          Upload a Word document (.docx) and we&apos;ll analyze it to extract sections and placeholders.
        </p>

        <UploadForm />
      </div>
    </div>
  );
}
```

**Step 2: Create the upload form component**

```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAndParseTemplate } from "@/lib/document-templates/actions";

export function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".docx")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Only .docx files are supported");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".docx")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Only .docx files are supported");
      }
    }
  };

  async function handleSubmit() {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadAndParseTemplate(formData);

    if (!result.success) {
      setError(result.error || "Failed to upload template");
      setLoading(false);
      return;
    }

    // Navigate to the new template's edit page
    router.push(`/admin/templates/${result.data?.template.id}/edit`);
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : file
            ? "border-green-500 bg-green-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFile(null)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">
              Drag and drop your Word document here, or
            </p>
            <label>
              <input
                type="file"
                accept=".docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>Browse Files</span>
              </Button>
            </label>
            <p className="text-xs text-slate-500 mt-4">
              Only .docx files are supported
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/templates")}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Upload & Analyze"
          )}
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Verify files created**

Run: `ls -la src/app/admin/templates/new/`
Expected: page.tsx and upload-form.tsx exist

**Step 4: Commit**

```bash
git add src/app/admin/templates/new/
git commit -m "feat: add template upload page with drag-drop"
```

---

### Task 4.6: Create Template Detail/Edit Page

**Files:**
- Create: `src/app/admin/templates/[id]/page.tsx`
- Create: `src/app/admin/templates/[id]/edit/page.tsx`

**Step 1: Create template detail page (view mode)**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDocumentTemplate } from "@/lib/document-templates/queries";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params;
  const { data: template, error } = await getDocumentTemplate(id);

  if (error || !template) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Button>
        </Link>
      </div>

      {/* Template Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            {template.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge>{template.status}</Badge>
            {template.category && (
              <Badge variant="outline" className="capitalize">{template.category}</Badge>
            )}
            <span className="text-sm text-slate-500">v{template.version}</span>
          </div>
        </div>
        <Link href={`/admin/templates/${id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Template
          </Button>
        </Link>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Sections</h2>
        {template.sections?.length === 0 ? (
          <p className="text-slate-500">No sections defined yet.</p>
        ) : (
          template.sections?.map((section, index) => (
            <div
              key={section.id}
              className="bg-white rounded-lg border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-slate-900">
                  {index + 1}. {section.name}
                </h3>
                {section.isConditional && (
                  <Badge variant="secondary">Conditional</Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">
                {section.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Fields */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Mapped Fields</h2>
        {template.fields?.length === 0 ? (
          <p className="text-slate-500">No fields mapped yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {template.fields?.map((field) => (
              <div
                key={field.id}
                className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{field.label}</p>
                  <p className="text-xs text-slate-500">{`{{${field.name}}}`}</p>
                </div>
                <Badge variant="outline">{field.fieldType}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create template edit page (placeholder for now)**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentTemplate } from "@/lib/document-templates/queries";

interface TemplateEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateEditPage({ params }: TemplateEditPageProps) {
  const { id } = await params;
  const { data: template, error } = await getDocumentTemplate(id);

  if (error || !template) {
    notFound();
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/admin/templates/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">
          Edit: {template.name}
        </h1>

        <p className="text-slate-600">
          Template editing interface coming soon. This will allow you to:
        </p>
        <ul className="list-disc list-inside text-slate-600 mt-2 space-y-1">
          <li>Edit section content and order</li>
          <li>Configure conditional logic</li>
          <li>Map fields to intake questions</li>
          <li>Preview merged document</li>
        </ul>
      </div>
    </div>
  );
}
```

**Step 3: Verify files created**

Run: `ls -la src/app/admin/templates/[id]/`
Expected: page.tsx exists
Run: `ls -la src/app/admin/templates/[id]/edit/`
Expected: page.tsx exists

**Step 4: Commit**

```bash
git add src/app/admin/templates/[id]/
git commit -m "feat: add template detail and edit pages"
```

---

### Task 4.7: Add Templates Link to Sidebar

**Files:**
- Modify: `src/components/sidebar.tsx`

**Step 1: Find admin links section and add Templates**

Find the admin section in the sidebar and add:
```tsx
{ href: "/admin/templates", label: "Templates", icon: FileText }
```

Import FileText if not already:
```tsx
import { FileText } from "lucide-react";
```

**Step 2: Test navigation**

Manual test: Sidebar should show Templates link in Admin section

**Step 3: Commit**

```bash
git add src/components/sidebar.tsx
git commit -m "feat: add templates link to admin sidebar"
```

---

## Phase 5: Final Testing & Cleanup

### Task 5.1: Run Full Test Suite

**Step 1: Run TypeScript check**

Run: `pnpm typecheck`
Expected: No errors

**Step 2: Run linter**

Run: `pnpm lint`
Expected: No errors (or only warnings)

**Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Manual smoke test**

Test each feature:
1. Go to a matter → Tasks tab → Add Task → Create task → Verify appears in list
2. Go to a matter → Time tab → Add Time Entry → Create entry → Verify appears in list
3. Go to /billing → Click View on invoice → Verify detail page loads
4. Go to /admin/templates → Upload a .docx → Verify parsing works

---

### Task 5.2: Final Commit

**Step 1: Verify all changes committed**

Run: `git status`
Expected: Clean working directory

**Step 2: Create summary commit if needed**

If any uncommitted changes:
```bash
git add .
git commit -m "chore: cleanup and polish UI gap features"
```

---

## Summary

This plan implements:

1. **Add Task Modal** - 2 tasks, ~15 min
2. **Add Time Entry Modal** - 2 tasks, ~15 min
3. **Invoice Detail Page** - 4 tasks, ~45 min
4. **Document Template Admin** - 7 tasks, ~2 hrs
5. **Testing & Cleanup** - 2 tasks, ~15 min

**Total: 17 tasks, ~3.5 hours**

Each task is atomic and can be committed independently. The plan follows TDD principles where applicable and uses existing patterns from the codebase.
