import { redirect } from "next/navigation";
import { getIntakeForm } from "@/lib/intake";
import { IntakeFormClient } from "./intake-form-client";
import { supabaseAdmin } from "@/lib/supabase/server";

interface IntakeFormPageProps {
  params: Promise<{ matterId: string }>;
}

export default async function IntakeFormPage({ params }: IntakeFormPageProps) {
  const { matterId } = await params;

  // Get the intake form and template
  const result = await getIntakeForm(matterId);

  if ("error" in result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{result.error}</p>
        </div>
      </div>
    );
  }

  const { response, template } = (result.data || {}) as { response: any; template: any };

  // Get matter details for display
  const supabase = supabaseAdmin();
  const { data: matter } = await supabase
    .from("matters")
    .select("title, matter_type, profiles:client_id (full_name)")
    .eq("id", matterId)
    .single() as { data: { title: string; matter_type: string; profiles?: { full_name: string } } | null };

  if (!matter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Not Found</h1>
          <p className="text-gray-700">Matter not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {template.name}
            </h1>
            <p className="text-lg text-gray-600">
              Matter: <span className="font-medium">{matter.title}</span>
            </p>
            {matter.profiles?.full_name && (
              <p className="text-sm text-gray-500 mt-1">
                Client: {matter.profiles.full_name}
              </p>
            )}
          </div>

          {response?.status === "submitted" && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">
                Thank you! Your intake form has been submitted and is under review.
              </p>
            </div>
          )}

          {response?.status === "approved" && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-800 font-medium">
                Your intake form has been approved. Your matter is now under review.
              </p>
            </div>
          )}

          <IntakeFormClient
            matterId={matterId}
            template={template}
            initialValues={response?.responses || {}}
            status={response?.status || "draft"}
          />
        </div>
      </div>
    </div>
  );
}
