import { NextResponse } from "next/server";
import { getTokensFromCode } from "@/lib/google-drive/client";
import { supabaseAdmin } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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
        new URL("/?error=google_auth_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/?error=missing_code", request.url)
      );
    }

    // Parse state to get return URL
    let returnUrl = "/";
    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );
        returnUrl = stateData.returnUrl || "/";
      } catch {
        console.warn("Failed to parse state parameter");
      }
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      console.error("No refresh token received from Google");
      return NextResponse.redirect(
        new URL("/?error=no_refresh_token", request.url)
      );
    }

    // Get current user from session cookie
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("sb-access-token")?.value;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=not_authenticated", request.url)
      );
    }

    // Decode JWT to get user ID (simple decode, not verification)
    const payload = accessToken.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    const userId = decoded.sub;

    if (!userId) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=invalid_session", request.url)
      );
    }

    // Store refresh token in database
    const supabase = supabaseAdmin();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_connected_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error storing Google tokens:", updateError);
      return NextResponse.redirect(
        new URL("/?error=token_storage_failed", request.url)
      );
    }

    // Redirect to return URL with success
    return NextResponse.redirect(
      new URL(`${returnUrl}?google_connected=true`, request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/?error=auth_callback_failed", request.url)
    );
  }
}
