import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/cards/stat-card";
import { MatterCard } from "@/components/cards/matter-card";
import {
  ContentCard,
  ContentCardContent,
  ContentCardDescription,
  ContentCardHeader,
  ContentCardTitle,
} from "@/components/cards/content-card";
import {
  ArrowRight,
  Calendar,
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
  fetchMattersForClient,
  fetchTasks,
  fetchTimeEntries,
  getClientPendingIntake,
} from "@/lib/data/queries";
import { fetchUpcomingEvents } from "@/lib/calendar/queries";
import { getSessionWithProfile } from "@/lib/auth/server";
import { cn, isOverdue, formatDueDate } from "@/lib/utils";
import { ClientDashboard } from "@/components/client-dashboard";

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
  if (badge === "staff") return "success";
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
  const { profile } = await getSessionWithProfile();

  // Landing page for unauthenticated users
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black flex flex-col">
        <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="container flex items-center justify-between py-4">
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                MatterFlow
              </p>
            </div>
            <Link href="/auth/sign-in">
              <Button size="sm">Sign In</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="container max-w-2xl text-center py-16">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
              Legal Practice Management
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Streamline your workflow with matter tracking, time management, billing, and client communication — all in one place.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/sign-in">
                <Button size="lg">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3 text-left">
              <div className="p-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <FileText className="h-8 w-8 text-slate-600 dark:text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Matter Pipeline</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Track every case from intake to completion with clear next actions.</p>
              </div>
              <div className="p-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <Timer className="h-8 w-8 text-slate-600 dark:text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Time Tracking</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">One-click timers and manual entry with approval workflow.</p>
              </div>
              <div className="p-6 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <Wallet2 className="h-8 w-8 text-slate-600 dark:text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">Integrated Billing</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Generate invoices and accept payments with Square integration.</p>
              </div>
            </div>
          </div>
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6">
          <div className="container text-center text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} MatterFlow. Workflow-first legal practice management.
          </div>
        </footer>
      </div>
    );
  }

  // Client-specific dashboard
  if (profile?.role === "client") {
    const [{ data: clientMatters }, pendingIntake] = await Promise.all([
      fetchMattersForClient(),
      getClientPendingIntake(),
    ]);

    // Redirect to intake form if client has pending intake
    if (pendingIntake.hasPendingIntake && pendingIntake.matterId) {
      redirect(`/intake/${pendingIntake.matterId}`);
    }

    return (
      <ClientDashboard
        profileName={profile.full_name || null}
        matters={clientMatters}
        pendingIntake={pendingIntake}
      />
    );
  }

  // Staff/Admin dashboard
  const [{ data: matters, source: matterSource }, { data: tasks }, { data: invoices }, { data: timeEntries }, upcomingEvents] =
    await Promise.all([
      fetchMatters(),
      fetchTasks(),
      fetchInvoices(),
      fetchTimeEntries(),
      fetchUpcomingEvents(5),
    ]);

  // Build lookup map once O(n) instead of O(n * stages) iterations
  const mattersByStage = new Map<string, typeof matters>();
  for (const matter of matters) {
    const existing = mattersByStage.get(matter.stage) ?? [];
    existing.push(matter);
    mattersByStage.set(matter.stage, existing);
  }

  const stageCounts = stages.map((stage) => {
    const stageMatters = mattersByStage.get(stage) ?? [];
    const first = stageMatters[0];
    return {
      stage,
      count: stageMatters.length,
      next: first?.nextAction ?? (stage === "Billing Pending" ? "Approve invoice" : "Set next action"),
      badge: first?.responsibleParty ?? "lawyer",
    };
  });

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
              icon: FileText,
            },
            {
              label: "Unpaid Invoices",
              value: currency(unpaidTotal),
              helper: `${unpaidInvoices.length} invoices open`,
              icon: Wallet2,
            },
            {
              label: "Timers Running",
              value: timersRunning,
              helper: timersRunning ? "stop before billing" : "none running",
              icon: Timer,
            },
          ].map((stat, index) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              helper={stat.helper}
              icon={stat.icon}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <ContentCard className="lg:col-span-2 animate-fade-in">
            <ContentCardHeader className="pb-0">
              <ContentCardTitle className="flex items-center gap-2">
                Next actions by responsible party
                <Clock4 className="h-4 w-4 text-slate-500" />
              </ContentCardTitle>
              <ContentCardDescription>
                Every matter has one next action with a responsible party (lawyer, client, or staff) and a due date.
              </ContentCardDescription>
            </ContentCardHeader>
            <ContentCardContent>
              <div className="space-y-3">
                {sortedMatters.slice(0, 8).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No matters found. Create your first matter to get started.
                    </p>
                  </div>
                ) : (
                  sortedMatters.slice(0, 8).map((matter, index) => (
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
                  ))
                )}
              </div>
            </ContentCardContent>
          </ContentCard>

          <ContentCard className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <ContentCardHeader className="pb-3">
              <ContentCardTitle className="flex items-center gap-2">
                Pipeline stages
                <Badge variant="outline" className="text-xs">
                  11 fixed
                </Badge>
              </ContentCardTitle>
              <ContentCardDescription>Matters by stage and owner.</ContentCardDescription>
            </ContentCardHeader>
            <ContentCardContent className="space-y-2">
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
            </ContentCardContent>
          </ContentCard>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mt-6">
            <ContentCard className="animate-fade-in" style={{ animationDelay: "125ms" }}>
              <ContentCardHeader className="pb-3">
                <ContentCardTitle className="flex items-center gap-2">
                  Upcoming Events
                  <Calendar className="h-4 w-4 text-slate-500" />
                </ContentCardTitle>
                <ContentCardDescription>Next events on your calendar.</ContentCardDescription>
              </ContentCardHeader>
              <ContentCardContent className="space-y-2">
                {upcomingEvents.map((event) => {
                  const startDate = new Date(event.start_time);
                  const isToday = startDate.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              event.event_type === "task_due" ? "#d97706" :
                              event.event_type === "scheduled_call" ? "#2563eb" :
                              event.event_type === "deadline" ? "#dc2626" :
                              event.event_type === "court_date" ? "#7c3aed" :
                              event.event_type === "meeting" ? "#059669" : "#6b7280",
                          }}
                        />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-50">
                            {event.title}
                          </p>
                          {event.matter_title && (
                            <p className="text-slate-500">{event.matter_title}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-slate-600 dark:text-slate-400">
                        <p className={isToday ? "font-semibold text-primary" : ""}>
                          {isToday ? "Today" : startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                        {!event.all_day && (
                          <p>{startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Link href="/calendar" className="text-xs font-medium text-primary hover:underline">
                  View full calendar &rarr;
                </Link>
              </ContentCardContent>
            </ContentCard>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ContentCard className="animate-fade-in" style={{ animationDelay: "150ms" }}>
            <ContentCardHeader className="pb-3">
              <ContentCardTitle className="flex items-center gap-2">
                Billing & payments
                <Wallet2 className="h-4 w-4 text-slate-500" />
              </ContentCardTitle>
              <ContentCardDescription>
                Square sync is the payment rail; billing stays in MatterFlow.
              </ContentCardDescription>
            </ContentCardHeader>
            <ContentCardContent className="space-y-3">
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
            </ContentCardContent>
          </ContentCard>

          <ContentCard className="animate-fade-in" style={{ animationDelay: "200ms" }}>
            <ContentCardHeader className="pb-3">
              <ContentCardTitle className="flex items-center gap-2">
                Time, docs, and automations
              </ContentCardTitle>
              <ContentCardDescription>
                Guardrails for the MVP while AI hooks are stubbed.
              </ContentCardDescription>
            </ContentCardHeader>
            <ContentCardContent className="space-y-4">
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
            </ContentCardContent>
          </ContentCard>
        </div>
      </main>
    </div>
  );
}