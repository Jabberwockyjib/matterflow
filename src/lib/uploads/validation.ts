/**
 * Upload file validation utilities
 */

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "csv",
  "rtf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "heic",
  "svg",
  "tiff",
  "tif",
  "bmp",
]);

const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/",
  "image/",
  "application/rtf",
  "application/csv",
];

/**
 * Validate an uploaded file for type and size restrictions.
 * Returns an error string if invalid, null if valid.
 */
export function validateUploadedFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
  }

  if (file.size === 0) {
    return "File is empty.";
  }

  // Check file extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return `File type ".${ext || "unknown"}" is not allowed. Accepted types: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`;
  }

  // Check MIME type
  if (file.type) {
    const isAllowedMime = ALLOWED_MIME_PREFIXES.some((prefix) =>
      file.type.startsWith(prefix)
    );
    if (!isAllowedMime) {
      return `MIME type "${file.type}" is not allowed.`;
    }
  }

  return null;
}

/**
 * Validate that the request content type is multipart/form-data.
 */
export function validateContentType(request: Request): string | null {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return "Content-Type must be multipart/form-data";
  }
  return null;
}
