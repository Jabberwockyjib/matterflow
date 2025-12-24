"use server";

import { Readable } from "stream";
import { createDriveClientWithRefresh } from "./client";
import type { DriveUploadResult, FolderType } from "./types";

/**
 * Document upload and management for Google Drive
 */

/**
 * Upload file to Google Drive
 */
export async function uploadFileToDrive(
  refreshToken: string,
  file: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  },
  folderId: string,
  description?: string
): Promise<DriveUploadResult> {
  try {
    const drive = createDriveClientWithRefresh(refreshToken);

    const fileMetadata = {
      name: file.name,
      parents: [folderId],
      description: description,
    };

    // Convert buffer to stream
    const media = {
      mimeType: file.mimeType,
      body: Readable.from(file.buffer),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, size, mimeType",
    });

    if (!response.data.id) {
      return {
        success: false,
        error: "Failed to upload file to Drive",
      };
    }

    return {
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch (error) {
    console.error("Drive upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Get file metadata from Drive
 */
export async function getFileMetadata(
  refreshToken: string,
  fileId: string
) {
  const drive = createDriveClientWithRefresh(refreshToken);

  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents",
  });

  return response.data;
}

/**
 * Delete file from Drive
 */
export async function deleteFileFromDrive(
  refreshToken: string,
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const drive = createDriveClientWithRefresh(refreshToken);

    await drive.files.delete({
      fileId,
    });

    return { success: true };
  } catch (error) {
    console.error("Drive delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed",
    };
  }
}

/**
 * Create a new version of a file (upload with same name to same folder)
 */
export async function createFileVersion(
  refreshToken: string,
  originalFileId: string,
  newFile: {
    buffer: Buffer;
    mimeType: string;
  }
): Promise<DriveUploadResult> {
  try {
    const drive = createDriveClientWithRefresh(refreshToken);

    // Get original file metadata
    const originalFile = await getFileMetadata(refreshToken, originalFileId);

    if (!originalFile.parents?.[0]) {
      return {
        success: false,
        error: "Original file has no parent folder",
      };
    }

    // Upload new version (Google Drive automatically versions files with same name)
    const media = {
      mimeType: newFile.mimeType,
      body: Readable.from(newFile.buffer),
    };

    const response = await drive.files.update({
      fileId: originalFileId,
      media: media,
      fields: "id, name, webViewLink, modifiedTime",
    });

    if (!response.data.id) {
      return {
        success: false,
        error: "Failed to create file version",
      };
    }

    return {
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch (error) {
    console.error("Drive version error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Version creation failed",
    };
  }
}

/**
 * Download file from Drive
 */
export async function downloadFileFromDrive(
  refreshToken: string,
  fileId: string
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  try {
    const drive = createDriveClientWithRefresh(refreshToken);

    const response = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    );

    return {
      success: true,
      data: Buffer.from(response.data as ArrayBuffer),
    };
  } catch (error) {
    console.error("Drive download error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Download failed",
    };
  }
}

/**
 * Share file with specific email
 */
export async function shareFileWithEmail(
  refreshToken: string,
  fileId: string,
  email: string,
  role: "reader" | "writer" | "commenter" = "reader"
): Promise<{ success: boolean; error?: string }> {
  try {
    const drive = createDriveClientWithRefresh(refreshToken);

    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "user",
        role: role,
        emailAddress: email,
      },
      sendNotificationEmail: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Drive share error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Share failed",
    };
  }
}

/**
 * Make file publicly viewable (with link)
 */
export async function makeFilePublic(
  refreshToken: string,
  fileId: string
): Promise<{ success: boolean; webViewLink?: string; error?: string }> {
  try {
    const drive = createDriveClientWithRefresh(refreshToken);

    await drive.permissions.create({
      fileId,
      requestBody: {
        type: "anyone",
        role: "reader",
      },
    });

    const file = await getFileMetadata(refreshToken, fileId);

    return {
      success: true,
      webViewLink: file.webViewLink || undefined,
    };
  } catch (error) {
    console.error("Drive public share error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Public share failed",
    };
  }
}
