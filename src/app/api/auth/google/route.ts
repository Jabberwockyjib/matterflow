import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-drive/client";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";
import { createOAuthState } from "@/lib/auth/oauth-state";

/**
 * Initiate Google OAuth flow for Drive access
 * GET /api/auth/google
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl"));

    // Generate signed state parameter with HMAC and timestamp
    const state = createOAuthState({ returnUrl });

    // Get OAuth authorization URL
    const authUrl = getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google auth initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google authentication" },
      { status: 500 }
    );
  }
}
