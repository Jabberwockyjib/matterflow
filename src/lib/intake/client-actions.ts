/**
 * Client-side functions for intake forms
 *
 * These use fetch to call API routes for file uploads
 */

type UploadResult =
  | { ok: true; data: { documentId: string; driveFileId: string; webViewLink: string } }
  | { ok: false; error: string };

/**
 * Upload a file from intake form to Google Drive via API route
 */
export async function uploadIntakeFile(
  matterId: string,
  file: File,
  _folderType: string = "intake"
): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append("matterId", matterId);
    formData.append("file", file);

    const response = await fetch("/api/intake/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return { ok: false, error: result.error || "Upload failed" };
    }

    return result;
  } catch (error) {
    console.error("Upload intake file error:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
