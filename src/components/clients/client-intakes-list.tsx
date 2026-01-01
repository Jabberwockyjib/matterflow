import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import type { ClientIntakeSummary } from "@/lib/data/queries";

interface ClientIntakesListProps {
  intakes: ClientIntakeSummary[];
}

const statusBadgeColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
};

export function ClientIntakesList({ intakes }: ClientIntakesListProps) {
  if (intakes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No intake submissions</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {intakes.map((intake) => (
        <li key={intake.id} className="py-3">
          <Link
            href={`/admin/intake/${intake.id}`}
            className="block hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {intake.formType}
                </p>
                {intake.submittedAt && (
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(intake.submittedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge className={statusBadgeColors[intake.status] || "bg-slate-100"}>
                {intake.status}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
