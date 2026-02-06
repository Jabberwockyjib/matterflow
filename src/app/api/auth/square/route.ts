/**
 * Square OAuth Initiate Route
 *
 * GET /api/auth/square
 *
 * Initiates the Square OAuth flow by redirecting to Square's authorization page.
 * The user will be prompted to authorize MatterFlow to access their Square account.
 *
 * Query Parameters:
 * - returnUrl: URL to redirect to after OAuth completes (default: "/settings")
 *
 * Flow:
 * 1. Get returnUrl from query params
 * 2. Load Square OAuth config from database/env
 * 3. Create HMAC-signed state parameter with returnUrl, timestamp, and environment
 * 4. Build authorization URL with required scopes
 * 5. Redirect user to Square for authorization
 */

import { NextResponse } from "next/server";
import { getSquareOAuthConfig, getSquareAuthUrl } from "@/lib/square/oauth";
import { sanitizeReturnUrl } from "@/lib/auth/validate-return-url";
import { createOAuthState } from "@/lib/auth/oauth-state";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const REDIRECT_URI = `${APP_URL}/api/auth/square/callback`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const returnUrl = sanitizeReturnUrl(searchParams.get("returnUrl")) || "/settings";

  // Get Square OAuth configuration
  const config = await getSquareOAuthConfig();

  if (!config) {
    // Square not configured - redirect back with error
    const errorUrl = new URL("/settings", APP_URL);
    errorUrl.searchParams.set("error", "square_not_configured");
    return NextResponse.redirect(errorUrl.toString());
  }

  // Create HMAC-signed state parameter for CSRF protection
  const state = createOAuthState({
    returnUrl,
    environment: config.environment,
  });

  // Build the Square authorization URL
  const authUrl = getSquareAuthUrl(config, state, REDIRECT_URI);

  // Redirect to Square authorization page
  return NextResponse.redirect(authUrl);
}
