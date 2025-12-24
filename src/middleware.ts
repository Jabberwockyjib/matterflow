import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/auth/sign-in", "/auth", "/"];
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

// Debug logging for auth troubleshooting (only in development)
const DEBUG_AUTH = process.env.NODE_ENV === "development";

type TokenPayload = {
  role?: string;
};

const decodeRole = (token: string | undefined) => {
  if (!token) return null;
  try {
    const payloadPart = token.split(".")[1];
    const json = Buffer.from(payloadPart, "base64").toString("utf8");
    const data = JSON.parse(json) as TokenPayload & {
      app_metadata?: { role?: string };
    };
    // Supabase sometimes nests role in app_metadata; flatten if needed
    return data.role || data.app_metadata?.role || null;
  } catch {
    return null;
  }
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isProtected =
    !isPublic &&
    (pathname.startsWith("/matters") ||
      pathname.startsWith("/tasks") ||
      pathname.startsWith("/time") ||
      pathname.startsWith("/billing"));

  // Check for Supabase auth tokens (new auth-helpers use pattern: sb-{project-ref}-auth-token)
  const allCookies = req.cookies.getAll();
  const authCookie = allCookies.find(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  const accessToken = authCookie?.value;
  const hasSessionCookie = Boolean(accessToken);

  // Debug logging for cookie presence/absence
  if (DEBUG_AUTH) {
    console.log("[middleware]", pathname, {
      isPublic,
      isProtected,
      hasAuthCookie: Boolean(authCookie),
      authCookieName: authCookie?.name,
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

  const role = decodeRole(accessToken);
  const isMutating = MUTATING_METHODS.includes(req.method.toUpperCase());
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
