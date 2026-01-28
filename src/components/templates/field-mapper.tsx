"use client";

import { FieldMappingRow } from "./field-mapping-row";
import type { TemplateField, SourceType } from "@/lib/document-templates/types";

interface FieldMapperProps {
  fields: TemplateField[];
  templateCategory: string | null;
  onUpdate: (fieldId: string, updates: { sourceType?: SourceType; intakeQuestionId?: string | null }) => void;
}

export function FieldMapper({ fields, templateCategory, onUpdate }: FieldMapperProps) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <p className="text-slate-600">
          No fields have been detected in this template yet.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Fields are automatically extracted from placeholders like{" "}
          <code className="bg-slate-200 px-1 rounded">{`{{field_name}}`}</code>{" "}
          in your sections.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3 px-4 text-left text-sm font-medium text-slate-700">
              Placeholder
            </th>
            <th className="py-3 px-4 text-left text-sm font-medium text-slate-700">
              Source
            </th>
            <th className="py-3 px-4 text-left text-sm font-medium text-slate-700">
              Map To
            </th>
            <th className="py-3 px-4 text-left text-sm font-medium text-slate-700">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <FieldMappingRow
              key={field.id}
              field={field}
              templateCategory={templateCategory}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
