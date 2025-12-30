import type { FolderType } from "./types";

/**
 * Utility functions for Google Drive paths
 * (Non-server-action utilities)
 */

/**
 * Get folder path (for display)
 */
export function getMatterFolderPath(
  clientName: string,
  matterTitle: string,
  folderType?: FolderType
): string {
  const basePath = `/MatterFlow/${clientName}/${matterTitle}`;
  return folderType ? `${basePath}/${folderType}` : basePath;
}
