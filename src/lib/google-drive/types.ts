/**
 * Google Drive types for MatterFlow
 */

export interface DriveTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
  parentId?: string;
}

/**
 * MatterFlow folder structure
 * /Client Name/Matter Name/...
 */
export type FolderType =
  | "00 Intake"
  | "01 Source Docs"
  | "02 Work Product"
  | "03 Client Deliverables"
  | "04 Billing & Engagement"
  | "99 Archive";

export interface MatterFolderStructure {
  clientFolder: DriveFolder;
  matterFolder: DriveFolder;
  subfolders: Record<FolderType, DriveFolder>;
}

export interface DocumentUpload {
  file: File;
  matterId: string;
  folderType: FolderType;
  description?: string;
}

export interface DocumentMetadata {
  id: string;
  matterId: string;
  title: string;
  driveFileId: string;
  folderPath: string;
  folderType: FolderType;
  version: number;
  mimeType: string;
  size?: number;
  status: "uploading" | "uploaded" | "classified" | "synced" | "error";
  summary?: string;
  webViewLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}
