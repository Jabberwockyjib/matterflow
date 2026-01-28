"use client";

import { useReducer, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionList } from "./section-list";
import { FieldMapper } from "./field-mapper";
import { ConditionBuilder } from "./condition-builder";
import { DocumentPreview } from "./document-preview";
import {
  updateTemplateSection,
  deleteTemplateSection,
  createTemplateSection,
  reorderTemplateSections,
} from "@/lib/document-templates/actions";
import type {
  DocumentTemplate,
  TemplateSection,
  TemplateField,
  ConditionRules,
  SourceType,
} from "@/lib/document-templates/types";

// Editor State
interface EditorState {
  sections: TemplateSection[];
  fields: TemplateField[];
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

type EditorAction =
  | { type: "SET_SECTIONS"; sections: TemplateSection[] }
  | { type: "UPDATE_SECTION"; sectionId: string; updates: Partial<TemplateSection> }
  | { type: "DELETE_SECTION"; sectionId: string }
  | { type: "ADD_SECTION"; section: TemplateSection }
  | { type: "REORDER_SECTIONS"; sectionIds: string[] }
  | { type: "UPDATE_FIELD"; fieldId: string; updates: Partial<TemplateField> }
  | { type: "SET_SAVING"; isSaving: boolean }
  | { type: "SET_SAVED" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_SECTIONS":
      return { ...state, sections: action.sections };

    case "UPDATE_SECTION":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId ? { ...s, ...action.updates } : s
        ),
        isDirty: true,
      };

    case "DELETE_SECTION":
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== action.sectionId),
        isDirty: true,
      };

    case "ADD_SECTION":
      return {
        ...state,
        sections: [...state.sections, action.section],
        isDirty: true,
      };

    case "REORDER_SECTIONS": {
      const sectionMap = new Map(state.sections.map((s) => [s.id, s]));
      const reordered = action.sectionIds
        .map((id) => sectionMap.get(id))
        .filter(Boolean) as TemplateSection[];
      return {
        ...state,
        sections: reordered.map((s, i) => ({ ...s, sortOrder: i })),
        isDirty: true,
      };
    }

    case "UPDATE_FIELD":
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === action.fieldId ? { ...f, ...action.updates } : f
        ),
        isDirty: true,
      };

    case "SET_SAVING":
      return { ...state, isSaving: action.isSaving };

    case "SET_SAVED":
      return { ...state, isDirty: false, lastSaved: new Date() };

    case "SET_ERROR":
      return { ...state, error: action.error, isSaving: false };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

interface TemplateEditorProps {
  template: DocumentTemplate;
  initialSections: TemplateSection[];
  initialFields: TemplateField[];
}

export function TemplateEditor({
  template,
  initialSections,
  initialFields,
}: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [state, dispatch] = useReducer(editorReducer, {
    sections: initialSections,
    fields: initialFields,
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  // Handle section updates
  const handleUpdateSection = useCallback(
    async (sectionId: string, updates: { name?: string; content?: string; isConditional?: boolean; conditionRules?: ConditionRules | null }) => {
      // Optimistic update
      dispatch({ type: "UPDATE_SECTION", sectionId, updates });

      // Persist to database
      startTransition(async () => {
        const result = await updateTemplateSection(sectionId, updates);
        if (!result.success) {
          dispatch({ type: "SET_ERROR", error: result.error || "Failed to save section" });
        }
      });
    },
    []
  );

  // Handle section deletion
  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      // Optimistic update
      dispatch({ type: "DELETE_SECTION", sectionId });

      // Persist to database
      startTransition(async () => {
        const result = await deleteTemplateSection(sectionId);
        if (!result.success) {
          dispatch({ type: "SET_ERROR", error: result.error || "Failed to delete section" });
        }
      });
    },
    []
  );

  // Handle section reordering
  const handleReorderSections = useCallback(
    async (sectionIds: string[]) => {
      // Optimistic update
      dispatch({ type: "REORDER_SECTIONS", sectionIds });

      // Persist to database
      startTransition(async () => {
        const result = await reorderTemplateSections(template.id, sectionIds);
        if (!result.success) {
          dispatch({ type: "SET_ERROR", error: result.error || "Failed to reorder sections" });
        }
      });
    },
    [template.id]
  );

  // Handle adding a new section
  const handleAddSection = useCallback(async () => {
    const newSortOrder = state.sections.length;

    startTransition(async () => {
      const result = await createTemplateSection({
        templateId: template.id,
        name: `Section ${newSortOrder + 1}`,
        content: "Enter section content here...",
        sortOrder: newSortOrder,
      });

      if (result.success && result.data) {
        dispatch({ type: "ADD_SECTION", section: result.data });
      } else {
        dispatch({ type: "SET_ERROR", error: result.error || "Failed to add section" });
      }
    });
  }, [template.id, state.sections.length]);

  // Handle field mapping updates (would need server action)
  const handleUpdateField = useCallback(
    (fieldId: string, updates: { sourceType?: SourceType; intakeQuestionId?: string | null }) => {
      dispatch({ type: "UPDATE_FIELD", fieldId, updates });
      // Note: In a complete implementation, this would also persist to the database
      // via a updateTemplateField server action
    },
    []
  );

  // Auto-save with debounce
  useEffect(() => {
    if (!state.isDirty) return;

    const timer = setTimeout(() => {
      dispatch({ type: "SET_SAVED" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [state.isDirty, state.sections, state.fields]);

  // Warn about unsaved changes on navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isDirty]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/admin/templates/${template.id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Edit: {template.name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{template.status}</Badge>
                  <span className="text-sm text-slate-500">v{template.version}</span>
                  {state.isDirty && (
                    <span className="text-sm text-amber-600">Unsaved changes</span>
                  )}
                  {state.lastSaved && !state.isDirty && (
                    <span className="text-sm text-slate-500">
                      Last saved {state.lastSaved.toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              )}
              <Button
                onClick={() => router.push(`/admin/templates/${template.id}`)}
                disabled={isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="container max-w-6xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-red-700">{state.error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "CLEAR_ERROR" })}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-6 py-6">
        <Tabs defaultValue="sections">
          <TabsList className="mb-6">
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="sections">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Organize your template sections. Drag to reorder, click to edit.
              </p>
              <SectionList
                sections={state.sections}
                onUpdate={handleUpdateSection}
                onDelete={handleDeleteSection}
                onReorder={handleReorderSections}
                onAdd={handleAddSection}
              />
            </div>
          </TabsContent>

          <TabsContent value="fields">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Map placeholders to data sources. Fields are automatically detected from{" "}
                <code className="bg-slate-100 px-1 rounded">{`{{placeholder}}`}</code>{" "}
                patterns in your sections.
              </p>
              <FieldMapper
                fields={state.fields}
                templateCategory={template.category}
                onUpdate={handleUpdateField}
              />
            </div>
          </TabsContent>

          <TabsContent value="conditions">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Configure conditional logic to show or hide sections based on field
                values.
              </p>
              <ConditionBuilder
                sections={state.sections}
                fields={state.fields}
                onUpdate={handleUpdateSection}
              />
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Preview how your document will look with sample data. Edit values on
                the left to test conditional sections.
              </p>
              <DocumentPreview
                sections={state.sections}
                fields={state.fields}
                templateCategory={template.category}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
