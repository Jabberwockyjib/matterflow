"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { initializeMatterFolders } from "@/lib/google-drive/actions";
import { FolderIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface MatterDocumentsTabProps {
  matterId: string;
  isInitialized: boolean;
  folders?: Record<string, { id: string; name: string }>;
}

export function MatterDocumentsTab({
  matterId,
  isInitialized,
  folders,
}: MatterDocumentsTabProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInitialize = async () => {
    setIsInitializing(true);
    setError(null);

    const result = await initializeMatterFolders(matterId);

    setIsInitializing(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      // Refresh page to show updated state
      window.location.reload();
    }
  };

  const folderList = [
    "00 Intake",
    "01 Source Docs",
    "02 Work Product",
    "03 Client Deliverables",
    "04 Billing & Engagement",
    "99 Archive",
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Documents</h2>
        <Button size="sm" disabled={isInitialized || isInitializing}>
          Upload Document
        </Button>
      </div>

      {!isInitialized ? (
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
          <FolderIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Initialize Google Drive Folders
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            Create organized folder structure in your Google Drive for this matter.
            <br />
            Structure: <span className="font-mono text-xs">MatterFlow / Client Name / Matter Name / Subfolders</span>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-800">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Folders created successfully!</span>
            </div>
          )}

          <Button
            onClick={handleInitialize}
            disabled={isInitializing}
            size="lg"
          >
            {isInitializing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Folders...
              </>
            ) : (
              "Initialize Folders"
            )}
          </Button>

          <div className="mt-6 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">
              Folders that will be created:
            </p>
            <div className="space-y-2">
              {folderList.map((folder) => (
                <div
                  key={folder}
                  className="flex items-center gap-2 p-2 rounded bg-slate-50"
                >
                  <FolderIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-slate-700">{folder}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Folder Structure */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Folder Structure
              </p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Initialized</span>
              </div>
            </div>
            {folderList.map((folder) => (
              <div
                key={folder}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
              >
                <FolderIcon className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-slate-700">{folder}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              Documents are organized in your Google Drive under:
              <br />
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded mt-1 inline-block">
                MatterFlow / Client Name / {folders ? "Matter Name" : "..."}
              </span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
