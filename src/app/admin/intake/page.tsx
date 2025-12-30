import Link from "next/link";
import { getAllIntakeResponses } from "@/lib/intake";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AdminIntakeListPage() {
  const { data: responses, error } = await getAllIntakeResponses();

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{String(error)}</p>
        </div>
      </div>
    );
  }

  const pendingResponses =
    responses?.filter((r) => r.status === "submitted") || [];
  const draftResponses = responses?.filter((r) => r.status === "draft") || [];
  const approvedResponses =
    responses?.filter((r) => r.status === "approved") || [];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Intake Form Management
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve client intake form submissions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Pending Review
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {pendingResponses.length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Drafts</h3>
            <p className="text-3xl font-bold text-gray-600">
              {draftResponses.length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              Approved
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {approvedResponses.length}
            </p>
          </Card>
        </div>

        {/* Pending Reviews Section */}
        {pendingResponses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Pending Reviews ({pendingResponses.length})
            </h2>
            <div className="space-y-4">
              {pendingResponses.map((response) => (
                <IntakeResponseCard key={response.id} response={response} />
              ))}
            </div>
          </div>
        )}

        {/* Drafts Section */}
        {draftResponses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Drafts ({draftResponses.length})
            </h2>
            <div className="space-y-4">
              {draftResponses.map((response) => (
                <IntakeResponseCard key={response.id} response={response} />
              ))}
            </div>
          </div>
        )}

        {/* Approved Section */}
        {approvedResponses.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Approved ({approvedResponses.length})
            </h2>
            <div className="space-y-4">
              {approvedResponses.map((response) => (
                <IntakeResponseCard key={response.id} response={response} />
              ))}
            </div>
          </div>
        )}

        {!responses || responses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">No intake forms submitted yet</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IntakeResponseCard({ response }: { response: any }) {
  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
  };

  const statusColor = statusColors[response.status as keyof typeof statusColors] || statusColors.draft;

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {response.form_type}
            </h3>
            <Badge className={statusColor}>{response.status}</Badge>
          </div>

          <div className="space-y-1 text-sm text-gray-600 mb-4">
            <p>
              <span className="font-medium">Matter ID:</span>{" "}
              {response.matter_id.substring(0, 8).toUpperCase()}
            </p>
            {response.submitted_at && (
              <p>
                <span className="font-medium">Submitted:</span>{" "}
                {new Date(response.submitted_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            <p>
              <span className="font-medium">Last Updated:</span>{" "}
              {new Date(response.updated_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          <Link
            href={`/admin/intake/${response.id}`}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Review Form →
          </Link>
        </div>
      </div>
    </Card>
  );
}
