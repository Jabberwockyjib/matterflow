import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleDriveConnect } from "@/components/google-drive-connect";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type IntegrationsPanelProps = {
  profile: Profile;
};

export async function IntegrationsPanel({ profile }: IntegrationsPanelProps) {
  // Check Google Drive connection (practice-wide, not per-user)
  const supabase = supabaseAdmin();
  const { data: practiceSettings } = await supabase
    .from("practice_settings")
    .select("google_refresh_token, google_connected_at")
    .limit(1)
    .maybeSingle();

  const isGoogleConnected = Boolean(practiceSettings?.google_refresh_token);
  const googleConnectedAt = practiceSettings?.google_connected_at || undefined;

  // Check if Square is configured (from env vars)
  const isSquareConfigured =
    Boolean(process.env.SQUARE_ACCESS_TOKEN) &&
    Boolean(process.env.SQUARE_LOCATION_ID);

  // Check if Resend is configured
  const isResendConfigured =
    Boolean(process.env.RESEND_API_KEY) &&
    Boolean(process.env.RESEND_FROM_EMAIL);

  return (
    <div className="space-y-6">
      {/* Google Drive */}
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <CardDescription>
            Connect Google Drive to automatically organize documents by matter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleDriveConnect
            isConnected={isGoogleConnected}
            connectedAt={googleConnectedAt}
            returnUrl="/settings?tab=integrations"
          />

          {isGoogleConnected && (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="font-medium">Features:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Automatic folder structure per matter</li>
                <li>Document versioning and history</li>
                <li>Secure client file sharing</li>
              </ul>
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
          {isSquareConfigured ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-green-600"
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
                    Square Connected
                  </p>
                  <p className="text-xs text-green-700">
                    Environment:{" "}
                    {process.env.SQUARE_ENVIRONMENT === "production"
                      ? "Production"
                      : "Sandbox"}
                  </p>
                  <p className="text-xs text-green-700">
                    Location ID: {process.env.SQUARE_LOCATION_ID?.slice(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Square Not Configured
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Configure Square in environment variables:
                  </p>
                  <ul className="text-xs text-amber-700 mt-1 ml-4 list-disc">
                    <li>SQUARE_ACCESS_TOKEN</li>
                    <li>SQUARE_LOCATION_ID</li>
                    <li>SQUARE_ENVIRONMENT</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resend Email */}
      <Card>
        <CardHeader>
          <CardTitle>Resend Email</CardTitle>
          <CardDescription>
            Transactional email service for notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResendConfigured ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-green-600"
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
                    Resend Configured
                  </p>
                  <p className="text-xs text-green-700">
                    Sender: {process.env.RESEND_FROM_EMAIL}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Resend Not Configured
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Configure Resend in environment variables:
                  </p>
                  <ul className="text-xs text-amber-700 mt-1 ml-4 list-disc">
                    <li>RESEND_API_KEY</li>
                    <li>RESEND_FROM_EMAIL</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
