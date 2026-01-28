import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { getMatter } from "@/lib/data/actions";
import { getSessionWithProfile } from "@/lib/auth/server";
import { fetchTasksForMatter, fetchTimeEntriesForMatter, getMatterEmails } from "@/lib/data/queries";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { MatterDocumentsTab } from "@/components/matter-documents-tab";
import { CommunicationsTab } from "@/components/matter/communications-tab";

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

  // Fetch tasks, time entries, and emails for this matter
  const { data: tasks } = await fetchTasksForMatter(id);
  const { data: timeEntries } = await fetchTimeEntriesForMatter(id);
  const emails = await getMatterEmails(id);

  // Check if Google Drive folders are initialized
  const supabase = supabaseAdmin();
  const { data: matterFolders } = await supabase
    .from("matter_folders")
    .select("*")
    .eq("matter_id", id)
    .maybeSingle();

  const foldersInitialized = Boolean(matterFolders);

  // Calculate time entry stats
  const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  // For now, assume $200/hr rate (this should come from matter settings)
  const billableAmount = (parseFloat(totalHours) * 200).toFixed(2);

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
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
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Matter Details</h2>

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

            {tasks.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No tasks</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Get started by creating a new task for this matter.
                </p>
              </div>
            ) : (
              /* Task List */
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{task.title}</h3>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge
                          variant={task.responsibleParty === "client" ? "warning" : "default"}
                        >
                          {task.responsibleParty}
                        </Badge>
                        <Badge variant="outline">{task.status}</Badge>
                        {task.dueDate && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <CalendarClock className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Time Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Time Entries</h2>
<AddTimeEntryModal matterId={id} />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total Hours
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{totalHours}</p>
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
                <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">$0.00</p>
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
                  <div
                    key={entry.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">
                        {entry.description || "No description"}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <Badge variant="outline">{entry.status}</Badge>
                        <span className="text-slate-500">
                          {entry.durationMinutes ? `${(entry.durationMinutes / 60).toFixed(1)} hrs` : "N/A"}
                        </span>
                        {entry.startedAt && (
                          <span className="text-slate-500">
                            {new Date(entry.startedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
