/**
 * Square OAuth Helper Module
 *
 * Handles Square OAuth 2.0 flow for self-service connection:
 * - Authorization URL generation
 * - Token exchange
 * - Token refresh
 * - Merchant and location info fetching
 */

import { supabaseAdmin } from "@/lib/supabase/server";

// OAuth Base URLs
export const SQUARE_AUTH_BASE = "https://connect.squareup.com";
export const SQUARE_SANDBOX_AUTH_BASE = "https://connect.squareupsandbox.com";

// Required OAuth scopes for MatterFlow integration
export const SQUARE_SCOPES = [
  "MERCHANT_PROFILE_READ",
  "PAYMENTS_READ",
  "PAYMENTS_WRITE",
  "INVOICES_READ",
  "INVOICES_WRITE",
] as const;

// Square API version header
const SQUARE_API_VERSION = "2024-01-18";

// ----- Interfaces -----

export interface SquareOAuthConfig {
  applicationId: string;
  applicationSecret: string;
  environment: "sandbox" | "production";
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  merchant_id: string;
  token_type: string;
}

export interface MerchantInfo {
  id: string;
  businessName: string;
}

export interface LocationInfo {
  id: string;
  name: string;
}

// ----- Helper Functions -----

/**
 * Get the base URL for Square OAuth based on environment
 */
function getAuthBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "sandbox" ? SQUARE_SANDBOX_AUTH_BASE : SQUARE_AUTH_BASE;
}

/**
 * Get the API base URL for Square API calls based on environment
 */
function getApiBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

// ----- Main Functions -----

/**
 * Get Square OAuth configuration
 *
 * Reads from practice_settings database first, falls back to environment variables.
 * This allows admins to configure Square credentials via UI without server restart.
 */
export async function getSquareOAuthConfig(): Promise<SquareOAuthConfig | null> {
  try {
    const supabase = supabaseAdmin();

    // Try to get credentials from practice_settings
    const { data: settings, error } = await supabase
      .from("practice_settings")
      .select(
        "square_application_id, square_application_secret, square_environment"
      )
      .limit(1)
      .maybeSingle();

    if (!error && settings?.square_application_id && settings?.square_application_secret) {
      return {
        applicationId: settings.square_application_id,
        applicationSecret: settings.square_application_secret,
        environment: (settings.square_environment as "sandbox" | "production") || "sandbox",
      };
    }
  } catch (e) {
    // Database not available, fall back to env vars
    console.warn("Could not read Square config from database, using env vars:", e);
  }

  // Fall back to environment variables
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const applicationSecret = process.env.SQUARE_APPLICATION_SECRET;
  const environment = (process.env.SQUARE_ENVIRONMENT as "sandbox" | "production") || "sandbox";

  if (!applicationId || !applicationSecret) {
    return null;
  }

  return {
    applicationId,
    applicationSecret,
    environment,
  };
}

/**
 * Build the Square OAuth authorization URL
 *
 * @param config - Square OAuth configuration
 * @param state - CSRF protection state parameter
 * @param redirectUri - Callback URL after authorization
 * @returns Full authorization URL to redirect user to
 */
export function getSquareAuthUrl(
  config: SquareOAuthConfig,
  state: string,
  redirectUri: string
): string {
  const baseUrl = getAuthBaseUrl(config.environment);
  const scopes = SQUARE_SCOPES.join(" ");

  const params = new URLSearchParams({
    client_id: config.applicationId,
    scope: scopes,
    session: "false",
    state: state,
    redirect_uri: redirectUri,
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 *
 * @param config - Square OAuth configuration
 * @param code - Authorization code from callback
 * @param redirectUri - Same redirect URI used in authorization request
 * @returns Token response with access_token, refresh_token, expires_at, merchant_id
 */
export async function exchangeCodeForTokens(
  config: SquareOAuthConfig,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const baseUrl = getAuthBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
    },
    body: JSON.stringify({
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to exchange code for tokens: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    merchant_id: data.merchant_id,
    token_type: data.token_type,
  };
}

/**
 * Refresh an expired Square access token
 *
 * @param config - Square OAuth configuration
 * @param refreshToken - Current refresh token
 * @returns New token response with fresh access_token and refresh_token
 */
export async function refreshSquareToken(
  config: SquareOAuthConfig,
  refreshToken: string
): Promise<TokenResponse> {
  const baseUrl = getAuthBaseUrl(config.environment);

  const response = await fetch(`${baseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
    },
    body: JSON.stringify({
      client_id: config.applicationId,
      client_secret: config.applicationSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to refresh Square token: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    merchant_id: data.merchant_id,
    token_type: data.token_type,
  };
}

/**
 * Fetch merchant information from Square
 *
 * @param accessToken - Valid Square access token
 * @param environment - Square environment (sandbox or production)
 * @returns Merchant ID and business name
 */
export async function fetchMerchantInfo(
  accessToken: string,
  environment: "sandbox" | "production"
): Promise<MerchantInfo> {
  const baseUrl = getApiBaseUrl(environment);

  const response = await fetch(`${baseUrl}/v2/merchants/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": SQUARE_API_VERSION,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch merchant info: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  const merchant = data.merchant;

  return {
    id: merchant.id,
    businessName: merchant.business_name || "Unknown Business",
  };
}

/**
 * Fetch the first location from Square account
 *
 * Square requires a location ID for many operations (invoices, payments).
 * This fetches the first available location for simple single-location setups.
 *
 * @param accessToken - Valid Square access token
 * @param environment - Square environment (sandbox or production)
 * @returns First location ID and name
 */
export async function fetchFirstLocation(
  accessToken: string,
  environment: "sandbox" | "production"
): Promise<LocationInfo> {
  const baseUrl = getApiBaseUrl(environment);

  const response = await fetch(`${baseUrl}/v2/locations`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": SQUARE_API_VERSION,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to fetch locations: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  const locations = data.locations;

  if (!locations || locations.length === 0) {
    throw new Error("No locations found in Square account");
  }

  const firstLocation = locations[0];

  return {
    id: firstLocation.id,
    name: firstLocation.name || "Default Location",
  };
}
