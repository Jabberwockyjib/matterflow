# Square OAuth Self-Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow law firm admins to connect their Square account via OAuth from the Settings UI, replacing hardcoded environment variables.

**Architecture:** OAuth 2.0 flow mirroring existing Google integration. Tokens stored in `practice_settings` table (singleton). Backwards compatible with env var configuration.

**Tech Stack:** Square OAuth API, Next.js 15 API routes, Supabase, TypeScript

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260128000001_square_oauth.sql`

**Step 1: Create the migration file**

```sql
-- Add Square OAuth fields to practice_settings
ALTER TABLE practice_settings
  ADD COLUMN IF NOT EXISTS square_access_token TEXT,
  ADD COLUMN IF NOT EXISTS square_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS square_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS square_location_id TEXT,
  ADD COLUMN IF NOT EXISTS square_location_name TEXT,
  ADD COLUMN IF NOT EXISTS square_environment TEXT DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS square_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS square_webhook_signature_key TEXT,
  ADD COLUMN IF NOT EXISTS square_application_id TEXT,
  ADD COLUMN IF NOT EXISTS square_application_secret TEXT;

COMMENT ON COLUMN practice_settings.square_access_token IS 'OAuth access token for Square API calls';
COMMENT ON COLUMN practice_settings.square_refresh_token IS 'OAuth refresh token to obtain new access tokens';
COMMENT ON COLUMN practice_settings.square_merchant_id IS 'Square merchant ID for the connected account';
COMMENT ON COLUMN practice_settings.square_location_id IS 'Square location ID for invoice operations';
COMMENT ON COLUMN practice_settings.square_location_name IS 'Human-readable location name for display';
COMMENT ON COLUMN practice_settings.square_environment IS 'sandbox or production';
COMMENT ON COLUMN practice_settings.square_connected_at IS 'When Square was connected via OAuth';
COMMENT ON COLUMN practice_settings.square_webhook_signature_key IS 'Webhook signature key for verification';
COMMENT ON COLUMN practice_settings.square_application_id IS 'Custom Square app client ID (optional)';
COMMENT ON COLUMN practice_settings.square_application_secret IS 'Custom Square app secret (optional)';
```

**Step 2: Apply migration locally**

Run:
```bash
docker exec -i matterflow-db psql -U postgres -d postgres < supabase/migrations/20260128000001_square_oauth.sql
```

Expected: No errors

**Step 3: Regenerate database types**

Run:
```bash
cd /Users/brian/dev/therapy/.worktrees/square-oauth
npx supabase gen types typescript --local > src/types/database.types.ts
```

Note: If local Supabase isn't running, manually add the types to `src/types/database.types.ts` in the `practice_settings` table definition.

**Step 4: Commit**

```bash
git add supabase/migrations/20260128000001_square_oauth.sql src/types/database.types.ts
git commit -m "feat: add Square OAuth columns to practice_settings"
```

---

## Task 2: Square OAuth Helper Module

**Files:**
- Create: `src/lib/square/oauth.ts`

**Step 1: Create the OAuth helper module**

```typescript
/**
 * Square OAuth Helpers
 *
 * Handles OAuth URL generation, token exchange, and token refresh.
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// Square OAuth endpoints
const SQUARE_AUTH_BASE = "https://connect.squareup.com";
const SQUARE_SANDBOX_AUTH_BASE = "https://connect.squareupsandbox.com";

// Required OAuth scopes
export const SQUARE_SCOPES = [
  "MERCHANT_PROFILE_READ",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
  "INVOICES_READ",
  "INVOICES_WRITE",
];

interface SquareOAuthConfig {
  applicationId: string;
  applicationSecret: string;
  environment: "sandbox" | "production";
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
  token_type: string;
}

interface MerchantInfo {
  id: string;
  businessName: string;
}

interface LocationInfo {
  id: string;
  name: string;
}

/**
 * Get Square OAuth configuration from practice_settings or env vars
 */
export async function getSquareOAuthConfig(): Promise<SquareOAuthConfig | null> {
  const supabase = supabaseAdmin();

  // Check practice_settings for custom app credentials
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("square_application_id, square_application_secret, square_environment")
    .limit(1)
    .single();

  const applicationId = settings?.square_application_id || process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = settings?.square_application_secret || process.env.SQUARE_APPLICATION_SECRET;
  const environment = (settings?.square_environment || process.env.SQUARE_ENVIRONMENT || "sandbox") as "sandbox" | "production";

  if (!applicationId || !applicationSecret) {
    return null;
  }

  return { applicationId, applicationSecret, environment };
}

/**
 * Generate Square OAuth authorization URL
 */
export function getSquareAuthUrl(
  config: SquareOAuthConfig,
  state: string,
  redirectUri: string
): string {
  const baseUrl = config.environment === "production"
    ? SQUARE_AUTH_BASE
    : SQUARE_SANDBOX_AUTH_BASE;

  const params = new URLSearchParams({
    client_id: config.applicationId,
    response_type: "code",
    scope: SQUARE_SCOPES.join(" "),
    state,
    redirect_uri: redirectUri,
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: SquareOAuthConfig,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const baseUrl = config.environment === "production"
    ? SQUARE_AUTH_BASE
    : SQUARE_SANDBOX_AUTH_BASE;

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Square token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshSquareToken(
  config: SquareOAuthConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const baseUrl = config.environment === "production"
    ? SQUARE_AUTH_BASE
    : SQUARE_SANDBOX_AUTH_BASE;

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": "2024-01-18",
    },
    body: JSON.stringify({
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Square token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Fetch merchant info from Square API
 */
export async function fetchMerchantInfo(
  accessToken: string,
  environment: "sandbox" | "production"
): Promise<MerchantInfo> {
  const baseUrl = environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  const response = await fetch(`${baseUrl}/v2/merchants/me`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Square-Version": "2024-01-18",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch merchant info");
  }

  const data = await response.json();
  return {
    id: data.merchant.id,
    businessName: data.merchant.business_name || "Unknown Business",
  };
}

/**
 * Fetch locations from Square API (returns first location)
 */
export async function fetchFirstLocation(
  accessToken: string,
  environment: "sandbox" | "production"
): Promise<LocationInfo> {
  const baseUrl = environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

  const response = await fetch(`${baseUrl}/v2/locations`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Square-Version": "2024-01-18",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }

  const data = await response.json();
  const locations = data.locations || [];

  if (locations.length === 0) {
    throw new Error("No Square locations found");
  }

  const firstLocation = locations[0];
  return {
    id: firstLocation.id,
    name: firstLocation.name || "Main Location",
  };
}
```

**Step 2: Verify types**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/square/oauth.ts
git commit -m "feat: add Square OAuth helper module"
```

---

## Task 3: OAuth Initiate Route

**Files:**
- Create: `src/app/api/auth/square/route.ts`

**Step 1: Create the initiate route**

```typescript
import { NextResponse } from "next/server";
import { getSquareOAuthConfig, getSquareAuthUrl } from "@/lib/square/oauth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const REDIRECT_URI = `${APP_URL}/api/auth/square/callback`;

/**
 * Initiate Square OAuth flow
 * GET /api/auth/square
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get("returnUrl") || "/settings";

    // Get OAuth configuration
    const config = await getSquareOAuthConfig();
    if (!config) {
      return NextResponse.redirect(
        new URL("/settings?error=square_not_configured", APP_URL)
      );
    }

    // Generate state parameter for security
    const state = Buffer.from(
      JSON.stringify({
        returnUrl,
        timestamp: Date.now(),
        environment: config.environment,
      })
    ).toString("base64");

    // Get OAuth authorization URL
    const authUrl = getSquareAuthUrl(config, state, REDIRECT_URI);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Square auth initiation error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=square_auth_failed", APP_URL)
    );
  }
}
```

**Step 2: Verify build**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/auth/square/route.ts
git commit -m "feat: add Square OAuth initiate route"
```

---

## Task 4: OAuth Callback Route

**Files:**
- Create: `src/app/api/auth/square/callback/route.ts`

**Step 1: Create the callback route**

```typescript
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionWithProfile } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  getSquareOAuthConfig,
  exchangeCodeForTokens,
  fetchMerchantInfo,
  fetchFirstLocation,
} from "@/lib/square/oauth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const REDIRECT_URI = `${APP_URL}/api/auth/square/callback`;

/**
 * Handle Square OAuth callback
 * GET /api/auth/square/callback
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth error
    if (error) {
      console.error("Square OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings?error=square_denied", APP_URL)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_code", APP_URL)
      );
    }

    // Parse state to get return URL and environment
    let returnUrl = "/settings";
    let environment: "sandbox" | "production" = "sandbox";
    if (state) {
      try {
        const stateData = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );
        returnUrl = stateData.returnUrl || "/settings";
        environment = stateData.environment || "sandbox";
      } catch {
        console.warn("Failed to parse state parameter");
      }
    }

    // Verify user is authenticated and is admin
    const { session, profile } = await getSessionWithProfile();
    if (!session) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=not_authenticated", APP_URL)
      );
    }
    if (profile?.role !== "admin") {
      return NextResponse.redirect(
        new URL("/settings?error=admin_required", APP_URL)
      );
    }

    // Get OAuth configuration
    const config = await getSquareOAuthConfig();
    if (!config) {
      return NextResponse.redirect(
        new URL("/settings?error=square_not_configured", APP_URL)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(config, code, REDIRECT_URI);

    // Fetch merchant and location info
    const merchantInfo = await fetchMerchantInfo(tokens.access_token, config.environment);
    const locationInfo = await fetchFirstLocation(tokens.access_token, config.environment);

    // Store in practice_settings
    const supabase = supabaseAdmin();
    const { data: settings } = await supabase
      .from("practice_settings")
      .select("id")
      .limit(1)
      .single();

    if (!settings) {
      return NextResponse.redirect(
        new URL("/settings?error=practice_settings_not_found", APP_URL)
      );
    }

    const { error: updateError } = await supabase
      .from("practice_settings")
      .update({
        square_access_token: tokens.access_token,
        square_refresh_token: tokens.refresh_token,
        square_merchant_id: tokens.merchant_id,
        square_location_id: locationInfo.id,
        square_location_name: locationInfo.name,
        square_environment: config.environment,
        square_connected_at: new Date().toISOString(),
      })
      .eq("id", settings.id);

    if (updateError) {
      console.error("Error storing Square tokens:", updateError);
      return NextResponse.redirect(
        new URL("/settings?error=token_storage_failed", APP_URL)
      );
    }

    // Revalidate settings page
    revalidatePath("/settings");

    // Redirect with success
    const separator = returnUrl.includes("?") ? "&" : "?";
    return NextResponse.redirect(
      new URL(`${returnUrl}${separator}square_connected=true`, APP_URL)
    );
  } catch (error) {
    console.error("Square OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?error=square_auth_failed", APP_URL)
    );
  }
}
```

**Step 2: Verify build**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/auth/square/callback/route.ts
git commit -m "feat: add Square OAuth callback route"
```

---

## Task 5: Update Square Client for Database Credentials

**Files:**
- Modify: `src/lib/square/client.ts`

**Step 1: Update client to read from database with env fallback**

Replace the entire contents of `src/lib/square/client.ts`:

```typescript
/**
 * Square Client Initialization
 *
 * Sets up Square SDK client with credentials from database or environment.
 * Database credentials take priority, with env vars as fallback.
 */

import { SquareClient } from "square";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSquareOAuthConfig, refreshSquareToken } from "./oauth";

export interface SquareCredentials {
  accessToken: string;
  locationId: string;
  environment: "sandbox" | "production";
  merchantId?: string;
}

/**
 * Get Square credentials from database or environment
 * Database takes priority for OAuth-connected accounts
 */
export async function getSquareCredentials(): Promise<SquareCredentials | null> {
  const supabase = supabaseAdmin();

  // Try database first (OAuth connection)
  const { data: settings } = await supabase
    .from("practice_settings")
    .select(`
      square_access_token,
      square_refresh_token,
      square_location_id,
      square_merchant_id,
      square_environment,
      square_connected_at
    `)
    .limit(1)
    .single();

  if (settings?.square_access_token && settings?.square_location_id) {
    // Check if token needs refresh (connected more than 25 days ago)
    const connectedAt = settings.square_connected_at
      ? new Date(settings.square_connected_at)
      : null;
    const daysSinceConnection = connectedAt
      ? (Date.now() - connectedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    let accessToken = settings.square_access_token;

    // Refresh if token is older than 25 days (Square tokens expire in 30)
    if (daysSinceConnection > 25 && settings.square_refresh_token) {
      try {
        const config = await getSquareOAuthConfig();
        if (config) {
          const newTokens = await refreshSquareToken(config, settings.square_refresh_token);
          accessToken = newTokens.access_token;

          // Update stored tokens
          await supabase
            .from("practice_settings")
            .update({
              square_access_token: newTokens.access_token,
              square_refresh_token: newTokens.refresh_token,
              square_connected_at: new Date().toISOString(),
            })
            .eq("id", (await supabase.from("practice_settings").select("id").limit(1).single()).data?.id);
        }
      } catch (error) {
        console.error("Failed to refresh Square token:", error);
        // Continue with existing token, it might still work
      }
    }

    return {
      accessToken,
      locationId: settings.square_location_id,
      environment: (settings.square_environment as "sandbox" | "production") || "sandbox",
      merchantId: settings.square_merchant_id || undefined,
    };
  }

  // Fall back to environment variables
  const envAccessToken = process.env.SQUARE_ACCESS_TOKEN;
  const envLocationId = process.env.SQUARE_LOCATION_ID;
  const envEnvironment = process.env.SQUARE_ENVIRONMENT;

  if (envAccessToken && envLocationId) {
    return {
      accessToken: envAccessToken,
      locationId: envLocationId,
      environment: envEnvironment === "production" ? "production" : "sandbox",
    };
  }

  return null;
}

/**
 * Check if Square is configured (either via OAuth or env vars)
 */
export async function isSquareConfigured(): Promise<boolean> {
  const credentials = await getSquareCredentials();
  return credentials !== null;
}

/**
 * Check if Square is configured (sync version for quick checks)
 * Only checks env vars, not database
 */
export function isSquareConfiguredSync(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

/**
 * Create authenticated Square client
 */
export async function createSquareClient(): Promise<SquareClient> {
  const credentials = await getSquareCredentials();

  if (!credentials) {
    throw new Error(
      "Square not configured. Connect Square in Settings or set environment variables.",
    );
  }

  return new SquareClient({
    token: credentials.accessToken,
    environment: credentials.environment,
  });
}

/**
 * Get Square location ID
 */
export async function getSquareLocationId(): Promise<string> {
  const credentials = await getSquareCredentials();

  if (!credentials) {
    throw new Error(
      "Square not configured. Connect Square in Settings or set environment variables.",
    );
  }

  return credentials.locationId;
}

/**
 * Get webhook signature key (from database or env)
 */
export async function getSquareWebhookSignatureKey(): Promise<string | undefined> {
  const supabase = supabaseAdmin();
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("square_webhook_signature_key")
    .limit(1)
    .single();

  return settings?.square_webhook_signature_key || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
}

/**
 * Check if running in production mode
 */
export async function isProductionMode(): Promise<boolean> {
  const credentials = await getSquareCredentials();
  return credentials?.environment === "production";
}

// Backwards compatibility exports (sync versions using env vars only)
export const LOCATION_ID = process.env.SQUARE_LOCATION_ID || "";
```

**Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: Errors about callers expecting sync functions. We'll fix those next.

**Step 3: Commit**

```bash
git add src/lib/square/client.ts
git commit -m "feat: update Square client to read credentials from database"
```

---

## Task 6: Update Square Actions for Async Client

**Files:**
- Modify: `src/lib/square/actions.ts`
- Modify: `src/lib/square/invoices.ts`

**Step 1: Check invoices.ts for createSquareClient usage**

Read `src/lib/square/invoices.ts` and update any calls to `createSquareClient()` to be awaited.

The key changes needed:
- `createSquareClient()` is now async, so add `await`
- `getSquareLocationId()` is now async, so add `await`
- `isSquareConfigured()` is now async, so add `await`

**Step 2: Update actions.ts**

In `src/lib/square/actions.ts`, update the `syncInvoiceToSquare` function:

Change line ~37:
```typescript
// Before
if (!isSquareConfigured()) {

// After
if (!(await isSquareConfigured())) {
```

**Step 3: Update invoices.ts**

Update all function signatures and calls that use the client functions to be async.

**Step 4: Run typecheck and fix remaining issues**

Run:
```bash
pnpm typecheck
```

Fix any remaining type errors by adding `await` to async function calls.

**Step 5: Commit**

```bash
git add src/lib/square/actions.ts src/lib/square/invoices.ts
git commit -m "fix: update Square functions for async client"
```

---

## Task 7: Server Actions for Square Connection Management

**Files:**
- Modify: `src/lib/data/actions.ts`

**Step 1: Add disconnect and webhook key actions**

Add these functions to `src/lib/data/actions.ts` near the `disconnectGoogle` function:

```typescript
/**
 * Disconnect Square OAuth
 */
export async function disconnectSquare(): Promise<{ ok: true } | { error: string }> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { error: auth.error };

  if (!supabaseEnvReady()) {
    return { error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("id")
    .limit(1)
    .single();

  if (!settings) {
    return { error: "Practice settings not found" };
  }

  const { error } = await supabase
    .from("practice_settings")
    .update({
      square_access_token: null,
      square_refresh_token: null,
      square_merchant_id: null,
      square_location_id: null,
      square_location_name: null,
      square_connected_at: null,
      // Keep webhook key and custom app credentials
    })
    .eq("id", settings.id);

  if (error) {
    console.error("Error disconnecting Square:", error);
    return { error: "Failed to disconnect Square" };
  }

  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Save Square webhook signature key
 */
export async function saveSquareWebhookKey(
  signatureKey: string
): Promise<{ ok: true } | { error: string }> {
  const auth = await ensureStaffOrAdmin();
  if ("error" in auth) return { error: auth.error };

  if (!supabaseEnvReady()) {
    return { error: "Service unavailable" };
  }

  const supabase = supabaseAdmin();
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("id")
    .limit(1)
    .single();

  if (!settings) {
    return { error: "Practice settings not found" };
  }

  const { error } = await supabase
    .from("practice_settings")
    .update({
      square_webhook_signature_key: signatureKey,
    })
    .eq("id", settings.id);

  if (error) {
    console.error("Error saving webhook key:", error);
    return { error: "Failed to save webhook key" };
  }

  revalidatePath("/settings");
  return { ok: true };
}
```

**Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: add Square disconnect and webhook key server actions"
```

---

## Task 8: Square Connect UI Component

**Files:**
- Create: `src/components/square-connect.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { disconnectSquare, saveSquareWebhookKey } from "@/lib/data/actions";

interface SquareConnectProps {
  isConnected: boolean;
  merchantName?: string;
  locationName?: string;
  environment?: string;
  connectedAt?: string;
  webhookSignatureKey?: string;
  returnUrl?: string;
}

export function SquareConnect({
  isConnected,
  merchantName,
  locationName,
  environment,
  connectedAt,
  webhookSignatureKey,
  returnUrl = "/settings",
}: SquareConnectProps) {
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [webhookKey, setWebhookKey] = useState(webhookSignatureKey || "");
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    // Check for connection success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("square_connected") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    setLoading(true);
    const encodedReturnUrl = encodeURIComponent(returnUrl);
    window.location.href = `/api/auth/square?returnUrl=${encodedReturnUrl}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Square? This will disable payment processing.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const result = await disconnectSquare();
      if ("error" in result) {
        alert(result.error);
      } else {
        window.location.reload();
      }
    } catch {
      alert("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveWebhookKey = async () => {
    if (!webhookKey.trim()) return;
    setSavingKey(true);
    try {
      const result = await saveSquareWebhookKey(webhookKey.trim());
      if ("error" in result) {
        alert(result.error);
      } else {
        alert("Webhook signature key saved");
      }
    } catch {
      alert("Failed to save");
    } finally {
      setSavingKey(false);
    }
  };

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "";

  if (isConnected) {
    return (
      <div className="space-y-4">
        {/* Connected Status */}
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Square Connected
              </p>
              {merchantName && (
                <p className="text-xs text-green-700">Merchant: {merchantName}</p>
              )}
              {locationName && (
                <p className="text-xs text-green-700">Location: {locationName}</p>
              )}
              <p className="text-xs text-green-700">
                Environment: {environment === "production" ? "Production" : "Sandbox"}
              </p>
              {connectedAt && (
                <p className="text-xs text-green-700">
                  Connected {new Date(connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={loading}
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                {loading ? "Reconnecting..." : "Reconnect"}
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Webhook Setup */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <h4 className="text-sm font-medium text-amber-900 mb-2">
            Webhook Setup Required
          </h4>
          <ol className="text-xs text-amber-700 space-y-1 mb-3 list-decimal list-inside">
            <li>Go to Square Developer Dashboard</li>
            <li>Select your app → Webhooks</li>
            <li>Add endpoint: <code className="bg-amber-100 px-1 rounded">{appUrl}/api/webhooks/square</code></li>
            <li>Select events: <code className="bg-amber-100 px-1 rounded">invoice.payment_made</code></li>
            <li>Copy the signature key and paste below</li>
          </ol>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="webhook-key" className="sr-only">Webhook Signature Key</Label>
              <Input
                id="webhook-key"
                type="password"
                placeholder="Webhook signature key"
                value={webhookKey}
                onChange={(e) => setWebhookKey(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleSaveWebhookKey}
              disabled={savingKey || !webhookKey.trim()}
              size="sm"
            >
              {savingKey ? "Saving..." : "Save Key"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-4 bg-amber-50 border-amber-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 mb-2">
            Square Not Connected
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Connect Square to enable payment processing for invoices.
          </p>
          <Button
            onClick={handleConnect}
            disabled={loading}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? "Connecting..." : "Connect Square"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

**Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/components/square-connect.tsx
git commit -m "feat: add SquareConnect UI component"
```

---

## Task 9: Update Integrations Panel

**Files:**
- Modify: `src/app/settings/integrations-panel.tsx`

**Step 1: Update to use SquareConnect component**

Replace the Square section (lines ~106-179) with:

```typescript
import { SquareConnect } from "@/components/square-connect";

// ... in the component, after fetching Google settings:

// Check Square connection from database
const { data: squareSettings } = await supabase
  .from("practice_settings")
  .select(`
    square_access_token,
    square_merchant_id,
    square_location_id,
    square_location_name,
    square_environment,
    square_connected_at,
    square_webhook_signature_key
  `)
  .limit(1)
  .maybeSingle();

const isSquareConnected = Boolean(squareSettings?.square_access_token);

// ... in the JSX, replace the Square Card with:

{/* Square Payments */}
<Card>
  <CardHeader>
    <CardTitle>Square Payments</CardTitle>
    <CardDescription>
      Payment processing for invoices via Square
    </CardDescription>
  </CardHeader>
  <CardContent>
    <SquareConnect
      isConnected={isSquareConnected}
      locationName={squareSettings?.square_location_name || undefined}
      environment={squareSettings?.square_environment || undefined}
      connectedAt={squareSettings?.square_connected_at || undefined}
      webhookSignatureKey={squareSettings?.square_webhook_signature_key || undefined}
      returnUrl="/settings?tab=integrations"
    />
  </CardContent>
</Card>
```

**Step 2: Run typecheck and build**

Run:
```bash
pnpm typecheck
pnpm build
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/settings/integrations-panel.tsx
git commit -m "feat: integrate SquareConnect into settings panel"
```

---

## Task 10: Update Index Exports

**Files:**
- Modify: `src/lib/square/index.ts`

**Step 1: Add OAuth exports**

Add to `src/lib/square/index.ts`:

```typescript
// OAuth
export {
  getSquareOAuthConfig,
  getSquareAuthUrl,
  exchangeCodeForTokens,
  refreshSquareToken,
  SQUARE_SCOPES,
} from "./oauth";

// Update client exports to include new functions
export {
  createSquareClient,
  getSquareLocationId,
  isSquareConfigured,
  isSquareConfiguredSync,
  getSquareWebhookSignatureKey,
  isProductionMode,
  getSquareCredentials,
} from "./client";
```

**Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/square/index.ts
git commit -m "feat: export Square OAuth functions"
```

---

## Task 11: Final Verification

**Step 1: Run full test suite**

Run:
```bash
pnpm test --run
```

Expected: All tests pass (some may need updates for async functions)

**Step 2: Run typecheck**

Run:
```bash
pnpm typecheck
```

Expected: No errors

**Step 3: Run build**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 4: Manual test checklist**

- [ ] Settings page loads without errors
- [ ] "Connect Square" button appears when not connected
- [ ] Clicking Connect redirects to Square OAuth (need sandbox credentials)
- [ ] After OAuth, connected state shows with merchant/location info
- [ ] Webhook setup instructions display
- [ ] Webhook key can be saved
- [ ] Disconnect clears connection
- [ ] Env var fallback still works when DB fields are empty

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Square OAuth self-service integration"
```

---

## Summary

**Files created:**
- `supabase/migrations/20260128000001_square_oauth.sql`
- `src/lib/square/oauth.ts`
- `src/app/api/auth/square/route.ts`
- `src/app/api/auth/square/callback/route.ts`
- `src/components/square-connect.tsx`

**Files modified:**
- `src/types/database.types.ts` (regenerated)
- `src/lib/square/client.ts`
- `src/lib/square/actions.ts`
- `src/lib/square/invoices.ts`
- `src/lib/square/index.ts`
- `src/lib/data/actions.ts`
- `src/app/settings/integrations-panel.tsx`

**Environment variables needed:**
- `SQUARE_APPLICATION_ID` - Square OAuth app ID
- `SQUARE_APPLICATION_SECRET` - Square OAuth app secret

**Backwards compatibility:**
- Existing `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` env vars continue to work
- Database OAuth connection takes priority when present
