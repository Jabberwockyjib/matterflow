"use client";

import { useState } from "react";
import type {
  IntakeFormTemplate,
  IntakeFormField,
  IntakeFormFieldType,
} from "@/lib/intake/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DynamicFormRendererProps {
  template: IntakeFormTemplate;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onSaveDraft?: (values: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
  submitButtonText?: string;
}

export function DynamicFormRenderer({
  template,
  initialValues = {},
  onSubmit,
  onSaveDraft,
  readOnly = false,
  submitButtonText = "Submit",
}: DynamicFormRendererProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const shouldDisplayField = (field: IntakeFormField): boolean => {
    if (!field.conditionalDisplay) return true;

    const conditionValue = values[field.conditionalDisplay.field];
    const expectedValue = field.conditionalDisplay.value;

    if (Array.isArray(expectedValue)) {
      return expectedValue.includes(conditionValue);
    }

    return conditionValue === expectedValue;
  };

  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const section of template.sections) {
      for (const field of section.fields) {
        if (!shouldDisplayField(field)) continue;

        const value = values[field.id];

        // Required field validation
        if (field.required && !value) {
          newErrors[field.id] = `${field.label} is required`;
          continue;
        }

        if (!value) continue;

        // Type-specific validation
        switch (field.type) {
          case "email":
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              newErrors[field.id] = "Invalid email address";
            }
            break;
          case "phone":
            if (!/^\d{10,15}$/.test(value.replace(/\D/g, ""))) {
              newErrors[field.id] = "Invalid phone number";
            }
            break;
          case "number":
            const num = Number(value);
            if (isNaN(num)) {
              newErrors[field.id] = "Must be a number";
            } else if (
              field.validation?.min !== undefined &&
              num < field.validation.min
            ) {
              newErrors[field.id] = `Must be at least ${field.validation.min}`;
            } else if (
              field.validation?.max !== undefined &&
              num > field.validation.max
            ) {
              newErrors[field.id] = `Must be at most ${field.validation.max}`;
            }
            break;
          case "text":
          case "textarea":
            if (
              field.validation?.minLength &&
              value.length < field.validation.minLength
            ) {
              newErrors[
                field.id
              ] = `Must be at least ${field.validation.minLength} characters`;
            } else if (
              field.validation?.maxLength &&
              value.length > field.validation.maxLength
            ) {
              newErrors[
                field.id
              ] = `Must be at most ${field.validation.maxLength} characters`;
            }
            break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;

    setIsSavingDraft(true);
    try {
      await onSaveDraft(values);
    } catch (error) {
      console.error("Draft save error:", error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const renderField = (field: IntakeFormField) => {
    if (!shouldDisplayField(field)) return null;

    const value = values[field.id] || "";
    const error = errors[field.id];
    const commonProps = {
      id: field.id,
      disabled: readOnly,
      "aria-invalid": !!error,
      "aria-describedby": error ? `${field.id}-error` : undefined,
    };

    switch (field.type) {
      case "section_header":
        return (
          <div key={field.id} className="col-span-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {field.label}
            </h3>
          </div>
        );

      case "text":
      case "email":
      case "phone":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
            />
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2 col-span-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              {...commonProps}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
            />
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="number"
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
            />
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="date"
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
            />
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <select
              {...commonProps}
              value={value}
              onChange={(e) => handleChange(field.id, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select an option...</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    name={field.id}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                    disabled={readOnly}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={Array.isArray(value) && value.includes(option.value)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v) => v !== option.value);
                      handleChange(field.id, newValues);
                    }}
                    disabled={readOnly}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => handleChange(field.id, e.target.checked)}
                disabled={readOnly}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="text-sm text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      case "file":
        return (
          <div key={field.id} className="space-y-2 col-span-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {readOnly ? (
              <div className="space-y-2">
                {Array.isArray(value) && value.length > 0 ? (
                  value.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <span className="text-sm text-gray-700">
                        {file.fileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(file.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No files uploaded</p>
                )}
              </div>
            ) : (
              <>
                <Input
                  {...commonProps}
                  type="file"
                  multiple={field.fileConfig?.maxFiles !== 1}
                  accept={field.fileConfig?.acceptedTypes?.join(",")}
                  onChange={(e) => {
                    // File handling will be implemented in the parent component
                    // This is just a placeholder for now
                    console.log("Files selected:", e.target.files);
                  }}
                />
                {field.fileConfig && (
                  <p className="text-xs text-gray-500">
                    {field.fileConfig.acceptedTypes && (
                      <>Accepted types: {field.fileConfig.acceptedTypes.join(", ")}. </>
                    )}
                    {field.fileConfig.maxSize && (
                      <>Max size: {(field.fileConfig.maxSize / 1024 / 1024).toFixed(1)} MB. </>
                    )}
                    {field.fileConfig.maxFiles && field.fileConfig.maxFiles > 1 && (
                      <>Max files: {field.fileConfig.maxFiles}.</>
                    )}
                  </p>
                )}
              </>
            )}
            {error && (
              <p id={`${field.id}-error`} className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {template.sections.map((section) => (
        <div key={section.id} className="space-y-6">
          {section.title && (
            <div className="border-b border-gray-200 pb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {section.title}
              </h2>
              {section.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {section.description}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {section.fields.map((field) => renderField(field))}
          </div>
        </div>
      ))}

      {!readOnly && (
        <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
          <Button
            type="submit"
            disabled={isSubmitting || isSavingDraft}
            className="px-6"
          >
            {isSubmitting ? "Submitting..." : submitButtonText}
          </Button>

          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSavingDraft ? "Saving..." : "Save Draft"}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
