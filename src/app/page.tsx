import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  Clock4,
  FileText,
  Mail,
  Repeat,
  Timer,
  Wallet2,
} from "lucide-react";

import {
  fetchInvoices,
  fetchMatters,
  fetchTasks,
  fetchTimeEntries,
} from "@/lib/data/queries";
import { getSessionWithProfile } from "@/lib/auth/server";
import { cn, isOverdue, formatDueDate } from "@/lib/utils";

const automations = [
  {
    title: "Intake reminder",
    detail: "24h after invite; pauses on submission",
    icon: Mail,
  },
  {
    title: "Invoice follow-up",
    detail: "3/7/14 day cadence; stops on payment",
    icon: Wallet2,
  },
  {
    title: "Square sync retry",
    detail: "Flags failures and queues retries",
    icon: Repeat,
  },
];

const badgeVariant = (badge: string) => {
  if (badge === "client") return "warning";
  if (badge === "lawyer") return "default";
  if (badge === "staff") return "secondary";
  return "outline";
};

const responsiblePartyColor = (party: string) => {
  switch (party) {
    case "lawyer":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "staff":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "client":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200";
  }
};

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

const currency = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

export default async function Home() {
  const [{ data: matters, source: matterSource }, { data: tasks }, { data: invoices }, { data: timeEntries }, { profile }] =
    await Promise.all([
      fetchMatters(),
      fetchTasks(),
      fetchInvoices(),
      fetchTimeEntries(),
      getSessionWithProfile(),
    ]);

  const stageCounts = stages.map((stage) => ({
    stage,
    count: matters.filter((m) => m.stage === stage).length,
    next:
      matters.find((m) => m.stage === stage)?.nextAction ||
      (stage === "Billing Pending" ? "Approve invoice" : "Set next action"),
    badge:
      matters.find((m) => m.stage === stage)?.responsibleParty || "lawyer",
  }));

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.status !== "partial",
  );
  const unpaidTotal = unpaidInvoices.reduce(
    (sum, inv) => sum + (inv.totalCents || 0),
    0,
  );
  const timersRunning = timeEntries.filter((t) => !t.endedAt).length;
  const waitingOnClient = matters.filter(
    (m) => m.responsibleParty === "client",
  ).length;

  const taskRows = tasks.slice(0, 3);
  const billingRows = invoices.slice(0, 3);
  
  // Sort matters by next action due date
  const sortedMatters = [...matters].sort((a, b) => {
    const dateA = new Date(a.nextActionDueDate || "").getTime();
    const dateB = new Date(b.nextActionDueDate || "").getTime();
    return dateA - dateB;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="container flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              MatterFlow
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50">
              Control Center
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Map the MVP: matters, billing, time, and automation in one pass.
              <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
                {matterSource === "supabase"
                  ? "Live Supabase data"
                  : "Mock data until Supabase is configured"}
              </span>
              {profile?.role ? (
                <span className="ml-2 text-xs uppercase text-slate-500 dark:text-slate-400">
                  Role: {profile.role}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/matters">
              <Button variant="secondary" size="sm">
                Matters
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="secondary" size="sm">
                Tasks
              </Button>
            </Link>
            <Link href="/billing">
              <Button size="sm">
                Billing
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Active Matters",
              value: matters.length,
              helper: `${waitingOnClient} waiting on client`,
            },
            {
              label: "Unpaid Invoices",
              value: currency(unpaidTotal),
              helper: `${unpaidInvoices.length} invoices open`,
            },
            {
              label: "Timers Running",
              value: timersRunning,
              helper: timersRunning ? "stop before billing" : "none running",
            },
          ].map((stat) => (
            <Card key={stat.label} className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-600 dark:text-slate-400">
                {stat.helper}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 animate-fade-in">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2">
                Next actions by responsible party
                <Clock4 className="h-4 w-4 text-slate-500" />
              </CardTitle>
              <CardDescription>
                Every matter has one next action with a responsible party (lawyer, client, or staff) and a due date.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sortedMatters.slice(0, 8).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No matters found. Create your first matter to get started.
                    </p>
                  </div>
                ) : (
                  sortedMatters.slice(0, 8).map((matter) => (
                    <div
                      key={matter.id}
                      className={cn(
                        "rounded-lg border bg-white p-4 transition-colors dark:bg-slate-900",
                        isOverdue(matter.nextActionDueDate)
                          ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {/* Matter Header */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <h2 className="font-medium text-slate-900 dark:text-slate-100">
                            {matter.title}
                          </h2>
                          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                            {matter.matterType && `${matter.matterType} • `}
                            {matter.stage}
                          </p>
                        </div>

                        {/* Due Date Badge */}
                        <span
                          className={cn(
                            "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            isOverdue(matter.nextActionDueDate)
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
                      </div>

                      {/* Next Action */}
                      <div className="mt-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Next Action
                            </p>
                            <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                              {matter.nextAction}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Responsible
                            </p>
                            <span
                              className={cn(
                                "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                                responsiblePartyColor(matter.responsibleParty)
                              )}
                            >
                              {matter.responsibleParty}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Metadata */}
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{matter.billingModel && `${matter.billingModel} fee`}</span>
                        <span>
                          Updated{" "}
                          {new Date(matter.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                Pipeline stages
                <Badge variant="outline" className="text-xs">
                  11 fixed
                </Badge>
              </CardTitle>
              <CardDescription>Matters by stage and owner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stageCounts.slice(0, 6).map((item) => (
                <div
                  key={item.stage}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                >
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      {item.stage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeVariant(item.badge)} className="text-xs">
                      {item.badge === "client" ? "Client" : item.badge === "staff" ? "Staff" : "Lawyer"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{item.count}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                Billing & payments
                <Wallet2 className="h-4 w-4 text-slate-500" />
              </CardTitle>
              <CardDescription>
                Square sync is the payment rail; billing stays in MatterFlow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {billingRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      Invoice {row.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Matter ID: {row.matterId}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {currency(row.totalCents)}
                    </span>
                    <Button variant="outline" size="sm">
                      {row.status === "draft"
                        ? "approve"
                        : row.status === "sent"
                          ? "retry sync"
                          : "view"}
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-600 dark:text-slate-400">
                No invoice can be created outside MatterFlow. Sync failures must
                be visible and retryable.
              </p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                Time, docs, and automations
              </CardTitle>
              <CardDescription>
                Guardrails for the MVP while AI hooks are stubbed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
                <Timer className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Time tracking
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Start/stop from the matter page; approvals gate invoicing.
                  </p>
                </div>
                <Badge variant="outline">Timer + manual</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
                <FileText className="h-4 w-4 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
Documents
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Store metadata + folder mapping now; Drive sync job follows
                    the PRD structure.
                  </p>
                </div>
                <Badge variant="outline">Drive-first</Badge>
              </div>
              <div className="grid gap-3">
                {automations.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
                  >
                    <item.icon className="mt-0.5 h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-slate-500" />
                Human approval remains required for AI decisions and conflict
                checks.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}