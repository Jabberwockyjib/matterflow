# Square OAuth Self-Service Integration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow law firm admins to connect their Square account via OAuth from the Settings UI, replacing hardcoded environment variables.

**Architecture:** OAuth 2.0 flow mirroring existing Google integration. Tokens stored in `practice_settings` table (singleton). Backwards compatible with env var configuration.

**Tech Stack:** Square OAuth API, Next.js API routes, Supabase

---

## Context & Decisions

- **Single-tenant deployment** — One law firm per MatterFlow instance
- **Flexible OAuth app** — Client can use their own Square app credentials or defaults
- **Auto-select first location** — No location picker initially (add later if needed)
- **Manual webhook setup** — Show instructions after connecting, user enters signature key

---

## Database Schema

Add columns to `practice_settings`:

```sql
ALTER TABLE practice_settings
  ADD COLUMN square_access_token TEXT,
  ADD COLUMN square_refresh_token TEXT,
  ADD COLUMN square_merchant_id TEXT,
  ADD COLUMN square_location_id TEXT,
  ADD COLUMN square_environment TEXT DEFAULT 'sandbox',
  ADD COLUMN square_connected_at TIMESTAMPTZ,
  ADD COLUMN square_webhook_signature_key TEXT;

-- Optional: Custom Square app credentials (if client uses their own app)
ALTER TABLE practice_settings
  ADD COLUMN square_application_id TEXT,
  ADD COLUMN square_application_secret TEXT;

COMMENT ON COLUMN practice_settings.square_access_token IS 'OAuth access token for Square API calls (expires in 30 days)';
COMMENT ON COLUMN practice_settings.square_refresh_token IS 'OAuth refresh token to obtain new access tokens';
COMMENT ON COLUMN practice_settings.square_merchant_id IS 'Square merchant ID for the connected account';
COMMENT ON COLUMN practice_settings.square_location_id IS 'Square location ID for invoice operations';
```

---

## OAuth Flow

### Initiate: `/api/auth/square`

1. Check `practice_settings` for custom Square app credentials
2. Fall back to env vars (`SQUARE_APPLICATION_ID`, `SQUARE_APPLICATION_SECRET`)
3. Build OAuth URL:
   - Base: `https://connect.squareup.com/oauth2/authorize`
   - Scopes: `MERCHANT_PROFILE_READ PAYMENTS_WRITE INVOICES_WRITE INVOICES_READ`
   - State: base64-encoded JSON with return URL
4. Redirect to Square

### Callback: `/api/auth/square/callback`

1. Exchange authorization code for tokens via `POST /oauth2/token`
2. Fetch merchant profile via `/v2/merchants/me`
3. Fetch locations via `/v2/locations`, select first one
4. Store in `practice_settings`:
   - `square_access_token`
   - `square_refresh_token`
   - `square_merchant_id`
   - `square_location_id`
   - `square_environment` (from state or default)
   - `square_connected_at`
5. Revalidate `/settings`
6. Redirect to settings with `?square_connected=true`

### Token Refresh

Square access tokens expire after 30 days. Implement `refreshSquareTokenIfNeeded()`:

1. Check token age (store `square_token_expires_at` or calculate from `connected_at`)
2. If within 7 days of expiry, refresh proactively
3. Call `POST /oauth2/token` with `grant_type=refresh_token`
4. Update stored tokens
5. Return valid access token

---

## UI Changes

### Integrations Panel (`src/app/settings/integrations-panel.tsx`)

**Not Connected:**
- "Connect Square" button
- Optional expandable section for custom app credentials (Client ID, Secret)

**Connected:**
- Green status showing merchant name, location, environment
- "Disconnect" button
- Webhook setup instructions panel:
  1. Go to Square Developer Dashboard
  2. Select app → Webhooks
  3. Add endpoint URL: `{APP_URL}/api/webhooks/square`
  4. Select events: `payment.completed`, `invoice.payment_made`
  5. Copy signature key
- Input field to save webhook signature key

### New Component: `src/components/square-connect.tsx`

Client component handling:
- Connect button click → redirect to `/api/auth/square`
- Disconnect action → server action clears Square fields
- Webhook signature key save → server action updates field
- Custom app credentials form (optional)

---

## Square Client Changes

### `src/lib/square/client.ts`

**New function: `getSquareCredentials()`**
```typescript
async function getSquareCredentials(): Promise<SquareCredentials | null> {
  // 1. Try database first
  const settings = await getPracticeSettings();
  if (settings?.square_access_token && settings?.square_location_id) {
    const accessToken = await refreshSquareTokenIfNeeded(settings);
    return {
      accessToken,
      locationId: settings.square_location_id,
      environment: settings.square_environment || 'sandbox',
    };
  }

  // 2. Fall back to env vars (backwards compatibility)
  if (process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID) {
    return {
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      locationId: process.env.SQUARE_LOCATION_ID,
      environment: process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    };
  }

  return null;
}
```

**Updated functions (now async):**
- `createSquareClient()` → calls `getSquareCredentials()`
- `isSquareConfigured()` → checks both DB and env vars
- `getSquareLocationId()` → reads from credentials
- `getSquareWebhookSignatureKey()` → checks DB first, then env var

### `src/lib/square/oauth.ts` (new)

Helper functions:
- `getSquareAuthUrl(state: string): string`
- `exchangeCodeForTokens(code: string): Promise<TokenResponse>`
- `refreshSquareTokenIfNeeded(settings: PracticeSettings): Promise<string>`
- `revokeSquareToken(accessToken: string): Promise<void>` (optional)

---

## Error Handling

| Scenario | Action |
|----------|--------|
| OAuth denied | Redirect `?error=square_denied` |
| Token exchange fails | Redirect `?error=square_auth_failed`, log |
| No locations found | Redirect `?error=no_square_location` |
| Token refresh fails | Log, show "Reconnect" in UI |
| API call with expired token | Refresh, retry once, then error |

---

## Disconnect Flow

1. Server action `disconnectSquare()`
2. Clear all `square_*` columns in `practice_settings`
3. Revalidate `/settings`
4. Does NOT revoke at Square (user can do manually)

---

## Files to Create/Modify

**New files:**
- `supabase/migrations/YYYYMMDD_square_oauth.sql`
- `src/app/api/auth/square/route.ts`
- `src/app/api/auth/square/callback/route.ts`
- `src/lib/square/oauth.ts`
- `src/components/square-connect.tsx`

**Modified files:**
- `src/lib/square/client.ts`
- `src/app/settings/integrations-panel.tsx`
- `src/lib/data/actions.ts` (add `disconnectSquare`, `saveSquareWebhookKey`)
- `src/types/database.types.ts` (regenerate after migration)

---

## Testing

1. **Sandbox OAuth flow** — Connect with Square sandbox account
2. **Invoice sync** — Create invoice, verify it syncs to Square
3. **Token refresh** — Force refresh, verify new token works
4. **Disconnect/reconnect** — Verify clean state transitions
5. **Backwards compatibility** — Remove DB values, verify env vars still work

---

## Environment Variables

**Required for OAuth (if not using custom app per deployment):**
- `SQUARE_APPLICATION_ID` — Square OAuth app ID
- `SQUARE_APPLICATION_SECRET` — Square OAuth app secret

**Optional (backwards compatibility, overridden by DB):**
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_ENVIRONMENT`
- `SQUARE_WEBHOOK_SIGNATURE_KEY`
