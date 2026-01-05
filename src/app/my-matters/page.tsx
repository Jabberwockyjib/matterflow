import Link from "next/link";
import { Folder, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchMattersForClient, getClientPendingIntake } from "@/lib/data/queries";
import { redirect } from "next/navigation";

const stageConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "outline" }> = {
  "Lead Created": { label: "New", variant: "default" },
  "Intake Sent": { label: "Intake Pending", variant: "warning" },
  "Intake Received": { label: "Under Review", variant: "default" },
  "Under Review": { label: "Under Review", variant: "default" },
  "Active": { label: "Active", variant: "success" },
  "On Hold": { label: "On Hold", variant: "outline" },
  "Completed": { label: "Completed", variant: "success" },
  "Archived": { label: "Archived", variant: "outline" },
};

export default async function MyMattersPage() {
  const { data: matters, error } = await fetchMattersForClient();
  const pendingIntake = await getClientPendingIntake();

  // If client has pending intake, redirect them to complete it
  if (pendingIntake.hasPendingIntake && pendingIntake.matterId) {
    redirect(`/intake/${pendingIntake.matterId}`);
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Folder className="h-8 w-8" />
          My Matters
        </h1>
        <p className="text-slate-600 mt-1">
          View the status of your legal matters
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Matters List */}
      <div className="space-y-4">
        {matters.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Folder className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No matters yet</h3>
            <p className="text-slate-600 mt-1">
              Your legal matters will appear here once they are created.
            </p>
          </div>
        ) : (
          matters.map((matter) => {
            const stage = stageConfig[matter.stage] || { label: matter.stage, variant: "default" as const };
            const isActionRequired = matter.responsibleParty === "client";
            const isOverdue = matter.nextActionDueDate && new Date(matter.nextActionDueDate) < new Date();

            return (
              <div
                key={matter.id}
                className="bg-white rounded-lg border border-slate-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {matter.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={stage.variant}>{stage.label}</Badge>
                      <span className="text-sm text-slate-500 capitalize">{matter.matterType}</span>
                    </div>
                  </div>
                  {isActionRequired && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {isOverdue ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      Action Required
                    </div>
                  )}
                </div>

                {/* Next Action */}
                {matter.nextAction && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">
                      Next Step
                    </p>
                    <p className="text-sm text-slate-900">{matter.nextAction}</p>
                    {matter.nextActionDueDate && (
                      <p className={`text-xs mt-1 ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
                        Due: {new Date(matter.nextActionDueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Links */}
                {matter.stage === "Intake Sent" && (
                  <div className="mt-4">
                    <Link
                      href={`/intake/${matter.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Complete Intake Form
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
