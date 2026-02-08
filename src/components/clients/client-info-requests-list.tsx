import { WorkflowStatusBadge } from "@/components/ui/stage-badge";
import { MessageSquare } from "lucide-react";
import type { ClientInfoRequestSummary } from "@/lib/data/queries";

interface ClientInfoRequestsListProps {
  infoRequests: ClientInfoRequestSummary[];
}

export function ClientInfoRequestsList({ infoRequests }: ClientInfoRequestsListProps) {
  if (infoRequests.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No info requests</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {infoRequests.map((ir) => (
        <li key={ir.id} className="py-3">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {ir.questionCount} question{ir.questionCount !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-500">
                Sent {new Date(ir.createdAt).toLocaleDateString()}
              </p>
            </div>
            <WorkflowStatusBadge status={ir.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
