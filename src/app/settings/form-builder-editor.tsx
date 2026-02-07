"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Save,
  Trash2,
  Type,
  Mail,
  Phone,
  AlignLeft,
  Hash,
  Calendar,
  ListOrdered,
  CheckSquare,
  CircleDot,
  Upload,
  Heading,
  List,
  Loader2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getIntakeFormTemplateById,
  saveIntakeFormTemplate,
} from "@/lib/intake/actions";
import type {
  IntakeFormField,
  IntakeFormFieldType,
  IntakeFormSection,
} from "@/lib/intake/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIELD_TYPES: {
  value: IntakeFormFieldType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "textarea", label: "Textarea", icon: AlignLeft },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "select", label: "Select", icon: ListOrdered },
  { value: "multiselect", label: "Multi-select", icon: List },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "radio", label: "Radio", icon: CircleDot },
  { value: "file", label: "File Upload", icon: Upload },
  { value: "section_header", label: "Section Header", icon: Heading },
];

const DEFAULT_MATTER_TYPES = [
  "Contract Review",
  "Employment Agreement",
  "Policy Review",
  "General",
  "Litigation",
  "Corporate",
  "Real Estate",
  "Estate Planning",
  "Immigration",
  "Family Law",
];

const TYPES_WITH_PLACEHOLDER: IntakeFormFieldType[] = [
  "text",
  "email",
  "phone",
  "textarea",
  "number",
];

const TYPES_WITH_OPTIONS: IntakeFormFieldType[] = [
  "select",
  "multiselect",
  "radio",
];

const TYPES_WITH_VALIDATION: IntakeFormFieldType[] = [
  "text",
  "textarea",
  "number",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getFieldTypeLabel(type: IntakeFormFieldType): string {
  return FIELD_TYPES.find((ft) => ft.value === type)?.label ?? type;
}

function createDefaultField(type: IntakeFormFieldType): IntakeFormField {
  const base: IntakeFormField = {
    id: generateId("field"),
    type,
    label: `New ${getFieldTypeLabel(type)} Field`,
  };

  if (TYPES_WITH_OPTIONS.includes(type)) {
    base.options = [
      { value: "option_1", label: "Option 1" },
      { value: "option_2", label: "Option 2" },
    ];
  }

  if (type === "file") {
    base.fileConfig = {
      maxSize: 10 * 1024 * 1024,
      maxFiles: 5,
      acceptedTypes: ["application/pdf"],
    };
  }

  return base;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FormBuilderEditorProps {
  templateId: string;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Sortable Field Item
// ---------------------------------------------------------------------------

function SortableFieldItem({
  field,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: {
  field: IntakeFormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const FieldIcon = FIELD_TYPES.find((ft) => ft.value === field.type)?.icon ?? Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
        isDragging
          ? "opacity-50 border-dashed border-slate-300 bg-slate-50"
          : isSelected
            ? "border-accent bg-accent/5 ring-1 ring-accent/30"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
      onClick={onSelect}
    >
      <button
        type="button"
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <FieldIcon className="h-4 w-4 flex-shrink-0 text-slate-500" />

      <span className="flex-1 truncate text-sm font-medium text-slate-800">
        {field.label}
      </span>

      {field.required && (
        <span className="text-red-500 text-xs font-bold flex-shrink-0">*</span>
      )}

      <Badge
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0"
      >
        {getFieldTypeLabel(field.type)}
      </Badge>

      <button
        type="button"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        title="Duplicate field"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete field"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Options Editor (for select / multiselect / radio)
// ---------------------------------------------------------------------------

function OptionsEditor({
  options,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  onChange: (options: Array<{ value: string; label: string }>) => void;
}) {
  function addOption() {
    const index = options.length + 1;
    onChange([
      ...options,
      { value: `option_${index}`, label: `Option ${index}` },
    ]);
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function updateOption(
    index: number,
    key: "value" | "label",
    val: string
  ) {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, [key]: val } : opt
    );
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">Options</Label>
      <div className="space-y-1.5">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Input
              value={option.label}
              onChange={(e) => updateOption(index, "label", e.target.value)}
              placeholder="Label"
              className="h-8 text-xs flex-1"
            />
            <Input
              value={option.value}
              onChange={(e) => updateOption(index, "value", e.target.value)}
              placeholder="Value"
              className="h-8 text-xs w-28 font-mono"
            />
            <button
              type="button"
              className="text-slate-400 hover:text-red-500 flex-shrink-0 p-0.5"
              onClick={() => removeOption(index)}
              title="Remove option"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-7"
        onClick={addOption}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Option
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation Editor (for text / textarea / number)
// ---------------------------------------------------------------------------

function ValidationEditor({
  validation,
  fieldType,
  onChange,
}: {
  validation?: IntakeFormField["validation"];
  fieldType: IntakeFormFieldType;
  onChange: (validation: IntakeFormField["validation"] | undefined) => void;
}) {
  const isNumeric = fieldType === "number";
  const isText = fieldType === "text" || fieldType === "textarea";

  function updateNumericValidation(key: string, val: string) {
    const current = validation || {};
    const numVal = val === "" ? undefined : Number(val);
    const updated = { ...current, [key]: numVal };

    const cleaned: Record<string, number | string | undefined> = {};
    for (const [k, v] of Object.entries(updated)) {
      if (v !== undefined && v !== null && !Number.isNaN(v)) {
        cleaned[k] = v;
      }
    }

    onChange(
      Object.keys(cleaned).length > 0
        ? (cleaned as IntakeFormField["validation"])
        : undefined
    );
  }

  function updateStringValidation(
    key: "pattern" | "patternMessage",
    val: string
  ) {
    const current = validation || {};
    const updated = { ...current, [key]: val || undefined };
    const cleaned: Record<string, number | string | undefined> = {};
    for (const [k, v] of Object.entries(updated)) {
      if (v !== undefined && v !== null) {
        cleaned[k] = v;
      }
    }
    onChange(
      Object.keys(cleaned).length > 0
        ? (cleaned as IntakeFormField["validation"])
        : undefined
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">Validation Rules</Label>
      <div className="grid grid-cols-2 gap-2">
        {isNumeric && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400">Min Value</Label>
              <Input
                type="number"
                value={validation?.min ?? ""}
                onChange={(e) =>
                  updateNumericValidation("min", e.target.value)
                }
                placeholder="Min"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400">Max Value</Label>
              <Input
                type="number"
                value={validation?.max ?? ""}
                onChange={(e) =>
                  updateNumericValidation("max", e.target.value)
                }
                placeholder="Max"
                className="h-8 text-xs"
              />
            </div>
          </>
        )}
        {isText && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400">Min Length</Label>
              <Input
                type="number"
                value={validation?.minLength ?? ""}
                onChange={(e) =>
                  updateNumericValidation("minLength", e.target.value)
                }
                placeholder="Min"
                className="h-8 text-xs"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-400">Max Length</Label>
              <Input
                type="number"
                value={validation?.maxLength ?? ""}
                onChange={(e) =>
                  updateNumericValidation("maxLength", e.target.value)
                }
                placeholder="Max"
                className="h-8 text-xs"
                min={0}
              />
            </div>
          </>
        )}
      </div>
      {isText && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-slate-400">
            Regex Pattern (optional)
          </Label>
          <Input
            value={validation?.pattern || ""}
            onChange={(e) => updateStringValidation("pattern", e.target.value)}
            placeholder="e.g. ^[A-Z].*"
            className="h-8 text-xs font-mono"
          />
          <Input
            value={validation?.patternMessage || ""}
            onChange={(e) =>
              updateStringValidation("patternMessage", e.target.value)
            }
            placeholder="Pattern error message"
            className="h-8 text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Config Editor
// ---------------------------------------------------------------------------

function FileConfigEditor({
  fileConfig,
  onChange,
}: {
  fileConfig?: IntakeFormField["fileConfig"];
  onChange: (fileConfig: IntakeFormField["fileConfig"] | undefined) => void;
}) {
  const maxSizeMB =
    fileConfig?.maxSize != null
      ? (fileConfig.maxSize / (1024 * 1024)).toString()
      : "";

  function updateConfig(key: string, val: string) {
    const current = fileConfig || {};
    let updated = { ...current };

    if (key === "maxSize") {
      const mb = val === "" ? undefined : Number(val);
      updated = {
        ...updated,
        maxSize:
          mb != null && !Number.isNaN(mb) ? mb * 1024 * 1024 : undefined,
      };
    } else if (key === "maxFiles") {
      const n = val === "" ? undefined : Number(val);
      updated = {
        ...updated,
        maxFiles: n != null && !Number.isNaN(n) ? n : undefined,
      };
    } else if (key === "acceptedTypes") {
      updated = {
        ...updated,
        acceptedTypes: val
          ? val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      };
    }

    const hasValues = Object.values(updated).some(
      (v) => v !== undefined && v !== null
    );
    onChange(hasValues ? updated : undefined);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs">File Upload Settings</Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400">Max Size (MB)</Label>
          <Input
            type="number"
            value={maxSizeMB}
            onChange={(e) => updateConfig("maxSize", e.target.value)}
            placeholder="10"
            className="h-8 text-xs"
            min={1}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400">Max Files</Label>
          <Input
            type="number"
            value={fileConfig?.maxFiles ?? ""}
            onChange={(e) => updateConfig("maxFiles", e.target.value)}
            placeholder="5"
            className="h-8 text-xs"
            min={1}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-slate-400">
          Accepted MIME Types (comma-separated)
        </Label>
        <Input
          value={fileConfig?.acceptedTypes?.join(", ") || ""}
          onChange={(e) => updateConfig("acceptedTypes", e.target.value)}
          placeholder="application/pdf, image/*"
          className="h-8 text-xs"
        />
        <p className="text-[10px] text-slate-400">
          Examples: application/pdf, image/*, application/msword
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conditional Display Editor
// ---------------------------------------------------------------------------

function ConditionalDisplayEditor({
  conditionalDisplay,
  currentFieldId,
  allFieldOptions,
  onChange,
}: {
  conditionalDisplay?: IntakeFormField["conditionalDisplay"];
  currentFieldId: string;
  allFieldOptions: { id: string; label: string; sectionTitle: string }[];
  onChange: (
    conditionalDisplay: IntakeFormField["conditionalDisplay"] | undefined
  ) => void;
}) {
  const isEnabled = conditionalDisplay != null;

  const availableFields = allFieldOptions.filter(
    (f) => f.id !== currentFieldId
  );

  function toggleConditional(enabled: boolean) {
    if (enabled) {
      onChange({
        field: availableFields[0]?.id || "",
        value: "",
      });
    } else {
      onChange(undefined);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Checkbox
          id="conditional-toggle"
          checked={isEnabled}
          onCheckedChange={(checked) =>
            toggleConditional(checked === true)
          }
        />
        <Label
          htmlFor="conditional-toggle"
          className="text-xs cursor-pointer"
        >
          Show conditionally
        </Label>
      </div>

      {isEnabled && conditionalDisplay && (
        <div className="pl-6 space-y-2 border-l-2 border-slate-200">
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-400">
              Show when this field...
            </Label>
            <select
              value={conditionalDisplay.field}
              onChange={(e) =>
                onChange({ ...conditionalDisplay, field: e.target.value })
              }
              className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/20"
            >
              <option value="">Select a field...</option>
              {availableFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.sectionTitle} &gt; {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-400">
              ...equals this value
            </Label>
            <Input
              value={
                Array.isArray(conditionalDisplay.value)
                  ? conditionalDisplay.value.join(", ")
                  : conditionalDisplay.value || ""
              }
              onChange={(e) => {
                const val = e.target.value;
                const parsed = val.includes(",")
                  ? val
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : val;
                onChange({ ...conditionalDisplay, value: parsed });
              }}
              placeholder="Value or comma-separated values"
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-slate-400">
              Use commas for multiple values (any match triggers display).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Property Editor (right panel)
// ---------------------------------------------------------------------------

function FieldPropertyEditor({
  field,
  allFieldOptions,
  onUpdate,
  onDeselect,
}: {
  field: IntakeFormField;
  sectionId: string;
  allFieldOptions: { id: string; label: string; sectionTitle: string }[];
  onUpdate: (updates: Partial<IntakeFormField>) => void;
  onDeselect: () => void;
}) {
  const showPlaceholder = TYPES_WITH_PLACEHOLDER.includes(field.type);
  const showOptions = TYPES_WITH_OPTIONS.includes(field.type);
  const showValidation = TYPES_WITH_VALIDATION.includes(field.type);
  const showFileConfig = field.type === "file";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          Field Properties
        </h3>
        <button
          type="button"
          className="text-xs text-slate-400 hover:text-slate-600"
          onClick={onDeselect}
        >
          Deselect
        </button>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <Label htmlFor="field-label" className="text-xs">
          Label
        </Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Field label"
          className="h-9"
        />
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <Select
          value={field.type}
          onValueChange={(val) =>
            onUpdate({ type: val as IntakeFormFieldType })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(({ value, label, icon: Ic }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <Ic className="h-3.5 w-3.5 text-slate-400" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="field-description" className="text-xs">
          Description / Help Text
        </Label>
        <Textarea
          id="field-description"
          value={field.description || ""}
          onChange={(e) =>
            onUpdate({ description: e.target.value || undefined })
          }
          placeholder="Help text shown below the field"
          className="min-h-[60px] text-sm"
          rows={2}
        />
      </div>

      {/* Required */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="field-required"
          checked={field.required || false}
          onCheckedChange={(checked) =>
            onUpdate({ required: checked === true })
          }
        />
        <Label htmlFor="field-required" className="text-sm cursor-pointer">
          Required field
        </Label>
      </div>

      {/* Placeholder */}
      {showPlaceholder && (
        <div className="space-y-1.5">
          <Label htmlFor="field-placeholder" className="text-xs">
            Placeholder
          </Label>
          <Input
            id="field-placeholder"
            value={field.placeholder || ""}
            onChange={(e) =>
              onUpdate({ placeholder: e.target.value || undefined })
            }
            placeholder="Placeholder text"
            className="h-9"
          />
        </div>
      )}

      {/* Options Editor (select, multiselect, radio) */}
      {showOptions && (
        <OptionsEditor
          options={field.options || []}
          onChange={(options) => onUpdate({ options })}
        />
      )}

      {/* Validation (text, textarea, number) */}
      {showValidation && (
        <ValidationEditor
          validation={field.validation}
          fieldType={field.type}
          onChange={(validation) => onUpdate({ validation })}
        />
      )}

      {/* File Config */}
      {showFileConfig && (
        <FileConfigEditor
          fileConfig={field.fileConfig}
          onChange={(fileConfig) => onUpdate({ fileConfig })}
        />
      )}

      {/* Conditional Display */}
      <ConditionalDisplayEditor
        conditionalDisplay={field.conditionalDisplay}
        currentFieldId={field.id}
        allFieldOptions={allFieldOptions}
        onChange={(conditionalDisplay) => onUpdate({ conditionalDisplay })}
      />

      {/* Field ID (read-only) */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        <Label className="text-xs text-slate-400">Field ID</Label>
        <p className="text-xs text-slate-400 font-mono break-all">
          {field.id}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FormBuilderEditor({
  templateId,
  onBack,
}: FormBuilderEditorProps) {
  // ---- State ----
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [matterType, setMatterType] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<IntakeFormSection[]>([]);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  const [addFieldSectionId, setAddFieldSectionId] = useState<string | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "section" | "field";
    sectionId: string;
    fieldId?: string;
    label: string;
  } | null>(null);

  const [isDirty, setIsDirty] = useState(false);

  // ---- Sensors for DnD ----
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ---- Derived: selected field and its section ----
  const selectedFieldData = useMemo(() => {
    if (!selectedFieldId) return null;
    for (const section of sections) {
      const field = section.fields.find((f) => f.id === selectedFieldId);
      if (field) return { field, sectionId: section.id };
    }
    return null;
  }, [selectedFieldId, sections]);

  // ---- All field IDs for conditional display dropdown ----
  const allFieldOptions = useMemo(() => {
    const options: { id: string; label: string; sectionTitle: string }[] = [];
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.type !== "section_header") {
          options.push({
            id: field.id,
            label: field.label,
            sectionTitle: section.title,
          });
        }
      }
    }
    return options;
  }, [sections]);

  // ---- Load template ----
  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      try {
        setLoading(true);
        setError(null);
        const result = await getIntakeFormTemplateById(templateId);

        if (cancelled) return;

        if (result.error || !result.data) {
          setError(result.error || "Template not found");
          return;
        }

        const data = result.data;
        setTemplateName(data.name || "");
        setMatterType(data.matter_type || "");
        setDescription(data.description || "");
        setSections(
          Array.isArray(data.sections)
            ? (data.sections as IntakeFormSection[])
            : []
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load template"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadTemplate();
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  // ---- Mark dirty on state changes ----
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveSuccess(false);
  }, []);

  // ---- Section operations ----
  function addSection() {
    const newSection: IntakeFormSection = {
      id: generateId("section"),
      title: "New Section",
      description: "",
      fields: [],
    };
    setSections((prev) => [...prev, newSection]);
    markDirty();
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s))
    );
    markDirty();
  }

  function updateSectionDescription(sectionId: string, desc: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, description: desc || undefined } : s
      )
    );
    markDirty();
  }

  function deleteSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (selectedFieldData && selectedFieldData.sectionId === sectionId) {
      setSelectedFieldId(null);
    }
    setDeleteConfirm(null);
    markDirty();
  }

  function toggleSectionCollapsed(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  // ---- Field operations ----
  function addField(sectionId: string, type: IntakeFormFieldType) {
    const newField = createDefaultField(type);
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, fields: [...s.fields, newField] }
          : s
      )
    );
    setSelectedFieldId(newField.id);
    setAddFieldSectionId(null);
    markDirty();
  }

  function duplicateField(sectionId: string, fieldId: string) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const fieldIndex = s.fields.findIndex((f) => f.id === fieldId);
        if (fieldIndex === -1) return s;
        const original = s.fields[fieldIndex];
        const duplicate: IntakeFormField = {
          ...JSON.parse(JSON.stringify(original)),
          id: generateId("field"),
          label: `${original.label} (copy)`,
        };
        const newFields = [...s.fields];
        newFields.splice(fieldIndex + 1, 0, duplicate);
        return { ...s, fields: newFields };
      })
    );
    markDirty();
  }

  function deleteField(sectionId: string, fieldId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s
      )
    );
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setDeleteConfirm(null);
    markDirty();
  }

  function updateField(
    sectionId: string,
    fieldId: string,
    updates: Partial<IntakeFormField>
  ) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            }
          : s
      )
    );
    markDirty();
  }

  // ---- DnD handler ----
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSections((prev) => {
      let activeSectionIndex = -1;
      let activeFieldIndex = -1;
      let overSectionIndex = -1;
      let overFieldIndex = -1;

      for (let si = 0; si < prev.length; si++) {
        const aIdx = prev[si].fields.findIndex((f) => f.id === active.id);
        if (aIdx !== -1) {
          activeSectionIndex = si;
          activeFieldIndex = aIdx;
        }
        const oIdx = prev[si].fields.findIndex((f) => f.id === over.id);
        if (oIdx !== -1) {
          overSectionIndex = si;
          overFieldIndex = oIdx;
        }
      }

      if (activeSectionIndex === -1 || overSectionIndex === -1) return prev;

      // Only support reordering within the same section
      if (activeSectionIndex !== overSectionIndex) return prev;

      const sectionIndex = activeSectionIndex;
      const newSections = [...prev];
      const section = { ...newSections[sectionIndex] };
      section.fields = arrayMove(
        section.fields,
        activeFieldIndex,
        overFieldIndex
      );
      newSections[sectionIndex] = section;
      return newSections;
    });
    markDirty();
  }

  // ---- Save ----
  async function handleSave() {
    if (!templateName.trim()) {
      setError("Template name is required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const result = await saveIntakeFormTemplate(templateId, {
        name: templateName.trim(),
        matter_type: matterType || undefined,
        description: description.trim() || undefined,
        sections,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-500">
          Loading template...
        </span>
      </div>
    );
  }

  // ---- Error state (no data loaded at all) ----
  if (error && sections.length === 0 && !templateName) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "600px" }}>
      {/* ---------------------------------------------------------------- */}
      {/* Top Bar                                                         */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isDirty) {
              if (
                window.confirm(
                  "You have unsaved changes. Are you sure you want to go back?"
                )
              ) {
                onBack();
              }
            } else {
              onBack();
            }
          }}
          title="Back to templates"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <Input
            value={templateName}
            onChange={(e) => {
              setTemplateName(e.target.value);
              markDirty();
            }}
            placeholder="Template name"
            className="max-w-xs font-semibold text-base h-9 border-transparent hover:border-slate-200 focus-visible:border-accent"
          />

          <Select
            value={matterType}
            onValueChange={(val) => {
              setMatterType(val);
              markDirty();
            }}
          >
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Matter type" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_MATTER_TYPES.map((mt) => (
                <SelectItem key={mt} value={mt}>
                  {mt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isDirty && (
            <span className="text-xs text-amber-600 font-medium">
              Unsaved changes
            </span>
          )}
          {saveSuccess && (
            <span className="text-xs text-green-600 font-medium">Saved</span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !templateName.trim()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            type="button"
            className="text-red-400 hover:text-red-600 text-xs font-medium"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Main Content: Left Panel + Right Panel                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel: Sections & Fields */}
        <div className="w-[60%] border-r border-slate-200 overflow-y-auto p-4 space-y-4">
          {/* Template description */}
          <div>
            <Label
              htmlFor="template-description"
              className="text-xs text-slate-500 uppercase tracking-wide"
            >
              Description
            </Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty();
              }}
              placeholder="Describe what this intake form is for..."
              className="mt-1 min-h-[60px] text-sm"
              rows={2}
            />
          </div>

          {/* Sections */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {sections.map((section, sectionIndex) => {
              const isCollapsed = collapsedSections.has(section.id);

              return (
                <Card key={section.id} className="overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 border-b border-slate-100">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                      onClick={() => toggleSectionCollapsed(section.id)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <span className="text-xs font-medium text-slate-400 w-5 text-center flex-shrink-0">
                      {sectionIndex + 1}
                    </span>

                    <Input
                      value={section.title}
                      onChange={(e) =>
                        updateSectionTitle(section.id, e.target.value)
                      }
                      className="flex-1 h-8 text-sm font-semibold border-transparent hover:border-slate-200 focus-visible:border-accent bg-transparent"
                      placeholder="Section title"
                    />

                    <Badge
                      variant="outline"
                      className="text-[10px] flex-shrink-0"
                    >
                      {section.fields.length} field
                      {section.fields.length !== 1 ? "s" : ""}
                    </Badge>

                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                      onClick={() =>
                        setDeleteConfirm({
                          type: "section",
                          sectionId: section.id,
                          label: section.title,
                        })
                      }
                      title="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="p-3 space-y-2">
                      {/* Section description */}
                      <Input
                        value={section.description || ""}
                        onChange={(e) =>
                          updateSectionDescription(
                            section.id,
                            e.target.value
                          )
                        }
                        className="h-7 text-xs text-slate-500 border-transparent hover:border-slate-200 focus-visible:border-accent"
                        placeholder="Section description (optional)"
                      />

                      {/* Sortable field list */}
                      <SortableContext
                        items={section.fields.map((f) => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1.5">
                          {section.fields.map((field) => (
                            <SortableFieldItem
                              key={field.id}
                              field={field}
                              isSelected={selectedFieldId === field.id}
                              onSelect={() => setSelectedFieldId(field.id)}
                              onDelete={() =>
                                setDeleteConfirm({
                                  type: "field",
                                  sectionId: section.id,
                                  fieldId: field.id,
                                  label: field.label,
                                })
                              }
                              onDuplicate={() =>
                                duplicateField(section.id, field.id)
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>

                      {section.fields.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-4">
                          No fields in this section yet. Add one below.
                        </p>
                      )}

                      {/* Add field button / type picker */}
                      <div className="relative pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full border border-dashed border-slate-300 text-slate-500 hover:border-accent hover:text-accent-foreground"
                          onClick={() =>
                            setAddFieldSectionId(
                              addFieldSectionId === section.id
                                ? null
                                : section.id
                            )
                          }
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Field
                        </Button>

                        {addFieldSectionId === section.id && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1">
                            {FIELD_TYPES.map(
                              ({ value, label, icon: Ic }) => (
                                <button
                                  key={value}
                                  type="button"
                                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                  onClick={() =>
                                    addField(section.id, value)
                                  }
                                >
                                  <Ic className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{label}</span>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </DndContext>

          {/* Add section button */}
          <Button variant="secondary" className="w-full" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" />
            Add Section
          </Button>

          {sections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">
                This template has no sections. Click &quot;Add Section&quot; to
                get started.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Field Property Editor */}
        <div className="w-[40%] overflow-y-auto bg-slate-50 p-4">
          {selectedFieldData ? (
            <FieldPropertyEditor
              field={selectedFieldData.field}
              sectionId={selectedFieldData.sectionId}
              allFieldOptions={allFieldOptions}
              onUpdate={(updates) =>
                updateField(
                  selectedFieldData.sectionId,
                  selectedFieldData.field.id,
                  updates
                )
              }
              onDeselect={() => setSelectedFieldId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                <Type className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                No field selected
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Click on a field in the left panel to edit its properties.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog                                      */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete{" "}
              {deleteConfirm?.type === "section" ? "Section" : "Field"}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteConfirm?.label}</strong>?
              {deleteConfirm?.type === "section" &&
                " All fields in this section will be removed."}
              {" "}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "section") {
                  deleteSection(deleteConfirm.sectionId);
                } else if (deleteConfirm.fieldId) {
                  deleteField(
                    deleteConfirm.sectionId,
                    deleteConfirm.fieldId
                  );
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backdrop to close add-field dropdown when clicking outside */}
      {addFieldSectionId && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setAddFieldSectionId(null)}
        />
      )}
    </div>
  );
}
