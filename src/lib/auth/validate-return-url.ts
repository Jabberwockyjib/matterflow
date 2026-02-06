/**
 * Sanitize a return URL to prevent open redirect attacks.
 * Only allows relative paths starting with "/".
 * Returns "/" for any invalid, external, or malicious URL.
 */
export function sanitizeReturnUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "/";

  // Must start with exactly one "/" (not "//")
  if (!url.startsWith("/") || url.startsWith("//")) return "/";

  // Block javascript:, data:, etc. (shouldn't reach here but defense-in-depth)
  if (/^[a-z]+:/i.test(url)) return "/";

  return url;
}
