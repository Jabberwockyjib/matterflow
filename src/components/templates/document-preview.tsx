"use client";

import { useState, useMemo } from "react";
import { RefreshCw, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type {
  TemplateSection,
  TemplateField,
  ConditionRules,
  SimpleCondition,
  CompoundCondition,
} from "@/lib/document-templates/types";
import {
  getSampleValue,
  getIntakeFieldsForCategory,
  getSourceFields,
} from "./field-sources";

interface DocumentPreviewProps {
  sections: TemplateSection[];
  fields: TemplateField[];
  templateCategory: string | null;
}

// Helper to evaluate a condition against sample data
function evaluateCondition(
  condition: SimpleCondition,
  sampleData: Record<string, string>
): boolean {
  const fieldValue = sampleData[condition.field] || "";
  const conditionValue = String(condition.value || "");

  switch (condition.operator) {
    case "equals":
      return fieldValue === conditionValue;
    case "not_equals":
      return fieldValue !== conditionValue;
    case "contains":
      return fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
    case "not_contains":
      return !fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
    case "greater_than":
      return parseFloat(fieldValue) > parseFloat(conditionValue);
    case "less_than":
      return parseFloat(fieldValue) < parseFloat(conditionValue);
    case "is_empty":
      return !fieldValue || fieldValue.trim() === "";
    case "is_not_empty":
      return Boolean(fieldValue && fieldValue.trim() !== "");
    default:
      return true;
  }
}

// Evaluate compound or simple conditions
function evaluateConditions(
  rules: ConditionRules | null,
  sampleData: Record<string, string>
): boolean {
  if (!rules) return true;

  // Check if it's a compound condition
  const compound = rules as CompoundCondition;
  if (compound.all) {
    return compound.all.every((c) => evaluateCondition(c, sampleData));
  }
  if (compound.any) {
    return compound.any.some((c) => evaluateCondition(c, sampleData));
  }

  // Single condition
  return evaluateCondition(rules as SimpleCondition, sampleData);
}

// Replace placeholders in content with sample values
function mergeContent(
  content: string,
  sampleData: Record<string, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
    return sampleData[fieldName] || match;
  });
}

export function DocumentPreview({
  sections,
  fields,
  templateCategory,
}: DocumentPreviewProps) {
  // Build initial sample data from field sources
  const getDefaultSampleData = (): Record<string, string> => {
    const data: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.sourceType === "intake") {
        const intakeFields = getIntakeFieldsForCategory(templateCategory);
        const intakeField = intakeFields.find(
          (f) => f.id === field.intakeQuestionId
        );
        data[field.name] = intakeField?.sampleValue || `{{${field.name}}}`;
      } else if (field.sourceType === "manual") {
        data[field.name] = field.defaultValue || `[${field.label}]`;
      } else {
        data[field.name] = getSampleValue(
          field.sourceType,
          field.intakeQuestionId || field.name
        );
      }
    });

    return data;
  };

  const [sampleData, setSampleData] = useState<Record<string, string>>(
    getDefaultSampleData
  );

  // Get fields that can be edited in the sample data panel
  const editableFields = useMemo(() => {
    return fields.filter((f) => {
      // Show all fields for editing sample data
      return true;
    });
  }, [fields]);

  // Calculate which sections are visible based on conditions
  const sectionVisibility = useMemo(() => {
    return sections.map((section) => ({
      section,
      visible: !section.isConditional || evaluateConditions(section.conditionRules, sampleData),
    }));
  }, [sections, sampleData]);

  const handleSampleDataChange = (fieldName: string, value: string) => {
    setSampleData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleReset = () => {
    setSampleData(getDefaultSampleData());
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <p className="text-slate-600">No sections to preview.</p>
        <p className="text-sm text-slate-500 mt-2">
          Add sections first to see a preview.
        </p>
      </div>
    );
  }

  const hiddenCount = sectionVisibility.filter((s) => !s.visible).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sample Data Panel */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">Sample Data</h3>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {editableFields.length === 0 ? (
            <p className="text-sm text-slate-500">
              No fields available. Map fields in the Fields tab to see them here.
            </p>
          ) : (
            editableFields.map((field) => (
              <div key={field.id} className="space-y-1">
                <Label htmlFor={`sample-${field.name}`} className="text-sm">
                  {field.label}
                </Label>
                <Input
                  id={`sample-${field.name}`}
                  value={sampleData[field.name] || ""}
                  onChange={(e) =>
                    handleSampleDataChange(field.name, e.target.value)
                  }
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  className="text-sm"
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Preview */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-slate-900">Document Preview</h3>
          {hiddenCount > 0 && (
            <Badge variant="outline" className="text-slate-600">
              <EyeOff className="h-3 w-3 mr-1" />
              {hiddenCount} section{hiddenCount !== 1 ? "s" : ""} hidden
            </Badge>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
          <div className="prose prose-sm max-w-none">
            {sectionVisibility.map(({ section, visible }, index) => (
              <div key={section.id} className="mb-6">
                {visible ? (
                  <>
                    <h4 className="text-base font-semibold text-slate-900 mb-2">
                      {section.name}
                    </h4>
                    <div className="text-slate-700 whitespace-pre-wrap">
                      {mergeContent(section.content, sampleData)}
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                    <div className="flex items-center gap-2 text-slate-500">
                      <EyeOff className="h-4 w-4" />
                      <span className="text-sm font-medium">{section.name}</span>
                      <span className="text-xs">
                        (hidden - condition not met)
                      </span>
                    </div>
                  </div>
                )}
                {index < sectionVisibility.length - 1 && visible && (
                  <hr className="my-4 border-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
