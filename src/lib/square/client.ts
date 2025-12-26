/**
 * Square Client Initialization
 *
 * Sets up Square SDK client with proper authentication and configuration.
 */

import { SquareClient } from "square";

// Environment variables
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || "sandbox";
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

/**
 * Check if Square is configured with all required credentials
 */
export function isSquareConfigured(): boolean {
  return Boolean(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID);
}

/**
 * Create authenticated Square client
 *
 * @returns Square Client instance
 * @throws Error if Square credentials are not configured
 */
export function createSquareClient(): SquareClient {
  if (!SQUARE_ACCESS_TOKEN) {
    throw new Error(
      "Square access token not configured. Set SQUARE_ACCESS_TOKEN in environment variables.",
    );
  }

  const client = new SquareClient({
    token: SQUARE_ACCESS_TOKEN,
    environment: SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox",
  });

  return client;
}

/**
 * Get Square location ID
 *
 * @returns Location ID for Square operations
 * @throws Error if location ID not configured
 */
export function getSquareLocationId(): string {
  if (!SQUARE_LOCATION_ID) {
    throw new Error(
      "Square location ID not configured. Set SQUARE_LOCATION_ID in environment variables.",
    );
  }
  return SQUARE_LOCATION_ID;
}

/**
 * Get webhook signature key for validating Square webhooks
 */
export function getSquareWebhookSignatureKey(): string | undefined {
  return process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
}

/**
 * Export location ID as constant for convenience
 */
export const LOCATION_ID = SQUARE_LOCATION_ID || "";

/**
 * Check if running in production mode
 */
export function isProductionMode(): boolean {
  return SQUARE_ENVIRONMENT === "production";
}
