"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getIntakeFormTemplates,
  deleteIntakeFormTemplate,
  saveIntakeFormTemplate,
} from "@/lib/intake/actions";

const FormBuilderEditor = dynamic(
  () =>
    import("./form-builder-editor").then((mod) => ({
      default: mod.FormBuilderEditor,
    })),
  {
    loading: () => (
      <div className="p-8 text-center text-slate-500">Loading editor...</div>
    ),
  }
);

interface Template {
  id: string;
  name: string;
  matter_type: string | null;
  description: string | null;
  sections: Array<{ id: string; title: string; fields: Array<{ id: string; type: string; label: string }> }>;
  version: number;
  is_default: boolean;
  is_active: boolean;
  source: string;
  source_form_id: string | null;
  created_at: string;
  updated_at: string;
}

export function IntakeFormsPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState<{
    template: { name: string; description?: string; sections: Array<{ id: string; title: string; fields: Array<{ id: string; type: string; label: string }> }> };
    sourceFormId: string;
    originalTitle: string;
    fieldCount: number;
    sectionCount: number;
  } | null>(null);

  const loadTemplates = useCallback(async () => {
    const result = await getIntakeFormTemplates();
    if (result.data) {
      setTemplates(result.data.filter((t: Template) => t.is_active));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleImport = async () => {
    setImportLoading(true);
    setImportError("");
    setImportPreview(null);

    try {
      const res = await fetch("/api/google/forms/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formUrl: importUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || "Failed to import form");
        return;
      }

      setImportPreview(data);
    } catch {
      setImportError("Failed to connect to server");
    } finally {
      setImportLoading(false);
    }
  };

  const handleSaveImport = async () => {
    if (!importPreview) return;
    setImportLoading(true);

    const result = await saveIntakeFormTemplate(null, {
      name: importPreview.template.name,
      description: importPreview.template.description,
      sections: importPreview.template.sections,
      source: "google_forms",
      source_form_id: importPreview.sourceFormId,
    });

    if ("error" in result) {
      setImportError(result.error);
    } else {
      setImportOpen(false);
      setImportUrl("");
      setImportPreview(null);
      await loadTemplates();
    }
    setImportLoading(false);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    await deleteIntakeFormTemplate(templateId);
    await loadTemplates();
  };

  const handleCreateNew = async () => {
    const result = await saveIntakeFormTemplate(null, {
      name: "New Intake Form",
      description: "",
      sections: [
        {
          id: "section-1",
          title: "Section 1",
          fields: [],
        },
      ],
      source: "custom",
    });

    if ("ok" in result) {
      await loadTemplates();
      // Find the newly created template and open the editor
      const refreshed = await getIntakeFormTemplates();
      if (refreshed.data) {
        const newest = refreshed.data
          .filter((t: Template) => t.is_active)
          .sort(
            (a: Template, b: Template) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )[0];
        if (newest) {
          setEditingTemplate(newest.id);
        }
      }
    }
  };

  const getFieldCount = (template: Template) => {
    return template.sections.reduce(
      (sum: number, s: Template["sections"][number]) => sum + (s.fields?.length || 0),
      0
    );
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "google_forms":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Google Forms
          </Badge>
        );
      case "seed":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-600 border-gray-200"
          >
            Built-in
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Custom
          </Badge>
        );
    }
  };

  if (editingTemplate) {
    return (
      <FormBuilderEditor
        templateId={editingTemplate}
        onBack={() => {
          setEditingTemplate(null);
          loadTemplates();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Intake Form Templates
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage intake forms sent to clients. Import from Google Forms or
            create from scratch.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import from Google Forms
          </Button>
          <Button onClick={handleCreateNew}>
            <svg
              className="w-4 h-4 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-slate-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No intake templates yet
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Import a Google Form or create a new template to get started.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import from Google Forms
            </Button>
            <Button onClick={handleCreateNew}>Create New</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="p-6 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setEditingTemplate(template.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {template.name}
                  </h3>
                  {template.matter_type && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {template.matter_type}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {getSourceBadge(template.source)}
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {template.sections.length} section
                  {template.sections.length !== 1 ? "s" : ""}
                  {" \u00B7 "}
                  {getFieldCount(template)} field
                  {getFieldCount(template) !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTemplate(template.id);
                    }}
                  >
                    Edit
                  </Button>
                  {!template.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import from Google Forms</DialogTitle>
            <DialogDescription>
              Paste a Google Form URL to import its structure as an intake
              template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="form-url">Google Form URL or ID</Label>
              <Input
                id="form-url"
                placeholder="https://docs.google.com/forms/d/... or form ID"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="mt-1.5"
              />
            </div>

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {importError}
              </div>
            )}

            {importPreview && (
              <div className="p-4 bg-slate-50 border rounded-md space-y-2">
                <h4 className="font-medium text-slate-900">
                  {importPreview.originalTitle}
                </h4>
                <div className="flex gap-3 text-sm text-slate-600">
                  <span>{importPreview.sectionCount} sections</span>
                  <span>{importPreview.fieldCount} fields</span>
                </div>
                {importPreview.template.description && (
                  <p className="text-sm text-slate-500">
                    {importPreview.template.description}
                  </p>
                )}
                <div className="pt-2">
                  <p className="text-xs text-slate-400 mb-2">Sections:</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {importPreview.template.sections.map(
                      (s: { title: string; fields: Array<{ id: string }> }, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          {s.title} ({s.fields.length} fields)
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setImportOpen(false);
                  setImportUrl("");
                  setImportPreview(null);
                  setImportError("");
                }}
              >
                Cancel
              </Button>
              {importPreview ? (
                <Button onClick={handleSaveImport} disabled={importLoading}>
                  {importLoading ? "Saving..." : "Import Template"}
                </Button>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={importLoading || !importUrl.trim()}
                >
                  {importLoading ? "Fetching..." : "Fetch Form"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
