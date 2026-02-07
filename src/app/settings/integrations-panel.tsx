import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleDriveConnect } from "@/components/google-drive-connect";
import { SquareConnect } from "@/components/square-connect";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type IntegrationsPanelProps = {
  profile: Profile;
};

export async function IntegrationsPanel({ profile: _profile }: IntegrationsPanelProps) {
  // Fetch practice settings for all integrations
  const supabase = supabaseAdmin();
  const { data: practiceSettings } = await supabase
    .from("practice_settings")
    .select(`
      google_refresh_token,
      google_connected_at,
      google_connected_email,
      google_calendar_last_sync,
      square_access_token,
      square_merchant_id,
      square_location_id,
      square_location_name,
      square_environment,
      square_connected_at,
      square_webhook_signature_key
    `)
    .limit(1)
    .maybeSingle() as { data: {
      google_refresh_token: string | null;
      google_connected_at: string | null;
      google_connected_email: string | null;
      google_calendar_last_sync: string | null;
      square_access_token: string | null;
      square_merchant_id: string | null;
      square_location_id: string | null;
      square_location_name: string | null;
      square_environment: string | null;
      square_connected_at: string | null;
      square_webhook_signature_key: string | null;
    } | null };

  // Google connection status
  const isGoogleConnected = Boolean(practiceSettings?.google_refresh_token);
  const googleConnectedAt = practiceSettings?.google_connected_at || undefined;
  const googleConnectedEmail = practiceSettings?.google_connected_email || undefined;

  // Square connection status (check DB first, then env vars for backwards compatibility)
  const isSquareConnectedViaOAuth = Boolean(practiceSettings?.square_access_token);
  const isSquareConnectedViaEnv = Boolean(process.env.SQUARE_ACCESS_TOKEN) && Boolean(process.env.SQUARE_LOCATION_ID);
  const isSquareConnected = isSquareConnectedViaOAuth || isSquareConnectedViaEnv;

  // Square settings for display
  const squareSettings = isSquareConnectedViaOAuth
    ? {
        merchantId: practiceSettings?.square_merchant_id || undefined,
        locationId: practiceSettings?.square_location_id || undefined,
        locationName: practiceSettings?.square_location_name || undefined,
        environment: (practiceSettings?.square_environment as "sandbox" | "production") || "sandbox",
        connectedAt: practiceSettings?.square_connected_at || undefined,
        hasWebhookKey: Boolean(practiceSettings?.square_webhook_signature_key),
      }
    : isSquareConnectedViaEnv
    ? {
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: (process.env.SQUARE_ENVIRONMENT as "sandbox" | "production") || "sandbox",
        connectedAt: undefined,
        hasWebhookKey: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
      }
    : undefined;

  return (
    <div className="space-y-6">
      {/* Google Workspace (Drive + Gmail) */}
      <Card>
        <CardHeader>
          <CardTitle>Google Workspace</CardTitle>
          <CardDescription>
            Connect Google Drive, Gmail, and Calendar for documents, email, and scheduling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleDriveConnect
            isConnected={isGoogleConnected}
            connectedAt={googleConnectedAt}
            connectedEmail={googleConnectedEmail}
            returnUrl="/settings?tab=integrations"
          />

          {isGoogleConnected && (
            <div className="mt-4 space-y-4">
              {/* Signed-in account */}
              {googleConnectedEmail && (
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="text-sm font-medium text-slate-900">{googleConnectedEmail}</p>
                </div>
              )}

              {/* Google Drive Status */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Google Drive Connected
                    </p>
                    <p className="text-xs text-green-700">
                      Automatic folder structure, versioning, and sharing
                    </p>
                  </div>
                </div>
              </div>

              {/* Gmail Status */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Gmail Connected
                    </p>
                    <p className="text-xs text-green-700">
                      Email sync and sending enabled
                    </p>
                  </div>
                </div>
              </div>

              {/* Google Calendar Status */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Google Calendar Connected
                    </p>
                    <p className="text-xs text-green-700">
                      Two-way event sync enabled
                      {practiceSettings?.google_calendar_last_sync && (
                        <> &middot; Last synced {new Date(practiceSettings.google_calendar_last_sync).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Square Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Square Payments</CardTitle>
          <CardDescription>
            Payment processing for invoices via Square
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SquareConnect
            isConnected={isSquareConnected}
            merchantName={squareSettings?.merchantId}
            locationName={squareSettings?.locationName || squareSettings?.locationId}
            environment={squareSettings?.environment}
            connectedAt={squareSettings?.connectedAt}
            hasWebhookKey={squareSettings?.hasWebhookKey}
            returnUrl="/settings?tab=integrations"
          />
        </CardContent>
      </Card>

    </div>
  );
}
