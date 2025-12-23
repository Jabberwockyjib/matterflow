import { ArrowRight, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchMatters } from "@/lib/data/queries";
import { createMatter, updateMatterStage } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseEnvReady } from "@/lib/supabase/server";
import { cn, isOverdue, formatDueDate } from "@/lib/utils";

const responsibleVariant = (owner: string) =>
  owner === "client" ? "warning" : "default";

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
    <div className="bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              MatterFlow
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Matters
            </h1>
            <p className="text-sm text-slate-600">
              Stage, next action, and responsible party per matter.{" "}
              <span className="font-medium text-slate-700">
                {source === "supabase"
                  ? "Live Supabase data"
                  : "Using mock data until Supabase is configured"}
              </span>
              {error ? ` — ${error}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm">
              Import CSV
            </Button>
            <Button size="sm">
              New Matter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick create matter</CardTitle>
            <CardDescription>
              Minimal fields to move faster during MVP slicing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {supabaseReady ? (
              <form action={handleCreateMatter} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="ownerId" value={session?.user.id || ""} />
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Title
                  </span>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="New matter title"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Matter Type
                  </span>
                  <select
                    name="matterType"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="General">General</option>
                    <option value="Policy Review">Policy Review</option>
                    <option value="Contract Review">Contract Review</option>
                    <option value="Employment Agreement">Employment Agreement</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Billing Model
                  </span>
                  <select
                    name="billingModel"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue="hourly"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="flat">Flat Fee</option>
                    <option value="contingency">Contingency</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Responsible Party
                  </span>
                  <select
                    name="responsibleParty"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    defaultValue="lawyer"
                  >
                    <option value="lawyer">Lawyer</option>
                    <option value="staff">Staff</option>
                    <option value="client">Client</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Next Action
                  </span>
                  <input
                    type="text"
                    name="nextAction"
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="What needs to be done next?"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Next Action Due Date
                  </span>
                  <input
                    type="date"
                    name="nextActionDueDate"
                    required
                    defaultValue={today}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <div className="md:col-span-2">
                  <Button type="submit">Create matter</Button>
                  {!session?.user.id ? (
                    <p className="mt-1 text-xs text-amber-700">
                      No signed-in user; owner_id will be blank and may fail RLS. Sign in to set owner automatically.
                    </p>
                  ) : null}
                </div>
              </form>
            ) : (
              <p className="text-sm text-amber-700">
                Supabase env vars not set; creation disabled. Configure `.env.local` to enable writes.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {matters.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500">
                  No matters found. Create your first matter above.
                </p>
              </CardContent>
            </Card>
          ) : (
            matters.map((matter) => (
              <Card
                key={matter.id}
                className={cn(
                  "border-slate-200 bg-white",
                  isOverdue(matter.nextActionDueDate)
                    ? "border-red-300 bg-red-50"
                    : ""
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900">
                        {matter.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {matter.matterType} • {matter.billingModel} billing
                      </CardDescription>
                    </div>
                    {matter.nextActionDueDate && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          isOverdue(matter.nextActionDueDate)
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
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
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm text-slate-700">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">{matter.stage}</Badge>
                    <Badge variant={responsibleVariant(matter.responsibleParty)}>
                      <User className="mr-1 h-3.5 w-3.5" />
                      {matter.responsibleParty} owns
                    </Badge>
                    <span className="text-slate-600">
                      Next action:{" "}
                      <span className="font-medium text-slate-800">
                        {matter.nextAction || "Not set"}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Updated {new Date(matter.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {supabaseReady ? (
                    <form action={handleUpdateMatter} className="grid gap-2 md:grid-cols-4">
                      <input type="hidden" name="id" value={matter.id} />
                      <label className="text-xs text-slate-700">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Stage
                        </span>
                        <select
                          name="stage"
                          defaultValue={matter.stage}
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                        >
                          {stages.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-slate-700">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Responsible
                        </span>
                        <select
                          name="responsibleParty"
                          defaultValue={matter.responsibleParty}
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="lawyer">Lawyer</option>
                          <option value="staff">Staff</option>
                          <option value="client">Client</option>
                        </select>
                      </label>
                      <label className="text-xs text-slate-700">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Next action
                        </span>
                        <input
                          type="text"
                          name="nextAction"
                          required
                          defaultValue={matter.nextAction || ""}
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                        />
                      </label>
                      <label className="text-xs text-slate-700">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Due Date
                        </span>
                        <input
                          type="date"
                          name="nextActionDueDate"
                          required
                          defaultValue={matter.nextActionDueDate || ""}
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                        />
                      </label>
                      <div className="md:col-span-4">
                        <Button type="submit" size="sm" variant="secondary">
                          Update
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-amber-700">
                      Supabase env vars not set; updates disabled.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}