import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/sign-in", "/auth/sign-out", "/auth/inactive", "/auth/change-password", "/auth", "/"];
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Routes that require staff/admin role
const STAFF_ONLY_PATHS = [
  "/matters",
  "/tasks",
  "/time",
  "/billing",
  "/documents",
  "/admin",
  "/clients",
];

// Debug logging for auth troubleshooting (disabled by default, enable for debugging)
const DEBUG_AUTH = false;

type TokenPayload = {
  role?: string;
  app_metadata?: { role?: string };
};

const decodeRole = (cookieValue: string | undefined) => {
  if (!cookieValue) return null;
  try {
    // The cookie value might be base64-encoded JSON containing access_token
    // or it might be the JWT directly
    let jwt: string;

    // Try parsing as base64-encoded JSON first (SSR format)
    try {
      const decoded = Buffer.from(cookieValue, "base64").toString("utf8");
      const sessionData = JSON.parse(decoded);
      jwt = sessionData.access_token || cookieValue;
    } catch {
      // If that fails, assume it's the JWT directly
      jwt = cookieValue;
    }

    // Now decode the JWT payload
    const payloadPart = jwt.split(".")[1];
    if (!payloadPart) return null;

    const json = Buffer.from(payloadPart, "base64").toString("utf8");
    const data = JSON.parse(json) as TokenPayload;
    // Supabase nests role in app_metadata
    return data.role || data.app_metadata?.role || null;
  } catch {
    return null;
  }
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isProtected =
    !isPublic &&
    (pathname.startsWith("/matters") ||
      pathname.startsWith("/tasks") ||
      pathname.startsWith("/time") ||
      pathname.startsWith("/billing") ||
      pathname.startsWith("/documents") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/dashboard"));

  // Check for Supabase auth tokens
  // Cookies can be chunked: sb-{ref}-auth-token or sb-{ref}-auth-token.0, sb-{ref}-auth-token.1, etc.
  const allCookies = req.cookies.getAll();

  // Find auth token cookies and reassemble if chunked
  const authCookies = allCookies.filter(c =>
    c.name.startsWith("sb-") &&
    (c.name.endsWith("-auth-token") || c.name.includes("-auth-token."))
  );

  let accessToken: string | undefined;
  if (authCookies.length === 1 && authCookies[0].name.endsWith("-auth-token")) {
    // Single cookie (not chunked)
    accessToken = authCookies[0].value;
  } else if (authCookies.length > 0) {
    // Chunked cookies - sort by chunk number and reassemble
    const sorted = authCookies.sort((a, b) => {
      const aNum = parseInt(a.name.split(".").pop() || "0");
      const bNum = parseInt(b.name.split(".").pop() || "0");
      return aNum - bNum;
    });
    accessToken = sorted.map(c => c.value).join("");
  }

  const hasSessionCookie = Boolean(accessToken);

  // Debug logging for cookie presence/absence
  if (DEBUG_AUTH) {
    console.log("[middleware]", pathname, {
      isPublic,
      isProtected,
      hasAuthCookies: authCookies.length > 0,
      authCookieNames: authCookies.map((c) => c.name),
      hasSessionCookie,
      allCookies: allCookies.map((c) => c.name),
    });
  }

  if (isProtected && !hasSessionCookie) {
    if (DEBUG_AUTH) {
      console.log("[middleware] Redirecting to sign-in:", pathname, "→ /auth/sign-in");
    }
    const url = req.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Note: Inactive user and password change checks are handled in the layout
  // to avoid database queries in middleware on every request

  const role = decodeRole(accessToken);
  const isMutating = MUTATING_METHODS.includes(req.method.toUpperCase());

  // Block clients from accessing staff-only routes
  if (role === "client") {
    const isStaffOnly = STAFF_ONLY_PATHS.some((path) =>
      pathname === path || pathname.startsWith(`${path}/`)
    );

    if (isStaffOnly) {
      if (DEBUG_AUTH) {
        console.log("[middleware] Client blocked from staff route:", pathname, "→ /");
      }
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Block client mutations on protected routes
  if (isProtected && isMutating && role === "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const res = NextResponse.next();
  res.headers.set("x-matterflow", "mvp");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
