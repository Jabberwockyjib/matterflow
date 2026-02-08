"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateInvoiceDraft } from "@/lib/data/actions";

interface InvoiceDraftFieldsProps {
  invoiceId: string;
  dueDate: string | null;
  notes: string | null;
}

export function InvoiceDraftFields({ invoiceId, dueDate, notes }: InvoiceDraftFieldsProps) {
  const router = useRouter();
  const [editDueDate, setEditDueDate] = useState(dueDate || "");
  const [editNotes, setEditNotes] = useState(notes || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateInvoiceDraft(invoiceId, {
      due_date: editDueDate || null,
      notes: editNotes || null,
    });
    setSaving(false);
    setDirty(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 mb-8 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Invoice Details</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 block mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => {
              setEditDueDate(e.target.value);
              setDirty(true);
            }}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 block mb-1">
            Internal Notes
          </label>
          <textarea
            value={editNotes}
            onChange={(e) => {
              setEditNotes(e.target.value);
              setDirty(true);
            }}
            rows={3}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Internal notes (not visible to client)"
          />
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
}
