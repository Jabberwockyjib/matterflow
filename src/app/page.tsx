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
                {sortedMatters.slice(0, 8).map((matter) => (
                  <div
                    key={matter.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border px-4 py-3 transition-colors md:flex-row md:items-center md:justify-between",
                      isOverdue(matter.nextActionDueDate)
                        ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"
                        : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                    )}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {matter.title}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Next: {matter.nextAction}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={badgeVariant(matter.responsibleParty)}>
                        {matter.responsibleParty === "client" ? "Client" : matter.responsibleParty === "staff" ? "Staff" : "Lawyer"} owns
                      </Badge>
                      <Badge 
                        variant={isOverdue(matter.nextActionDueDate) ? "destructive" : "outline"}
                      >
                        Due: {formatDueDate(matter.nextActionDueDate)}
                      </Badge>
                    </div>
                  </div>
                ))}
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