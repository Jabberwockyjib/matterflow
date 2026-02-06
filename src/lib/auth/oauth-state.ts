import crypto from "crypto";

/**
 * OAuth state token utilities.
 *
 * State tokens include an HMAC signature and timestamp to prevent
 * CSRF attacks, state tampering, and replay attacks.
 */

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function getHmacSecret(): string {
  // Use CRON_SECRET or a dedicated secret — any stable server-side secret works
  const secret =
    process.env.OAUTH_STATE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("No secret available for OAuth state signing");
  }
  return secret;
}

/**
 * Create a signed, timestamped OAuth state parameter.
 */
export function createOAuthState(payload: Record<string, unknown>): string {
  const data = {
    ...payload,
    timestamp: Date.now(),
  };

  const dataString = JSON.stringify(data);
  const hmac = crypto
    .createHmac("sha256", getHmacSecret())
    .update(dataString)
    .digest("hex");

  const statePayload = {
    data: dataString,
    sig: hmac,
  };

  return Buffer.from(JSON.stringify(statePayload)).toString("base64");
}

/**
 * Verify and decode an OAuth state parameter.
 *
 * Rejects if:
 * - State cannot be decoded
 * - HMAC signature doesn't match (tampered)
 * - Timestamp is older than 10 minutes (replay / stale)
 *
 * Returns the decoded payload or null on failure.
 */
export function verifyOAuthState(
  state: string | null
): Record<string, unknown> | null {
  if (!state) return null;

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));

    if (!decoded.data || !decoded.sig) return null;

    // Verify HMAC signature
    const expectedHmac = crypto
      .createHmac("sha256", getHmacSecret())
      .update(decoded.data)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(decoded.sig, "hex"),
        Buffer.from(expectedHmac, "hex")
      )
    ) {
      console.warn("OAuth state: invalid HMAC signature");
      return null;
    }

    // Parse the data payload
    const payload = JSON.parse(decoded.data);

    // Verify timestamp (must be within 10 minutes)
    if (
      !payload.timestamp ||
      Date.now() - payload.timestamp > STATE_MAX_AGE_MS
    ) {
      console.warn("OAuth state: expired");
      return null;
    }

    return payload;
  } catch {
    console.warn("OAuth state: failed to decode");
    return null;
  }
}
