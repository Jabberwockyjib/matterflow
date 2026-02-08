"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SortDropdown, type SortOption } from "@/components/ui/sort-dropdown";
import { MatterCard } from "@/components/matter-card";
import {
  ContentCard,
  ContentCardContent,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import { createMatter } from "@/lib/data/actions";
import type { MatterSummary } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

// Sort options for matters
type MatterSortKey =
  | "dueDate-asc"
  | "dueDate-desc"
  | "responsibleParty"
  | "stage"
  | "updatedAt"
  | "clientName";

const sortOptions: SortOption<MatterSortKey>[] = [
  { value: "dueDate-asc", label: "Due date (soonest)" },
  { value: "dueDate-desc", label: "Due date (latest)" },
  { value: "responsibleParty", label: "Responsible party" },
  { value: "stage", label: "Stage" },
  { value: "updatedAt", label: "Last updated" },
  { value: "clientName", label: "Client name" },
];

// Stage order for sorting
const stageOrder = [
  "Lead Created",
  "Intake Sent",
  "Intake Received",
  "Conflict Check",
  "Under Review",
  "Waiting on Client",
  "Draft Ready",
  "Sent to Client",
  "Billing Pending",
  "Completed",
  "Archived",
];

// Responsible party order
const partyOrder = ["client", "lawyer", "staff"];

function sortMatters(
  matters: MatterSummary[],
  sortKey: MatterSortKey
): MatterSummary[] {
  const sorted = [...matters];

  switch (sortKey) {
    case "dueDate-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.nextActionDueDate).getTime() -
          new Date(b.nextActionDueDate).getTime()
      );
    case "dueDate-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.nextActionDueDate).getTime() -
          new Date(a.nextActionDueDate).getTime()
      );
    case "responsibleParty":
      return sorted.sort(
        (a, b) =>
          partyOrder.indexOf(a.responsibleParty) -
          partyOrder.indexOf(b.responsibleParty)
      );
    case "stage":
      return sorted.sort(
        (a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)
      );
    case "updatedAt":
      return sorted.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case "clientName":
      return sorted.sort((a, b) =>
        (a.clientName || "").localeCompare(b.clientName || "")
      );
    default:
      return sorted;
  }
}

interface Client {
  id: string;
  fullName: string;
}

interface MattersListClientProps {
  matters: MatterSummary[];
  clients: Client[];
  ownerId?: string;
  supabaseReady: boolean;
}

export function MattersListClient({
  matters,
  clients,
  ownerId,
  supabaseReady,
}: MattersListClientProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<MatterSortKey>("dueDate-asc");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const sortedMatters = React.useMemo(
    () => sortMatters(matters, sortKey),
    [matters, sortKey]
  );

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const result = await createMatter(formData);

    setIsSubmitting(false);

    if (!result.error) {
      setIsFormOpen(false);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with sort and add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {matters.length} {matters.length === 1 ? "matter" : "matters"}
        </p>
        <div className="flex items-center gap-2">
          <SortDropdown
            options={sortOptions}
            value={sortKey}
            onChange={setSortKey}
          />
          {supabaseReady && !isFormOpen && (
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Matter
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible create form */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          {isFormOpen && (
            <ContentCard className="animate-fade-in">
              <ContentCardHeader className="flex flex-row items-center justify-between pb-2">
                <ContentCardTitle>Create New Matter</ContentCardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </ContentCardHeader>
              <ContentCardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <input type="hidden" name="ownerId" value={ownerId || ""} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Title */}
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Title <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        name="title"
                        required
                        placeholder="Matter title"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>

                    {/* Client */}
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Client (Optional)
                      </span>
                      <select
                        name="clientId"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="">No client (lead only)</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.fullName}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        If client is selected, intake automation will trigger
                      </p>
                    </label>

                    {/* Matter Type */}
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Matter Type
                      </span>
                      <select
                        name="matterType"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="">Select type</option>
                        <option value="General">General</option>
                        <option value="Policy Review">Policy Review</option>
                        <option value="Contract Review">Contract Review</option>
                        <option value="Employment Agreement">
                          Employment Agreement
                        </option>
                        <option value="Compliance">Compliance</option>
                      </select>
                    </label>

                    {/* Billing Model */}
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Billing Model
                      </span>
                      <select
                        name="billingModel"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        defaultValue="hourly"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="flat">Flat Fee</option>
                        <option value="contingency">Contingency</option>
                      </select>
                    </label>

                    {/* Responsible Party */}
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Responsible Party
                      </span>
                      <select
                        name="responsibleParty"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        defaultValue="lawyer"
                      >
                        <option value="lawyer">Lawyer</option>
                        <option value="staff">Staff</option>
                        <option value="client">Client</option>
                      </select>
                    </label>

                    {/* Next Action */}
                    <label className="text-sm text-slate-700 dark:text-slate-300 sm:col-span-2">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Next Action <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        name="nextAction"
                        required
                        placeholder="What needs to be done next?"
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>

                    {/* Next Action Due Date */}
                    <label className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Next Action Due Date{" "}
                        <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="date"
                        name="nextActionDueDate"
                        required
                        defaultValue={today}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Matter"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsFormOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {!ownerId && (
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      No signed-in user; owner_id will be blank and may fail
                      RLS.
                    </p>
                  )}
                </form>
              </ContentCardContent>
            </ContentCard>
          )}
        </div>
      </div>

      {/* Matter list */}
      {sortedMatters.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-muted-foreground dark:text-zinc-400">
            No matters found. Create your first matter above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMatters.map((matter, index) => (
            <MatterCard
              key={matter.id}
              matter={matter}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
