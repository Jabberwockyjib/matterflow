import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth callback proxy route.
 *
 * Safari has issues reaching Kong directly on localhost:54322 when redirected
 * from Google. This route proxies the callback to GoTrue via the internal
 * Docker network, then redirects the browser to the resulting URL.
 *
 * Flow:
 * 1. Google redirects to localhost:3001/auth/callback (this route)
 * 2. We forward to GoTrue at api.matterflow.local/auth/v1/callback
 * 3. GoTrue exchanges the Google code and returns a redirect with Supabase code
 * 4. We redirect the browser to that URL (matterflow.local/?code=xxx)
 * 5. Client-side Supabase detects the code and completes the PKCE exchange
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Build the GoTrue callback URL with all the same params
  const gotrueUrl = new URL("/auth/v1/callback", process.env.NEXT_PUBLIC_SUPABASE_URL);
  searchParams.forEach((value, key) => {
    gotrueUrl.searchParams.set(key, value);
  });

  console.log("[OAuth Callback] Forwarding to GoTrue:", gotrueUrl.toString());

  try {
    // Forward to GoTrue
    const response = await fetch(gotrueUrl.toString(), {
      method: "GET",
      redirect: "manual", // Don't follow redirects
      headers: {
        "User-Agent": request.headers.get("user-agent") || "MatterFlow/1.0",
      },
    });

    console.log("[OAuth Callback] GoTrue response:", response.status);

    // GoTrue should return a redirect
    if (response.status === 302 || response.status === 303) {
      const location = response.headers.get("location");
      console.log("[OAuth Callback] GoTrue redirect location:", location);

      if (location) {
        // Redirect the browser to GoTrue's redirect location
        // This URL will contain ?code=xxx that the client-side Supabase will exchange
        return NextResponse.redirect(location);
      }
    }

    // Handle errors
    const body = await response.text();
    console.error("[OAuth Callback] GoTrue error:", response.status, body);

    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("error", "oauth_error");
    redirectUrl.searchParams.set("error_description", `Authentication failed: ${response.status}`);
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("[OAuth Callback] Proxy error:", err);
    const redirectUrl = new URL("/auth/sign-in", request.url);
    redirectUrl.searchParams.set("error", "proxy_error");
    return NextResponse.redirect(redirectUrl);
  }
}
