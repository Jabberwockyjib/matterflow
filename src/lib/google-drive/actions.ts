"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import { createMatterFolders, getMatterFolders } from "./folders";
import { uploadFileToDrive, deleteFileFromDrive, shareFileWithEmail } from "./documents";
import { summarizeDocument } from "@/lib/ai/document-summary";
import type { FolderType, DriveFolder } from "./types";
import type { Json } from "@/types/database.types";

/**
 * Server actions for document management
 * Integrates Google Drive with Supabase
 */

type ActionResult = { error?: string; ok?: boolean; data?: unknown };

/**
 * Get practice-wide Google refresh token from database
 * (Single practice app, so one Google Drive connection serves everyone)
 */
async function getPracticeRefreshToken(): Promise<string | null> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("practice_settings")
    .select("google_refresh_token")
    .limit(1)
    .maybeSingle();

  if (error || !data?.google_refresh_token) {
    return null;
  }

  return data.google_refresh_token;
}

/**
 * Initialize Google Drive folders for a matter
 */
export async function initializeMatterFolders(
  matterId: string
): Promise<ActionResult> {
  try {
    const { session, profile } = await getSessionWithProfile();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const supabase = supabaseAdmin();

    // Get matter details
    const { data: matter, error: matterError } = await supabase
      .from("matters")
      .select("title, client_id")
      .eq("id", matterId)
      .maybeSingle();

    if (matterError || !matter) {
      return { error: "Matter not found" };
    }

    if (!matter.client_id) {
      return { error: "Matter must have a client to create folders" };
    }

    // Get client name
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", matter.client_id)
      .maybeSingle();

    const clientName = clientProfile?.full_name || "Unknown Client";

    // Get practice Google refresh token
    const refreshToken = await getPracticeRefreshToken();
    if (!refreshToken) {
      return {
        error: "Google Drive not connected. Please connect your Google account first.",
      };
    }

    // Create folder structure
    const folders = await createMatterFolders(
      refreshToken,
      clientName,
      matter.title
    );

    // Store folder metadata in database (for quick access)
    await supabase.from("matter_folders").upsert({
      matter_id: matterId,
      client_folder_id: folders.clientFolder.id,
      matter_folder_id: folders.matterFolder.id,
      folder_structure: folders.subfolders as unknown as Json,
      created_at: new Date().toISOString(),
    });

    revalidatePath(`/matters/${matterId}`);

    return {
      ok: true,
      data: {
        clientFolderId: folders.clientFolder.id,
        matterFolderId: folders.matterFolder.id,
      },
    };
  } catch (error) {
    console.error("Initialize folders error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create folders",
    };
  }
}

/**
 * Upload document to matter folder
 */
export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  try {
    const { session } = await getSessionWithProfile();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const matterId = formData.get("matterId") as string;
    const folderType = formData.get("folderType") as FolderType;
    const file = formData.get("file") as File;
    const description = formData.get("description") as string | null;

    if (!matterId || !folderType || !file) {
      return { error: "Missing required fields" };
    }

    const supabase = supabaseAdmin();

    // Get matter folders
    const { data: matterFolders, error: folderError } = await supabase
      .from("matter_folders")
      .select("folder_structure")
      .eq("matter_id", matterId)
      .maybeSingle();

    if (folderError || !matterFolders) {
      return {
        error: "Matter folders not initialized. Please initialize folders first.",
      };
    }

    const folderStructure = matterFolders.folder_structure as unknown as Record<FolderType, DriveFolder>;
    const folderId = folderStructure[folderType]?.id;
    if (!folderId) {
      return { error: `Folder ${folderType} not found` };
    }

    // Get practice Google refresh token
    const refreshToken = await getPracticeRefreshToken();
    if (!refreshToken) {
      return { error: "Google Drive not connected" };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Drive
    const uploadResult = await uploadFileToDrive(
      refreshToken,
      {
        name: file.name,
        mimeType: file.type,
        buffer,
      },
      folderId,
      description || undefined
    );

    if (!uploadResult.success) {
      return { error: uploadResult.error || "Upload failed" };
    }

    // Store document metadata in Supabase
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        matter_id: matterId,
        title: file.name,
        drive_file_id: uploadResult.fileId!,
        folder_path: folderType,
        version: 1,
        status: "uploaded",
        metadata: {
          mimeType: file.type,
          size: file.size,
          webViewLink: uploadResult.webViewLink,
        },
      })
      .select("id")
      .single();

    if (docError) {
      console.error("Error storing document metadata:", docError);
      // Don't fail if metadata storage fails - file is already uploaded
    }

    // Process AI summary for supported file types (PDFs and text files)
    if (document?.id) {
      try {
        let textContent = "";

        // Extract text based on file type
        if (file.type === "application/pdf") {
          // Dynamic import to avoid bundling issues - pdf-parse v2 uses class-based API
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: buffer });
          const textResult = await parser.getText();
          textContent = textResult.text;
          await parser.destroy();
        } else if (
          file.type.includes("text") ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".md")
        ) {
          textContent = new TextDecoder().decode(buffer);
        }

        if (textContent && textContent.length > 0) {
          const aiResult = await summarizeDocument({
            filename: file.name,
            textContent,
          });

          // Update document record with AI summary
          await supabase
            .from("documents")
            .update({
              ai_document_type: aiResult.documentType,
              ai_summary: aiResult.summary,
              ai_suggested_folder: aiResult.suggestedFolder,
              ai_processed_at: new Date().toISOString(),
            })
            .eq("id", document.id);
        }
      } catch (aiError) {
        console.error("AI summary failed:", aiError);
        // Continue without AI summary - don't fail the upload
      }
    }

    revalidatePath(`/matters/${matterId}`);
    revalidatePath("/documents");

    return {
      ok: true,
      data: {
        documentId: document?.id,
        driveFileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
      },
    };
  } catch (error) {
    console.error("Upload document error:", error);
    return {
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string): Promise<ActionResult> {
  try {
    const { session } = await getSessionWithProfile();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const supabase = supabaseAdmin();

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("drive_file_id, matter_id")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      return { error: "Document not found" };
    }

    if (!document.drive_file_id) {
      return { error: "Document has no Drive file ID" };
    }

    // Get practice Google refresh token
    const refreshToken = await getPracticeRefreshToken();
    if (!refreshToken) {
      return { error: "Google Drive not connected" };
    }

    // Delete from Drive
    const deleteResult = await deleteFileFromDrive(
      refreshToken,
      document.drive_file_id
    );

    if (!deleteResult.success) {
      return { error: deleteResult.error || "Failed to delete from Drive" };
    }

    // Delete from database
    await supabase.from("documents").delete().eq("id", documentId);

    revalidatePath(`/matters/${document.matter_id}`);
    revalidatePath("/documents");

    return { ok: true };
  } catch (error) {
    console.error("Delete document error:", error);
    return {
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Get documents for a matter
 */
export async function getMatterDocuments(matterId: string): Promise<{
  data?: Array<{
    id: string;
    title: string;
    folderPath: string | null;
    version: number;
    status: string;
    metadata: unknown;
    createdAt: string;
  }>;
  error?: string;
}> {
  try {
    const { session } = await getSessionWithProfile();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("documents")
      .select("id, title, folder_path, version, status, metadata, created_at")
      .eq("matter_id", matterId)
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return {
      data: (data || []).map((doc) => ({
        id: doc.id,
        title: doc.title,
        folderPath: doc.folder_path,
        version: doc.version,
        status: doc.status,
        metadata: doc.metadata,
        createdAt: doc.created_at,
      })),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch documents",
    };
  }
}

/**
 * Share document with client
 */
export async function shareDocumentWithClient(
  documentId: string,
  clientEmail: string
): Promise<ActionResult> {
  try {
    const { session } = await getSessionWithProfile();
    if (!session) {
      return { error: "Unauthorized" };
    }

    const supabase = supabaseAdmin();

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("drive_file_id")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      return { error: "Document not found" };
    }

    if (!document.drive_file_id) {
      return { error: "Document has no Drive file ID" };
    }

    // Get practice Google refresh token
    const refreshToken = await getPracticeRefreshToken();
    if (!refreshToken) {
      return { error: "Google Drive not connected" };
    }

    // Share file
    const shareResult = await shareFileWithEmail(
      refreshToken,
      document.drive_file_id,
      clientEmail,
      "reader"
    );

    if (!shareResult.success) {
      return { error: shareResult.error || "Failed to share" };
    }

    return { ok: true };
  } catch (error) {
    console.error("Share document error:", error);
    return {
      error: error instanceof Error ? error.message : "Share failed",
    };
  }
}
