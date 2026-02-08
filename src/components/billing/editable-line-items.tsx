"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  updateInvoiceLineItem,
  addManualLineItem,
  deleteLineItem,
} from "@/lib/data/actions";

export interface LineItemData {
  id: string;
  description: string;
  quantityMinutes: number;
  rateCents: number;
  amountCents: number;
  isManual: boolean;
  taskId: string | null;
  taskTitle: string | null;
  timeEntryId: string | null;
}

interface EditableLineItemsProps {
  invoiceId: string;
  lineItems: LineItemData[];
  totalCents: number;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function EditableLineItems({
  invoiceId,
  lineItems,
  totalCents,
}: EditableLineItemsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");

  async function handleUpdateField(
    lineItemId: string,
    field: "description" | "quantity_minutes" | "rate_cents",
    value: string
  ) {
    setSaving(lineItemId);
    const updates: Record<string, unknown> = {};

    if (field === "description") {
      updates.description = value;
    } else if (field === "quantity_minutes") {
      const minutes = parseFloat(value) * 60; // Input is in hours
      updates.quantity_minutes = Math.round(minutes);
    } else if (field === "rate_cents") {
      updates.rate_cents = Math.round(parseFloat(value) * 100);
    }

    await updateInvoiceLineItem(lineItemId, updates);
    setSaving(null);
    router.refresh();
  }

  async function handleDelete(lineItemId: string) {
    setSaving(lineItemId);
    await deleteLineItem(lineItemId);
    setSaving(null);
    router.refresh();
  }

  async function handleAddManual() {
    if (!newDescription.trim() || !newAmount.trim()) return;
    setSaving("new");
    await addManualLineItem(invoiceId, {
      description: newDescription.trim(),
      amount_cents: Math.round(parseFloat(newAmount) * 100),
    });
    setNewDescription("");
    setNewAmount("");
    setShowAddForm(false);
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3">
                Description
              </th>
              <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3 w-24">
                Hours
              </th>
              <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3 w-28">
                Rate
              </th>
              <th className="text-right text-xs font-medium uppercase tracking-wide text-slate-500 px-4 py-3 w-28">
                Amount
              </th>
              <th className="w-12 px-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No line items. Add time entries or custom items.
                </td>
              </tr>
            ) : (
              lineItems.map((item) => (
                <tr key={item.id} className="group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={item.description}
                        className="w-full border-0 bg-transparent text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1"
                        onBlur={(e) => {
                          if (e.target.value !== item.description) {
                            handleUpdateField(item.id, "description", e.target.value);
                          }
                        }}
                        disabled={saving === item.id}
                      />
                      {item.taskTitle && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.taskTitle}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.isManual ? (
                      <span className="text-sm text-slate-400">—</span>
                    ) : (
                      <input
                        type="number"
                        defaultValue={(item.quantityMinutes / 60).toFixed(2)}
                        className="w-20 border-0 bg-transparent text-sm text-slate-600 text-right focus:ring-1 focus:ring-blue-500 rounded px-1"
                        step="0.1"
                        min="0"
                        onBlur={(e) => {
                          const newHours = parseFloat(e.target.value);
                          if (!isNaN(newHours) && Math.round(newHours * 60) !== item.quantityMinutes) {
                            handleUpdateField(item.id, "quantity_minutes", e.target.value);
                          }
                        }}
                        disabled={saving === item.id}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.isManual ? (
                      <span className="text-sm text-slate-400">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-sm text-slate-400">$</span>
                        <input
                          type="number"
                          defaultValue={(item.rateCents / 100).toFixed(0)}
                          className="w-16 border-0 bg-transparent text-sm text-slate-600 text-right focus:ring-1 focus:ring-blue-500 rounded px-1"
                          step="1"
                          min="0"
                          onBlur={(e) => {
                            const newRate = parseFloat(e.target.value);
                            if (!isNaN(newRate) && Math.round(newRate * 100) !== item.rateCents) {
                              handleUpdateField(item.id, "rate_cents", e.target.value);
                            }
                          }}
                          disabled={saving === item.id}
                        />
                        <span className="text-xs text-slate-400">/hr</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                    {formatCurrency(item.amountCents)}
                  </td>
                  <td className="px-2 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600"
                      onClick={() => handleDelete(item.id)}
                      disabled={saving === item.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}

            {/* Add manual item form */}
            {showAddForm && (
              <tr className="bg-blue-50/50">
                <td className="px-4 py-3" colSpan={2}>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                    placeholder="Description (e.g., Filing fee, Flat-fee consultation)"
                    autoFocus
                  />
                </td>
                <td className="px-4 py-3" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <span className="text-sm text-slate-500">$</span>
                      <input
                        type="number"
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        className="w-24 rounded-md border border-slate-200 px-3 py-1.5 text-sm"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddManual}
                      disabled={saving === "new" || !newDescription.trim() || !newAmount.trim()}
                    >
                      {saving === "new" ? "Adding..." : "Add"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td
                colSpan={3}
                className="px-4 py-3 text-sm font-medium text-slate-900 text-right"
              >
                Total
              </td>
              <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">
                {formatCurrency(totalCents)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
