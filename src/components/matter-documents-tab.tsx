"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { initializeMatterFolders, getMatterDocuments, uploadDocument } from "@/lib/google-drive/actions";
import { FolderIcon, CheckCircle2, AlertCircle, Loader2, FileText, ExternalLink, Sparkles, Upload } from "lucide-react";

interface Document {
  id: string;
  title: string;
  folderPath: string | null;
  version: number;
  status: string;
  metadata: unknown;
  createdAt: string;
  aiDocumentType: string | null;
  aiSummary: string | null;
  aiProcessedAt: string | null;
  webViewLink: string | null;
  mimeType: string | null;
}

interface MatterDocumentsTabProps {
  matterId: string;
  isInitialized: boolean;
  folders?: Record<string, { id: string; name: string }>;
}

const FOLDER_OPTIONS = [
  { value: "00 Intake", label: "00 Intake" },
  { value: "01 Source Docs", label: "01 Source Docs" },
  { value: "02 Work Product", label: "02 Work Product" },
  { value: "03 Client Deliverables", label: "03 Client Deliverables" },
  { value: "04 Billing & Engagement", label: "04 Billing & Engagement" },
  { value: "99 Archive", label: "99 Archive" },
];

export function MatterDocumentsTab({
  matterId,
  isInitialized,
  folders,
}: MatterDocumentsTabProps) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);

  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(FOLDER_OPTIONS[0].value);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents when folders are initialized
  useEffect(() => {
    if (isInitialized) {
      setIsLoadingDocuments(true);
      getMatterDocuments(matterId)
        .then((result) => {
          if (result.data) {
            setDocuments(result.data);
          }
        })
        .finally(() => setIsLoadingDocuments(false));
    }
  }, [matterId, isInitialized]);

  const refreshDocuments = async () => {
    setIsLoadingDocuments(true);
    const result = await getMatterDocuments(matterId);
    if (result.data) {
      setDocuments(result.data);
    }
    setIsLoadingDocuments(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("matterId", matterId);
    formData.append("folderType", selectedFolder);

    const result = await uploadDocument(formData);

    setIsUploading(false);

    if (result.error) {
      setUploadError(result.error);
    } else {
      setUploadSuccess(true);
      // Refresh document list
      await refreshDocuments();
      // Close dialog after short delay
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadSuccess(false);
        setSelectedFolder(FOLDER_OPTIONS[0].value);
      }, 1500);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
        <Button
          size="sm"
          disabled={!isInitialized || isInitializing}
          onClick={() => setIsUploadOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Upload Document Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document to your Google Drive folder for this matter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Folder Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Destination Folder
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                disabled={isUploading}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {FOLDER_OPTIONS.map((folder) => (
                  <option key={folder.value} value={folder.value}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>

            {/* Status Messages */}
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading to Google Drive...
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
                Document uploaded successfully!
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
          {/* Document List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Documents ({documents.length})
              </p>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Drive Connected</span>
              </div>
            </div>

            {isLoadingDocuments ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Loading documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No documents uploaded yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload documents to see them here with AI summaries
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <h4 className="font-medium text-slate-900 truncate">
                            {doc.title}
                          </h4>
                        </div>

                        {/* AI Summary Section */}
                        {doc.aiSummary && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 mb-1">
                              {doc.aiDocumentType && (
                                <Badge variant="outline" className="text-xs">
                                  {doc.aiDocumentType}
                                </Badge>
                              )}
                              <span className="flex items-center gap-1 text-xs text-purple-600">
                                <Sparkles className="h-3 w-3" />
                                AI Summary
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {doc.aiSummary}
                            </p>
                          </div>
                        )}

                        {/* Document metadata */}
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                          {doc.folderPath && (
                            <span className="flex items-center gap-1">
                              <FolderIcon className="h-3 w-3" />
                              {doc.folderPath}
                            </span>
                          )}
                          <span>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      {doc.webViewLink && (
                        <a
                          href={doc.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Folder Structure (collapsed) */}
          <details className="border-t border-slate-200 pt-4">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500 hover:text-slate-700">
              Folder Structure
            </summary>
            <div className="mt-3 space-y-2">
              {folderList.map((folder) => (
                <div
                  key={folder}
                  className="flex items-center gap-2 p-2 rounded hover:bg-slate-50"
                >
                  <FolderIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-slate-700">{folder}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Documents are organized in your Google Drive under:
              <br />
              <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded mt-1 inline-block">
                MatterFlow / Client Name / {folders ? "Matter Name" : "..."}
              </span>
            </p>
          </details>
        </>
      )}
    </div>
  );
}
