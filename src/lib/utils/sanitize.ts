/**
 * Security sanitization utilities
 */

/**
 * Escape special characters for PostgREST filter values.
 * Prevents SQL injection via .or() / .ilike() filter interpolation.
 *
 * PostgREST filter syntax uses commas, dots, and parens as delimiters,
 * so we must neutralize them in user input.
 */
export function escapePostgrestFilter(input: string): string {
  // Remove any characters that could break out of the filter value
  // PostgREST uses: . , ( ) for syntax; % _ for LIKE wildcards
  return input
    .replace(/\\/g, "\\\\") // escape backslashes first
    .replace(/%/g, "\\%") // escape LIKE wildcard
    .replace(/_/g, "\\_") // escape LIKE single-char wildcard
    .replace(/,/g, "") // strip commas (PostgREST OR delimiter)
    .replace(/\(/g, "") // strip open parens
    .replace(/\)/g, "") // strip close parens
    .replace(/\./g, "") // strip dots (PostgREST column separator)
    .replace(/'/g, "''"); // escape single quotes for SQL
}

/**
 * Sanitize a filename to prevent path traversal and injection attacks.
 *
 * Strips:
 * - Path separators (/ and \)
 * - Null bytes
 * - Control characters
 * - Leading dots (hidden files / directory traversal)
 * - Double dots (..)
 *
 * Returns a safe filename, or "unnamed" if nothing remains.
 */
export function sanitizeFilename(filename: string): string {
  let safe = filename
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters (0x00-0x1F and 0x7F)
    .replace(/[\x00-\x1f\x7f]/g, "")
    // Remove path separators
    .replace(/[/\\]/g, "")
    // Remove path traversal sequences
    .replace(/\.\./g, "")
    // Remove leading dots (hidden files)
    .replace(/^\.+/, "")
    // Trim whitespace
    .trim();

  // If nothing remains, use a default name
  if (!safe || safe.length === 0) {
    safe = "unnamed";
  }

  // Limit length to 255 characters (filesystem limit)
  if (safe.length > 255) {
    const ext = safe.lastIndexOf(".");
    if (ext > 0) {
      const extension = safe.slice(ext);
      safe = safe.slice(0, 255 - extension.length) + extension;
    } else {
      safe = safe.slice(0, 255);
    }
  }

  return safe;
}
