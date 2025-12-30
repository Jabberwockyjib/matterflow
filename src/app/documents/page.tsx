import { GoogleDriveConnect } from "@/components/google-drive-connect";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function DocumentsPage() {
  const { session, profile } = await getSessionWithProfile();

  if (!session || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">Please sign in to access documents.</p>
      </div>
    );
  }

  // Check if Google Drive is connected (practice-wide, not per-user)
  const supabase = supabaseAdmin();
  const { data: practiceSettings } = await supabase
    .from("practice_settings")
    .select("google_refresh_token, google_connected_at")
    .limit(1)
    .maybeSingle();

  const isConnected = Boolean(practiceSettings?.google_refresh_token);
  const connectedAt = practiceSettings?.google_connected_at || undefined;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-600 mt-2">
            Manage your matter documents in Google Drive
          </p>
        </div>

        <GoogleDriveConnect
          isConnected={isConnected}
          connectedAt={connectedAt}
          returnUrl="/documents"
        />

        {isConnected ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Recent Documents
            </h2>
            <p className="text-sm text-slate-600">
              Documents are organized by matter. Navigate to a specific matter
              to view and upload documents.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Get Started
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Connect your Google Drive account to enable automatic document
              organization.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-slate-700">
                  Automatic folder structure: /Client Name/Matter Name/00
                  Intake, 01 Source Docs, etc.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-slate-700">
                  Version control and document history
                </p>
              </div>
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm text-slate-700">
                  Secure client file sharing
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
