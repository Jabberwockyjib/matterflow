import crypto from "crypto";

/**
 * Create an HMAC-SHA256 signature.
 */
export function createHmacSignature(
  secret: string,
  data: string,
  encoding: "hex" | "base64" = "hex"
): string {
  return crypto.createHmac("sha256", secret).update(data).digest(encoding);
}

/**
 * Verify an HMAC-SHA256 signature using timing-safe comparison.
 * Returns false on any error (e.g., different buffer lengths).
 */
export function verifyHmacSignature(
  secret: string,
  data: string,
  signature: string,
  encoding: "hex" | "base64" = "hex"
): boolean {
  try {
    const expected = createHmacSignature(secret, data, encoding);
    return crypto.timingSafeEqual(
      Buffer.from(signature, encoding),
      Buffer.from(expected, encoding)
    );
  } catch {
    return false;
  }
}
