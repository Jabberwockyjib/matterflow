import { ArrowRight } from "lucide-react";

import { fetchMatters } from "@/lib/data/queries";
import { createMatter, updateMatterStage } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseEnvReady } from "@/lib/supabase/server";
import { cn, isOverdue, formatDueDate } from "@/lib/utils";

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
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Matters
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Stage, next action, and responsible party per matter.{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
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
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Create New Matter
          </h2>
          {supabaseReady ? (
            <form
              action={handleCreateMatter}
              className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
            >
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

              <div className="mt-6">
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Create Matter
                </button>
                {!session?.user.id ? (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">
                    No signed-in user; owner_id will be blank and may fail RLS. Sign in to set owner automatically.
                  </p>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-200">
              Supabase env vars not set; creation disabled. Configure `.env.local` to enable writes.
            </p>
          )}
        </section>

        {/* Existing Matters */}
        <section>
          <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Existing Matters
          </h2>

          {matters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No matters found. Create your first matter above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matters.map((matter) => (
                <div
                  key={matter.id}
                  className={cn(
                    "rounded-lg border bg-white p-4 dark:bg-zinc-900",
                    isOverdue(matter.nextActionDueDate)
                      ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"
                      : "border-zinc-200 dark:border-zinc-700"
                  )}
                >
                  {/* Matter Header */}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {matter.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                        {matter.matterType} • {matter.stage} • {matter.billingModel}
                      </p>
                    </div>
                    {matter.nextActionDueDate && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          isOverdue(matter.nextActionDueDate)
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        {isOverdue(matter.nextActionDueDate) && (
                          <svg
                            className="mr-1 h-3 w-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                        Due: {formatDueDate(matter.nextActionDueDate)}
                      </span>
                    )}
                  </div>

                  {/* Matter Details */}
                  <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Next action:{" "}
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {matter.nextAction || "Not set"}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Updated {new Date(matter.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Update Form */}
                  {supabaseReady ? (
                    <form
                      action={handleUpdateMatter}
                      className="rounded-md bg-zinc-50 p-4 dark:bg-zinc-800"
                    >
                      <input type="hidden" name="id" value={matter.id} />

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Stage */}
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Stage
                          </span>
                          <select
                            name="stage"
                            defaultValue={matter.stage}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                          >
                            {stages.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        </label>

                        {/* Responsible Party */}
                        <label className="text-sm text-slate-700 dark:text-slate-300">
                          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Responsible Party
                          </span>
                          <select
                            name="responsibleParty"
                            defaultValue={matter.responsibleParty}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
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
                            defaultValue={matter.nextAction || ""}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
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
                            defaultValue={matter.nextActionDueDate || ""}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                          />
                        </label>
                      </div>

                      <div className="mt-4">
                        <button
                          type="submit"
                          className="rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                        >
                          Update Matter
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-200">
                      Supabase env vars not set; updates disabled.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Back to Dashboard */}
        <div className="mt-8">
          <a
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to Control Center
          </a>
        </div>
      </main>
    </div>
  );
}