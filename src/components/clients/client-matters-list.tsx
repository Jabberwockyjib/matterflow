import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { ClientMatterSummary } from "@/lib/data/queries";

interface ClientMattersListProps {
  matters: ClientMatterSummary[];
}

const stageBadgeColors: Record<string, string> = {
  "Lead Created": "bg-slate-100 text-slate-700",
  "Intake Sent": "bg-yellow-100 text-yellow-800",
  "Intake Received": "bg-blue-100 text-blue-800",
  "Under Review": "bg-purple-100 text-purple-800",
  "Waiting on Client": "bg-orange-100 text-orange-800",
  "Completed": "bg-green-100 text-green-800",
  "Archived": "bg-gray-100 text-gray-600",
  "Declined": "bg-red-100 text-red-800",
};

export function ClientMattersList({ matters }: ClientMattersListProps) {
  if (matters.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No matters yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {matters.map((matter) => (
        <li key={matter.id} className="py-3">
          <Link
            href={`/matters/${matter.id}`}
            className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {matter.title}
                </p>
                <p className="text-xs text-slate-500">{matter.matterType}</p>
              </div>
              <Badge className={stageBadgeColors[matter.stage] || "bg-slate-100"}>
                {matter.stage}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
