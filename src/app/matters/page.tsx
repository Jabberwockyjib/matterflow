import { ArrowRight } from "lucide-react";

import { fetchMatters, fetchClients } from "@/lib/data/queries";
import { createMatter, updateMatterStage } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseEnvReady } from "@/lib/supabase/server";
import { cn, isOverdue, formatDueDate } from "@/lib/utils";
import { MatterCard } from "@/components/cards/matter-card";
import { ContentCard, ContentCardHeader, ContentCardTitle, ContentCardContent } from "@/components/cards/content-card";
import { Button } from "@/components/ui/button";

// Wrapper to handle form action that returns ActionResult
async function handleCreateMatter(formData: FormData): Promise<void> {
  "use server";
  await createMatter(formData);
}

async function handleUpdateMatter(formData: FormData): Promise<void> {
  "use server";
  await updateMatterStage(formData);
}

export default async function MattersPage() {
  const { data: matters, source, error } = await fetchMatters();
  const { data: clients } = await fetchClients();
  const { session } = await getSessionWithProfile();
  const supabaseReady = supabaseEnvReady();

  // Get today's date for default value
  const today = new Date().toISOString().split("T")[0];

  const stages = [
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

  return (
    <div className="min-h-screen bg-background font-sans dark:bg-black">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-lora text-4xl font-bold text-foreground dark:text-zinc-50">
            Matters
          </h1>
          <p className="mt-2 text-sm text-muted-foreground dark:text-zinc-400">
            Stage, next action, and responsible party per matter.{" "}
            <span className="font-semibold text-foreground dark:text-zinc-300">
              {source === "supabase"
                ? "Live Supabase data"
                : "Using mock data until Supabase is configured"}
            </span>
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </header>

        {/* Create Matter Form */}
        <section className="mb-8">
          {supabaseReady ? (
            <ContentCard className="animate-fade-in">
              <ContentCardHeader>
                <ContentCardTitle>Create New Matter</ContentCardTitle>
              </ContentCardHeader>
              <ContentCardContent>
                <form action={handleCreateMatter} className="space-y-6">
              <input type="hidden" name="ownerId" value={session?.user.id || ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Title */}
                <label className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Title
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
                    <option value="Employment Agreement">Employment Agreement</option>
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
                    Next Action Due Date <span className="text-red-500">*</span>
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

                  <div className="mt-2">
                    <Button type="submit" size="lg">
                      Create Matter
                    </Button>
                    {!session?.user.id ? (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                        No signed-in user; owner_id will be blank and may fail RLS. Sign in to set owner automatically.
                      </p>
                    ) : null}
                  </div>
                </form>
              </ContentCardContent>
            </ContentCard>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-200">
              Supabase env vars not set; creation disabled. Configure `.env.local` to enable writes.
            </p>
          )}
        </section>

        {/* Existing Matters */}
        <section>
          <h2 className="mb-6 font-lora text-2xl font-bold text-foreground dark:text-zinc-100">
            All Matters
          </h2>

          {matters.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-sm text-muted-foreground dark:text-zinc-400">
                No matters found. Create your first matter above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matters.map((matter, index) => (
                <MatterCard
                  key={matter.id}
                  id={matter.id}
                  title={matter.title}
                  matterType={matter.matterType}
                  stage={matter.stage}
                  billingModel={matter.billingModel}
                  nextAction={matter.nextAction}
                  nextActionDueDate={matter.nextActionDueDate}
                  responsibleParty={matter.responsibleParty}
                  updatedAt={matter.updatedAt}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <a href="/">
            <Button variant="ghost" size="sm">
              ← Back to Control Center
            </Button>
          </a>
        </div>
      </main>
    </div>
  );
}