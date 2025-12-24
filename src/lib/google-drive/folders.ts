"use server";

import { drive_v3 } from "googleapis";
import { createDriveClientWithRefresh } from "./client";
import type { DriveFolder, FolderType, MatterFolderStructure } from "./types";

/**
 * Folder management for Google Drive
 * Creates and manages MatterFlow folder structure
 */

const FOLDER_TYPES: FolderType[] = [
  "00 Intake",
  "01 Source Docs",
  "02 Work Product",
  "03 Client Deliverables",
  "04 Billing & Engagement",
  "99 Archive",
];

/**
 * Create a folder in Google Drive
 */
async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<DriveFolder> {
  const fileMetadata: drive_v3.Schema$File = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    parents: parentId ? [parentId] : undefined,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id, name, parents",
  });

  if (!response.data.id) {
    throw new Error(`Failed to create folder: ${name}`);
  }

  return {
    id: response.data.id,
    name: response.data.name || name,
    path: name,
    parentId: parentId,
  };
}

/**
 * Find folder by name and parent
 */
async function findFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<DriveFolder | null> {
  const query = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, parents)",
    spaces: "drive",
  });

  const folder = response.data.files?.[0];
  if (!folder || !folder.id) {
    return null;
  }

  return {
    id: folder.id,
    name: folder.name || name,
    path: name,
    parentId: folder.parents?.[0],
  };
}

/**
 * Get or create folder
 */
async function getOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<DriveFolder> {
  const existing = await findFolder(drive, name, parentId);
  if (existing) {
    return existing;
  }

  return createFolder(drive, name, parentId);
}

/**
 * Create complete matter folder structure
 * /Client Name/Matter Name/00 Intake, 01 Source Docs, etc.
 */
export async function createMatterFolders(
  refreshToken: string,
  clientName: string,
  matterTitle: string
): Promise<MatterFolderStructure> {
  const drive = createDriveClientWithRefresh(refreshToken);

  // Create or get client folder
  const clientFolder = await getOrCreateFolder(drive, clientName);

  // Create or get matter folder under client folder
  const matterFolder = await getOrCreateFolder(
    drive,
    matterTitle,
    clientFolder.id
  );

  // Create all subfolders
  const subfolders: Partial<Record<FolderType, DriveFolder>> = {};

  for (const folderType of FOLDER_TYPES) {
    const subfolder = await getOrCreateFolder(
      drive,
      folderType,
      matterFolder.id
    );
    subfolders[folderType] = subfolder;
  }

  return {
    clientFolder,
    matterFolder,
    subfolders: subfolders as Record<FolderType, DriveFolder>,
  };
}

/**
 * Get matter folder structure (without creating)
 */
export async function getMatterFolders(
  refreshToken: string,
  clientName: string,
  matterTitle: string
): Promise<MatterFolderStructure | null> {
  const drive = createDriveClientWithRefresh(refreshToken);

  const clientFolder = await findFolder(drive, clientName);
  if (!clientFolder) {
    return null;
  }

  const matterFolder = await findFolder(drive, matterTitle, clientFolder.id);
  if (!matterFolder) {
    return null;
  }

  const subfolders: Partial<Record<FolderType, DriveFolder>> = {};

  for (const folderType of FOLDER_TYPES) {
    const subfolder = await findFolder(drive, folderType, matterFolder.id);
    if (subfolder) {
      subfolders[folderType] = subfolder;
    }
  }

  return {
    clientFolder,
    matterFolder,
    subfolders: subfolders as Record<FolderType, DriveFolder>,
  };
}

/**
 * List files in a folder
 */
export async function listFilesInFolder(
  refreshToken: string,
  folderId: string
): Promise<Array<{ id: string; name: string; mimeType: string; size?: string; modifiedTime: string }>> {
  const drive = createDriveClientWithRefresh(refreshToken);

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, size, modifiedTime, webViewLink)",
    orderBy: "modifiedTime desc",
  });

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    mimeType: file.mimeType!,
    size: file.size,
    modifiedTime: file.modifiedTime!,
  }));
}

/**
 * Get folder path (for display)
 */
export function getMatterFolderPath(
  clientName: string,
  matterTitle: string,
  folderType?: FolderType
): string {
  const basePath = `/${clientName}/${matterTitle}`;
  return folderType ? `${basePath}/${folderType}` : basePath;
}
