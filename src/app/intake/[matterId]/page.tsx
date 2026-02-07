import { redirect } from "next/navigation";
import { getIntakeForm } from "@/lib/intake";
import { IntakeFormClient } from "./intake-form-client";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";

interface IntakeFormPageProps {
  params: Promise<{ matterId: string }>;
  searchParams: Promise<{ code?: string }>;
}

/**
 * Verify an invite code grants access to a specific matter.
 * Returns true if the code is valid for this matter.
 */
async function verifyInviteCode(matterId: string, code: string): Promise<boolean> {
  const supabase = supabaseAdmin();

  // Check if the invitation exists and links to this matter
  const { data: invitation } = await supabase
    .from("client_invitations")
    .select("id, matter_id, status, expires_at")
    .eq("invite_code", code)
    .single();

  if (!invitation) return false;

  // Check expiry
  if (invitation.expires_at && new Date() > new Date(invitation.expires_at)) {
    return false;
  }

  // Check cancellation (but allow completed — client may revisit)
  if (invitation.status === "cancelled") return false;

  // Verify the invitation is linked to this matter
  if (invitation.matter_id !== matterId) {
    // Also check if the matter has this invitation_id (belt & suspenders)
    const { data: matter } = await supabase
      .from("matters")
      .select("invitation_id")
      .eq("id", matterId)
      .single();

    if (!matter || matter.invitation_id !== invitation.id) {
      return false;
    }
  }

  return true;
}

export default async function IntakeFormPage({ params, searchParams }: IntakeFormPageProps) {
  const { matterId } = await params;
  const { code } = await searchParams;

  // Authorization: invite code OR authenticated user
  let isAnonymous = false;

  if (code) {
    const valid = await verifyInviteCode(matterId, code);
    if (!valid) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
            <p className="text-gray-700">
              This intake form link is invalid or has expired. Please contact your lawyer for a new invitation.
            </p>
          </div>
        </div>
      );
    }
    isAnonymous = true;
  } else {
    // No code — require authentication
    const { session } = await getSessionWithProfile();
    if (!session) {
      redirect(`/auth/sign-in?redirect=/intake/${matterId}`);
    }
  }

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
    .select("title, matter_type, client_name, profiles:client_id (full_name)")
    .eq("id", matterId)
    .single() as { data: { title: string; matter_type: string; client_name?: string; profiles?: { full_name: string } } | null };

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

  const clientName = matter.profiles?.full_name || matter.client_name;

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
            {clientName && (
              <p className="text-sm text-gray-500 mt-1">
                Client: {clientName}
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
            inviteCode={isAnonymous ? code : undefined}
          />
        </div>
      </div>
    </div>
  );
}
