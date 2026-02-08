/**
 * API route for uploading files for task responses
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import { verifyClientMatterAccess } from "@/lib/data/queries";
import { uploadFileToDrive } from "@/lib/google-drive/documents";
import { sanitizeFilename } from "@/lib/utils/sanitize";
import { validateUploadedFile } from "@/lib/uploads/validation";
import { uploadLimiter, getRateLimitKey } from "@/lib/rate-limit";
import type { Json } from "@/types/database.types";

async function getPracticeRefreshToken(): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("practice_settings")
    .select("google_refresh_token")
    .limit(1)
    .maybeSingle();
  return data?.google_refresh_token || null;
}

async function getMatterFolderId(matterId: string): Promise<string | null> {
  const supabase = supabaseAdmin();
  const { data } = await supabase
    .from("matter_folders")
    .select("folder_structure, matter_folder_id")
    .eq("matter_id", matterId)
    .maybeSingle();

  if (!data) return null;

  // Try to find "01 Source Docs" folder, fall back to matter folder
  const folderStructure = data.folder_structure as Record<string, { id: string }> | null;
  const sourceDocsFolder =
    folderStructure?.["01 Source Docs"] ||
    folderStructure?.["01_Source_Docs"];

  return sourceDocsFolder?.id || data.matter_folder_id || null;
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
    const taskId = formData.get("taskId") as string;
    const file = formData.get("file") as File;

    if (!matterId || !taskId || !file) {
      return NextResponse.json(
        { ok: false, error: "Matter ID, Task ID, and file are required" },
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
      const hasAccess = await verifyClientMatterAccess(matterId, session.user.id);
      if (!hasAccess) {
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
        { ok: false, error: "Google Drive not connected" },
        { status: 400 }
      );
    }

    // Get folder ID
    const folderId = await getMatterFolderId(matterId);
    if (!folderId) {
      return NextResponse.json(
        { ok: false, error: "Matter folders not initialized" },
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
      "Uploaded via task response"
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { ok: false, error: uploadResult.error || "Upload failed" },
        { status: 500 }
      );
    }

    // Store document metadata with task_id reference
    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        matter_id: matterId,
        task_id: taskId,
        title: safeName,
        drive_file_id: uploadResult.fileId!,
        folder_path: "01 Source Docs",
        version: 1,
        status: "uploaded",
        web_view_link: uploadResult.webViewLink || null,
        metadata: {
          mimeType: file.type,
          size: file.size,
          uploadedVia: "task_response",
        } as Json,
      })
      .select("id")
      .single();

    if (docError) {
      console.error("Error storing document metadata:", docError);
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
    console.error("Task upload error:", error);
    return NextResponse.json(
      { ok: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
