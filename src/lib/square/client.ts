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
 */
export async function getSquareCredentials(): Promise<SquareCredentials | null> {
  const supabase = supabaseAdmin();

  // Try database first
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
    // Check if token needs refresh (older than 25 days)
    const connectedAt = settings.square_connected_at ? new Date(settings.square_connected_at) : null;
    const daysSinceConnection = connectedAt ? (Date.now() - connectedAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

    let accessToken = settings.square_access_token;

    if (daysSinceConnection > 25 && settings.square_refresh_token) {
      try {
        const config = await getSquareOAuthConfig();
        if (config) {
          const newTokens = await refreshSquareToken(config, settings.square_refresh_token);
          accessToken = newTokens.access_token;

          // Update stored tokens
          const { data: settingsId } = await supabase.from("practice_settings").select("id").limit(1).single();
          if (settingsId) {
            await supabase.from("practice_settings").update({
              square_access_token: newTokens.access_token,
              square_refresh_token: newTokens.refresh_token,
              square_connected_at: new Date().toISOString(),
            }).eq("id", settingsId.id);
          }
        }
      } catch (error) {
        console.error("Failed to refresh Square token:", error);
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

export async function isSquareConfigured(): Promise<boolean> {
  const credentials = await getSquareCredentials();
  return credentials !== null;
}

export function isSquareConfiguredSync(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

export async function createSquareClient(): Promise<SquareClient> {
  const credentials = await getSquareCredentials();
  if (!credentials) {
    throw new Error("Square not configured. Connect Square in Settings or set environment variables.");
  }
  return new SquareClient({
    token: credentials.accessToken,
    environment: credentials.environment,
  });
}

export async function getSquareLocationId(): Promise<string> {
  const credentials = await getSquareCredentials();
  if (!credentials) {
    throw new Error("Square not configured.");
  }
  return credentials.locationId;
}

export async function getSquareWebhookSignatureKey(): Promise<string | undefined> {
  const supabase = supabaseAdmin();
  const { data: settings } = await supabase
    .from("practice_settings")
    .select("square_webhook_signature_key")
    .limit(1)
    .single();
  return settings?.square_webhook_signature_key || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
}

export async function isProductionMode(): Promise<boolean> {
  const credentials = await getSquareCredentials();
  return credentials?.environment === "production";
}

// Backwards compatibility
export const LOCATION_ID = process.env.SQUARE_LOCATION_ID || "";
