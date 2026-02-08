import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { getMatter } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchTasksForMatter, fetchTimeEntriesForMatter, getMatterEmails, fetchPracticeSettings, fetchInvoicesForMatter } from "@/lib/data/queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatterDocumentsTab } from "@/components/matter-documents-tab";
import { CommunicationsTab } from "@/components/matter/communications-tab";
import { EditableTimeEntry } from "@/components/time/editable-time-entry";

// Lazy load modals for code splitting
const AddTaskModal = dynamic(
  () => import("@/components/matters/add-task-modal").then(mod => ({ default: mod.AddTaskModal }))
);
const AddTimeEntryModal = dynamic(
  () => import("@/components/matters/add-time-entry-modal").then(mod => ({ default: mod.AddTimeEntryModal }))
);
const ResendIntakeButton = dynamic(
  () => import("@/components/matters/resend-intake-button").then(mod => ({ default: mod.ResendIntakeButton }))
);
const EditMatterWorkflowModal = dynamic(
  () => import("@/components/matters/edit-matter-workflow-modal").then(mod => ({ default: mod.EditMatterWorkflowModal }))
);
const MatterTasksList = dynamic(
  () => import("@/components/matters/matter-tasks-list").then(mod => ({ default: mod.MatterTasksList }))
);

interface MatterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatterDetailPage({ params }: MatterDetailPageProps) {
  const { id } = await params;
  const { session, profile } = await getSessionWithProfile();

  // Middleware handles auth, so if we're here, user is authenticated
  const { data: matter, error } = await getMatter(id);

  if (error || !matter) {
    notFound();
  }

  // Fetch tasks, time entries, emails, settings, and invoices for this matter
  const [{ data: tasks }, { data: timeEntries }, emails, practiceSettings, { data: invoices }] = await Promise.all([
    fetchTasksForMatter(id),
    fetchTimeEntriesForMatter(id),
    getMatterEmails(id),
    fetchPracticeSettings(),
    fetchInvoicesForMatter(id),
  ]);

  // Check if Google Drive folders are initialized
  const supabase = supabaseAdmin();
  const { data: matterFolders } = await supabase
    .from("matter_folders")
    .select("*")
    .eq("matter_id", id)
    .maybeSingle();

  const foldersInitialized = Boolean(matterFolders);

  // Calculate time entry stats - use billable duration when available
  const hourlyRate = practiceSettings?.defaultHourlyRate ?? 0;
  const totalBillableMinutes = timeEntries.reduce((sum, entry) => sum + (entry.billableDurationMinutes ?? entry.durationMinutes ?? 0), 0);
  const totalActualMinutes = timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
  const totalHours = (totalBillableMinutes / 60).toFixed(1);
  const totalActualHours = (totalActualMinutes / 60).toFixed(1);
  const billableAmount = (parseFloat(totalHours) * hourlyRate).toFixed(2);

  // Invoice stats
  const draftInvoice = invoices.find(i => i.status === "draft");
  const totalBilled = invoices.reduce((sum, i) => sum + (i.status !== "draft" ? i.totalCents : 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (i.status === "paid" ? i.totalCents : 0), 0);

  const typedMatter = matter as {
    id: string;
    title: string;
    matter_type: string;
    stage: string;
    billing_model: string;
    next_action: string;
    next_action_due_date: string;
    responsible_party: string;
    created_at: string;
    updated_at: string;
    owner_id: string;
  };

  return (
    <div className="container max-w-6xl py-8">
      {/* Header with Back Button */}
      <div className="mb-6 flex items-center gap-4">
        <Link href="/matters">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Matters
          </Button>
        </Link>
      </div>

      {/* Matter Title and Info */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{typedMatter.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {typedMatter.matter_type}
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
            {typedMatter.stage}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
            {typedMatter.billing_model}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Intake Reminder for Intake Sent stage */}
          {typedMatter.stage === "Intake Sent" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-900">Waiting for client intake</p>
                <p className="text-sm text-amber-700">
                  The client has not yet completed their intake form.
                </p>
              </div>
              <ResendIntakeButton matterId={id} />
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Matter Details</h2>
              <EditMatterWorkflowModal
                matterId={id}
                currentStage={typedMatter.stage}
                currentResponsibleParty={typedMatter.responsible_party}
                currentNextAction={typedMatter.next_action}
                currentNextActionDueDate={typedMatter.next_action_due_date}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Next Action
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {typedMatter.next_action}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Due Date
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {new Date(typedMatter.next_action_due_date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Responsible Party
                </p>
                <p className="mt-1 text-sm capitalize text-slate-900">
                  {typedMatter.responsible_party}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Created
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {new Date(typedMatter.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <MatterDocumentsTab
            matterId={id}
            isInitialized={foldersInitialized}
            folders={matterFolders?.folder_structure as any}
          />
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <CommunicationsTab matterId={id} emails={emails} />
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
              <AddTaskModal matterId={id} />
            </div>

            <MatterTasksList tasks={tasks} matterId={id} />
          </div>
        </TabsContent>

        {/* Time Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Time Entries</h2>
<AddTimeEntryModal matterId={id} matterTitle={typedMatter.title} />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Hours
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                  {totalHours}
                  {totalActualHours !== totalHours && (
                    <span className="text-sm font-normal text-slate-400 ml-1">
                      (actual: {totalActualHours})
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Billable
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">${billableAmount}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Billed
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                  ${(totalBilled / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {timeEntries.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 border-t border-slate-200">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No time entries</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Start tracking time for this matter to see entries here.
                </p>
              </div>
            ) : (
              /* Time Entry List */
              <div className="space-y-3 border-t border-slate-200 pt-6">
                {timeEntries.map((entry) => (
                  <EditableTimeEntry
                    key={entry.id}
                    id={entry.id}
                    description={entry.description}
                    durationMinutes={entry.durationMinutes}
                    billableDurationMinutes={entry.billableDurationMinutes}
                    status={entry.status}
                    startedAt={entry.startedAt}
                    endedAt={entry.endedAt}
                    taskId={entry.taskId}
                    taskTitle={tasks.find(t => t.id === entry.taskId)?.title}
                    tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Billing</h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Billed
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">
                  ${(totalBilled / 100).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                  Paid
                </p>
                <p className="mt-1 text-2xl font-semibold text-green-900 tabular-nums">
                  ${(totalPaid / 100).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Outstanding
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-900 tabular-nums">
                  ${((totalBilled - totalPaid) / 100).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Draft Invoice Link */}
            {draftInvoice && (
              <div className="mb-4 p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Draft Invoice</p>
                    <p className="text-sm text-blue-700">
                      ${(draftInvoice.totalCents / 100).toFixed(2)} — auto-updated from time entries
                    </p>
                  </div>
                  <Link href={`/billing/${draftInvoice.id}`}>
                    <Button size="sm" variant="outline">
                      Edit &amp; Send
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Invoice List */}
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No invoices yet. Log time to auto-create a draft invoice.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <Link key={inv.id} href={`/billing/${inv.id}`} className="block">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          inv.status === "paid" ? "success" :
                          inv.status === "sent" ? "warning" :
                          inv.status === "overdue" ? "danger" : "outline"
                        } className="capitalize">
                          {inv.status}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          #{inv.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        ${(inv.totalCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
