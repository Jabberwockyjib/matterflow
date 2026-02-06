/**
 * API route for uploading files during intake form submission
 *
 * Handles FormData file uploads and stores in Google Drive
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import { uploadFileToDrive } from "@/lib/google-drive/documents";
import { createMatterFolders } from "@/lib/google-drive/folders";
import { sanitizeFilename } from "@/lib/utils/sanitize";
import { validateUploadedFile } from "@/lib/uploads/validation";
import { uploadLimiter, getRateLimitKey } from "@/lib/rate-limit";
import type { DriveFolder, FolderType } from "@/lib/google-drive/types";
import type { Json } from "@/types/database.types";

/**
 * Get practice-wide Google refresh token from database
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
 * Ensure matter has Google Drive folders initialized
 */
async function ensureMatterFolders(matterId: string): Promise<{
  folderId: string | null;
  error?: string;
}> {
  const supabase = supabaseAdmin();

  // Check if folders exist
  const { data: existing } = await supabase
    .from("matter_folders")
    .select("folder_structure, matter_folder_id")
    .eq("matter_id", matterId)
    .maybeSingle();

  if (existing?.folder_structure) {
    const folderStructure = existing.folder_structure as unknown as Record<string, DriveFolder>;
    // Look for intake folder with either naming convention
    const intakeFolder =
      folderStructure["00 Intake"] ||
      folderStructure["00_Intake"] ||
      folderStructure["intake"];
    return { folderId: intakeFolder?.id || existing.matter_folder_id || null };
  }

  // Need to create folders
  const refreshToken = await getPracticeRefreshToken();
  if (!refreshToken) {
    return { folderId: null, error: "Google Drive not connected" };
  }

  // Get matter details
  const { data: matter } = await supabase
    .from("matters")
    .select("title, client_id")
    .eq("id", matterId)
    .maybeSingle();

  if (!matter) {
    return { folderId: null, error: "Matter not found" };
  }

  // Get client name
  let clientName = "Unknown Client";
  if (matter.client_id) {
    const { data: clientProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", matter.client_id)
      .maybeSingle();
    clientName = clientProfile?.full_name || "Unknown Client";
  }

  try {
    const folders = await createMatterFolders(
      refreshToken,
      clientName,
      matter.title
    );

    // Store folder metadata
    await supabase.from("matter_folders").upsert({
      matter_id: matterId,
      client_folder_id: folders.clientFolder.id,
      matter_folder_id: folders.matterFolder.id,
      folder_structure: folders.subfolders as unknown as Json,
      created_at: new Date().toISOString(),
    });

    // Get intake folder ID
    const intakeFolder = folders.subfolders["00 Intake" as FolderType];
    return {
      folderId: intakeFolder?.id || folders.matterFolder.id,
    };
  } catch (error) {
    console.error("Failed to create folders:", error);
    return { folderId: null, error: "Failed to create Google Drive folders" };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateCheck = uploadLimiter.check(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    // Verify user is authenticated
    const { session, profile } = await getSessionWithProfile();
    if (!session || !profile) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: please sign in" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const matterId = formData.get("matterId") as string;
    const file = formData.get("file") as File;

    if (!matterId) {
      return NextResponse.json(
        { ok: false, error: "Matter ID is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "File is required" },
        { status: 400 }
      );
    }

    // Validate file type and size
    const fileError = validateUploadedFile(file);
    if (fileError) {
      return NextResponse.json(
        { ok: false, error: fileError },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    // IDOR protection: verify client owns this matter or user is staff/admin
    if (profile.role === "client") {
      const { data: matter } = await supabase
        .from("matters")
        .select("client_id")
        .eq("id", matterId)
        .single();

      if (!matter || matter.client_id !== session.user.id) {
        return NextResponse.json(
          { ok: false, error: "You do not have access to this matter" },
          { status: 403 }
        );
      }
    }

    // Get practice Google refresh token
    const refreshToken = await getPracticeRefreshToken();
    if (!refreshToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Google Drive not connected. Please contact your lawyer.",
        },
        { status: 400 }
      );
    }

    // Ensure folders exist and get the intake folder ID
    const { folderId, error: folderError } = await ensureMatterFolders(matterId);
    if (folderError || !folderId) {
      return NextResponse.json(
        { ok: false, error: folderError || "Could not determine upload location" },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent path traversal / injection
    const safeName = sanitizeFilename(file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Drive
    const uploadResult = await uploadFileToDrive(
      refreshToken,
      {
        name: safeName,
        mimeType: file.type,
        buffer,
      },
      folderId,
      `Uploaded via intake form`
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || "Upload failed" },
        { status: 500 }
      );
    }

    // Store document metadata in Supabase
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        matter_id: matterId,
        title: safeName,
        drive_file_id: uploadResult.fileId!,
        folder_path: "00 Intake",
        version: 1,
        status: "uploaded",
        metadata: {
          mimeType: file.type,
          size: file.size,
          webViewLink: uploadResult.webViewLink,
          uploadedVia: "intake_form",
        },
      })
      .select("id")
      .single();

    if (docError) {
      console.error("Error storing document metadata:", docError);
      // Don't fail - file is already uploaded
    }

    return NextResponse.json({
      ok: true,
      data: {
        documentId: document?.id || "",
        driveFileId: uploadResult.fileId!,
        webViewLink: uploadResult.webViewLink || "",
      },
    });
  } catch (error) {
    console.error("Upload intake file error:", error);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
