"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type {
  TemplateSection,
  TemplateField,
  ConditionRules,
  ConditionOperator,
  SimpleCondition,
  CompoundCondition,
} from "@/lib/document-templates/types";

interface ConditionBuilderProps {
  sections: TemplateSection[];
  fields: TemplateField[];
  onUpdate: (sectionId: string, updates: { isConditional?: boolean; conditionRules?: ConditionRules | null }) => void;
}

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
];

interface SectionConditionEditorProps {
  section: TemplateSection;
  fields: TemplateField[];
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: { isConditional?: boolean; conditionRules?: ConditionRules | null }) => void;
}

function SectionConditionEditor({
  section,
  fields,
  expanded,
  onToggleExpand,
  onUpdate,
}: SectionConditionEditorProps) {
  // Parse existing conditions
  const getConditions = (): SimpleCondition[] => {
    if (!section.conditionRules) return [];

    // Check if it's a compound condition
    const rules = section.conditionRules as CompoundCondition;
    if (rules.all) return rules.all;
    if (rules.any) return rules.any;

    // Single condition
    return [section.conditionRules as SimpleCondition];
  };

  const getMatchType = (): "all" | "any" => {
    if (!section.conditionRules) return "all";
    const rules = section.conditionRules as CompoundCondition;
    return rules.any ? "any" : "all";
  };

  const [conditions, setConditions] = useState<SimpleCondition[]>(getConditions());
  const [matchType, setMatchType] = useState<"all" | "any">(getMatchType());

  const handleToggleConditional = (checked: boolean) => {
    onUpdate({
      isConditional: checked,
      conditionRules: checked && conditions.length > 0
        ? buildConditionRules(conditions, matchType)
        : null,
    });
  };

  const buildConditionRules = (
    conds: SimpleCondition[],
    match: "all" | "any"
  ): ConditionRules | null => {
    if (conds.length === 0) return null;
    if (conds.length === 1) return conds[0];
    return match === "all" ? { all: conds } : { any: conds };
  };

  const addCondition = () => {
    const newConditions = [
      ...conditions,
      { field: fields[0]?.name || "", operator: "equals" as ConditionOperator, value: "" },
    ];
    setConditions(newConditions);
    onUpdate({ conditionRules: buildConditionRules(newConditions, matchType) });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onUpdate({
      conditionRules: buildConditionRules(newConditions, matchType),
      isConditional: newConditions.length > 0 ? section.isConditional : false,
    });
  };

  const updateCondition = (index: number, updates: Partial<SimpleCondition>) => {
    const newConditions = conditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    );
    setConditions(newConditions);
    onUpdate({ conditionRules: buildConditionRules(newConditions, matchType) });
  };

  const handleMatchTypeChange = (type: "all" | "any") => {
    setMatchType(type);
    onUpdate({ conditionRules: buildConditionRules(conditions, type) });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
          <span className="font-medium text-slate-900">{section.name}</span>
          {section.isConditional && (
            <Badge variant="default" className="text-xs">
              {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Label htmlFor={`conditional-${section.id}`} className="text-sm text-slate-600">
            Conditional
          </Label>
          <Switch
            id={`conditional-${section.id}`}
            checked={section.isConditional}
            onCheckedChange={handleToggleConditional}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && section.isConditional && (
        <div className="p-4 border-t border-slate-200 space-y-4">
          <p className="text-sm text-slate-600">
            Show this section when:
          </p>

          {/* Conditions List */}
          <div className="space-y-3">
            {conditions.map((condition, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
              >
                {/* Field Select */}
                <Select
                  value={condition.field}
                  onValueChange={(value) => updateCondition(index, { field: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.id} value={field.name}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator Select */}
                <Select
                  value={condition.operator}
                  onValueChange={(value: ConditionOperator) =>
                    updateCondition(index, { operator: value })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Value Input (hidden for is_empty/is_not_empty) */}
                {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                  <Input
                    value={String(condition.value || "")}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Value"
                    className="w-40"
                  />
                )}

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCondition(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add Condition Button */}
          <Button variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-2" />
            Add condition
          </Button>

          {/* Match Type (only show if multiple conditions) */}
          {conditions.length > 1 && (
            <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
              <span className="text-sm text-slate-600">Match:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`match-${section.id}`}
                  checked={matchType === "all"}
                  onChange={() => handleMatchTypeChange("all")}
                  className="w-4 h-4 text-accent"
                />
                <span className="text-sm">All conditions</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`match-${section.id}`}
                  checked={matchType === "any"}
                  onChange={() => handleMatchTypeChange("any")}
                  className="w-4 h-4 text-accent"
                />
                <span className="text-sm">Any condition</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Message when expanded but not conditional */}
      {expanded && !section.isConditional && (
        <div className="p-4 border-t border-slate-200 text-sm text-slate-500">
          Enable &quot;Conditional&quot; to configure when this section appears.
        </div>
      )}
    </div>
  );
}

export function ConditionBuilder({ sections, fields, onUpdate }: ConditionBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <p className="text-slate-600">No sections defined yet.</p>
        <p className="text-sm text-slate-500 mt-2">
          Add sections first to configure conditional logic.
        </p>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
        <p className="text-slate-600">No fields available for conditions.</p>
        <p className="text-sm text-slate-500 mt-2">
          Map fields in the Fields tab first to use them in conditions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <SectionConditionEditor
          key={section.id}
          section={section}
          fields={fields}
          expanded={expandedId === section.id}
          onToggleExpand={() =>
            setExpandedId(expandedId === section.id ? null : section.id)
          }
          onUpdate={(updates) => onUpdate(section.id, updates)}
        />
      ))}
    </div>
  );
}
