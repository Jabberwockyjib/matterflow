import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-drive/client";

/**
 * Initiate Google OAuth flow for Drive access
 * GET /api/auth/google
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get("returnUrl") || "/";

    // Generate state parameter for security (stores return URL)
    const state = Buffer.from(
      JSON.stringify({ returnUrl, timestamp: Date.now() })
    ).toString("base64");

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
