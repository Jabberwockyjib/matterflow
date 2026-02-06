import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getTokensFromCode, getGoogleUserEmail } from "@/lib/google-drive/client";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";

// Use the public app URL for redirects (handles reverse proxy/Docker scenarios)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL("/?error=google_auth_failed", APP_URL)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/?error=missing_code", APP_URL)
      );
    }

    // Parse state to get return URL
    let returnUrl = "/";
    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );
        returnUrl = sanitizeReturnUrl(stateData.returnUrl);
      } catch {
        console.warn("Failed to parse state parameter");
      }
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      console.error("No refresh token received from Google");
      return NextResponse.redirect(
        new URL("/?error=no_refresh_token", APP_URL)
      );
    }

    // Get current user from Supabase session
    const { session } = await getSessionWithProfile();

    if (!session) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=not_authenticated", APP_URL)
      );
    }

    // Store refresh token in practice_settings (practice-wide, not per-user)
    // This is a single-practice app, so one Google Drive connection serves everyone
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
        new URL("/?error=practice_settings_not_found", APP_URL)
      );
    }

    // Get the user's email from Google
    let googleEmail: string | null = null;
    if (tokens.access_token) {
      googleEmail = await getGoogleUserEmail(tokens.access_token);
    }

    const { error: updateError } = await supabase
      .from("practice_settings")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_connected_at: new Date().toISOString(),
        google_connected_email: googleEmail,
      })
      .eq("id", settings.id);

    if (updateError) {
      console.error("Error storing Google tokens:", updateError);
      return NextResponse.redirect(
        new URL("/?error=token_storage_failed", APP_URL)
      );
    }

    // Revalidate settings page to show updated connection status
    revalidatePath("/settings");

    // Redirect to return URL with success
    const separator = returnUrl.includes("?") ? "&" : "?";
    return NextResponse.redirect(
      new URL(`${returnUrl}${separator}google_connected=true`, APP_URL)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_callback_failed", APP_URL)
    );
  }
}
