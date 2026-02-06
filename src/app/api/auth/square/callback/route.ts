import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getSquareOAuthConfig,
  exchangeCodeForTokens,
  fetchFirstLocation,
} from "@/lib/square/oauth";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";

// Use the public app URL for redirects (handles reverse proxy/Docker scenarios)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

// Redirect URI must match what was used in the authorization request
const REDIRECT_URI = `${APP_URL}/api/auth/square/callback`;

/**
 * Handle Square OAuth callback
 * GET /api/auth/square/callback
 *
 * After user authorizes in Square, they are redirected here with:
 * - code: Authorization code to exchange for tokens
 * - state: Base64 encoded JSON with returnUrl and environment
 * - error: Present if user denied access
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error (user denied access)
    if (error) {
      console.error("Square OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=square_denied", APP_URL)
      );
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_code", APP_URL)
      );
    }

    // Parse state to get return URL and environment
    let returnUrl = "/settings";
    let stateEnvironment: "sandbox" | "production" | undefined;

    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );
        returnUrl = sanitizeReturnUrl(stateData.returnUrl) || "/settings";
        stateEnvironment = stateData.environment;
      } catch {
        console.warn("Failed to parse state parameter");
      }
    }

    // Verify user is authenticated
    const { session, profile } = await getSessionWithProfile();

    if (!session) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=not_authenticated", APP_URL)
      );
    }

    // Verify user is admin
    if (profile?.role !== "admin") {
      return NextResponse.redirect(
        new URL("/settings?error=admin_required", APP_URL)
      );
    }

    // Get Square OAuth configuration
    const config = await getSquareOAuthConfig();

    if (!config) {
      console.error("Square OAuth not configured");
      return NextResponse.redirect(
        new URL("/settings?error=square_not_configured", APP_URL)
      );
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(config, code, REDIRECT_URI);

    // Fetch first location for invoice operations
    const locationInfo = await fetchFirstLocation(
      tokens.access_token,
      config.environment
    );

    // Store tokens and connection info in practice_settings
    const supabase = supabaseAdmin();

    // Get the single practice_settings row (singleton pattern)
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("id")
      .limit(1)
      .single();

    if (!settings) {
      console.error("No practice_settings row found");
      return NextResponse.redirect(
        new URL("/settings?error=practice_settings_not_found", APP_URL)
      );
    }

    // Update practice_settings with Square connection info
    const { error: updateError } = await supabase
      .from("practice_settings")
      .update({
        square_access_token: tokens.access_token,
        square_refresh_token: tokens.refresh_token,
        square_merchant_id: tokens.merchant_id,
        square_location_id: locationInfo.id,
        square_location_name: locationInfo.name,
        square_environment: stateEnvironment || config.environment,
        square_connected_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (updateError) {
      console.error("Error storing Square tokens:", updateError);
      return NextResponse.redirect(
        new URL("/settings?error=token_storage_failed", APP_URL)
      );
    }

    // Revalidate settings page to show updated connection status
    revalidatePath("/settings");

    // Redirect to return URL with success
    const separator = returnUrl.includes("?") ? "&" : "?";
    return NextResponse.redirect(
      new URL(`${returnUrl}${separator}square_connected=true`, APP_URL)
    );
  } catch (error) {
    console.error("Square OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=auth_callback_failed", APP_URL)
    );
  }
}
