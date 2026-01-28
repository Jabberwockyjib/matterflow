"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { TemplateField, SourceType } from "@/lib/document-templates/types";
import {
  SOURCE_DEFINITIONS,
  getSourceFields,
  getIntakeFieldsForCategory,
  type SourceField,
} from "./field-sources";

interface FieldMappingRowProps {
  field: TemplateField;
  templateCategory: string | null;
  onUpdate: (fieldId: string, updates: { sourceType?: SourceType; intakeQuestionId?: string | null }) => void;
}

export function FieldMappingRow({
  field,
  templateCategory,
  onUpdate,
}: FieldMappingRowProps) {
  // Get available source fields based on selected source type
  const getAvailableFields = (sourceType: SourceType): SourceField[] => {
    if (sourceType === "intake") {
      return getIntakeFieldsForCategory(templateCategory);
    }
    return getSourceFields(sourceType);
  };

  const currentSourceFields = getAvailableFields(field.sourceType);
  const showMapToSelect = field.sourceType !== "manual" && currentSourceFields.length > 0;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      {/* Placeholder Name */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">
            {`{{${field.name}}}`}
          </code>
          {field.isRequired && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              Required
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-1">{field.label}</p>
      </td>

      {/* Source Type */}
      <td className="py-3 px-4">
        <Select
          value={field.sourceType}
          onValueChange={(value: SourceType) => {
            onUpdate(field.id, { sourceType: value, intakeQuestionId: null });
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_DEFINITIONS.map((source) => (
              <SelectItem key={source.type} value={source.type}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>

      {/* Map To Field */}
      <td className="py-3 px-4">
        {showMapToSelect ? (
          <Select
            value={field.intakeQuestionId || ""}
            onValueChange={(value) => {
              onUpdate(field.id, { intakeQuestionId: value || null });
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {currentSourceFields.map((sourceField) => (
                <SelectItem key={sourceField.id} value={sourceField.id}>
                  {sourceField.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.sourceType === "manual" ? (
          <span className="text-sm text-slate-500 italic">
            Entered at generation
          </span>
        ) : (
          <span className="text-sm text-slate-500 italic">
            No fields available
          </span>
        )}
      </td>

      {/* Field Type */}
      <td className="py-3 px-4">
        <Badge variant="outline" className="text-xs capitalize">
          {field.fieldType.replace("_", " ")}
        </Badge>
      </td>
    </tr>
  );
}
