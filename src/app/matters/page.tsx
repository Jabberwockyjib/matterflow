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
import { Button } from "@/components/ui/button";
import { createMatter, updateMatterStage } from "@/lib/data/actions";
import { fetchMatters } from "@/lib/data/queries";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseEnvReady } from "@/lib/supabase/server";

const responsibleVariant = (owner: string) =>
  owner === "client" ? "warning" : "default";

export default async function MattersPage() {
  const { data: matters, source, error } = await fetchMatters();
  const { session } = await getSessionWithProfile();
  const supabaseReady = supabaseEnvReady();
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
              <form action={createMatter} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="ownerId" value={session?.user.id || ""} />
                <label className="text-sm text-slate-700">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Title
                  </span>
                  <input
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
                  <input
                    name="matterType"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Policy Review"
                  />
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
                    <option value="flat">Flat</option>
                    <option value="hybrid">Hybrid</option>
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
                    <option value="client">Client</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700 md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Next Action
                  </span>
                  <input
                    name="nextAction"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Draft review pack"
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
          {matters.map((matter) => (
            <Card key={matter.id} className="border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-900">
                  {matter.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {matter.matterType} • {matter.billingModel} billing
                </CardDescription>
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
                  <form action={updateMatterStage} className="grid gap-2 md:grid-cols-4">
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
                        <option value="client">Client</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-700 md:col-span-2">
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Next action
                      </span>
                      <input
                        name="nextAction"
                        defaultValue={matter.nextAction || ""}
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
          ))}
        </div>
      </main>
    </div>
  );
}
