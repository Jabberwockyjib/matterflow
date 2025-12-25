import { redirect } from "next/navigation";
import { getIntakeResponseByMatterId, getTemplateForMatterType } from "@/lib/intake";
import { supabaseAdmin } from "@/lib/supabase/server";
import { IntakeReviewClient } from "./intake-review-client";
import { DynamicFormRenderer } from "@/components/intake/dynamic-form-renderer";
import { Badge } from "@/components/ui/badge";

interface IntakeReviewPageProps {
  params: Promise<{ intakeId: string }>;
}

export default async function IntakeReviewPage({
  params,
}: IntakeReviewPageProps) {
  const { intakeId } = await params;
  const supabase = supabaseAdmin();

  // Get the intake response
  const { data: intakeResponse, error } = await supabase
    .from("intake_responses")
    .select(
      `
      *,
      matters!intake_responses_matter_id_fkey (
        id,
        title,
        matter_type,
        stage,
        client:profiles!matters_client_id_fkey (
          full_name,
          users:user_id (email)
        )
      )
    `
    )
    .eq("id", intakeId)
    .single();

  if (error || !intakeResponse) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Not Found
          </h2>
          <p className="text-red-700">Intake response not found</p>
        </div>
      </div>
    );
  }

  const matter = intakeResponse.matters;
  const template = getTemplateForMatterType(matter.matter_type);

  if (!template) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Template Not Found
          </h2>
          <p className="text-red-700">
            No intake form template found for matter type: {matter.matter_type}
          </p>
        </div>
      </div>
    );
  }

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
  };

  const statusColor =
    statusColors[intakeResponse.status as keyof typeof statusColors] ||
    statusColors.draft;

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Intake Form Review
            </h1>
            <Badge className={statusColor}>{intakeResponse.status}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-500">Form Type</p>
              <p className="text-base text-gray-900 mt-1">
                {intakeResponse.form_type}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Client</p>
              <p className="text-base text-gray-900 mt-1">
                {matter.client?.full_name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Matter</p>
              <p className="text-base text-gray-900 mt-1">{matter.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Matter Stage
              </p>
              <p className="text-base text-gray-900 mt-1">{matter.stage}</p>
            </div>
            {intakeResponse.submitted_at && (
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Submitted At
                </p>
                <p className="text-base text-gray-900 mt-1">
                  {new Date(intakeResponse.submitted_at).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">
                Last Updated
              </p>
              <p className="text-base text-gray-900 mt-1">
                {new Date((intakeResponse as any).updated_at || intakeResponse.created_at).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Form Responses
          </h2>
          <DynamicFormRenderer
            template={template}
            initialValues={(intakeResponse.responses || {}) as Record<string, any>}
            onSubmit={async () => {}}
            readOnly={true}
          />
        </div>

        {/* Actions */}
        {intakeResponse.status === "submitted" && (
          <IntakeReviewClient intakeId={intakeId} />
        )}

        {intakeResponse.status === "approved" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800 font-medium">
              This intake form has been approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
