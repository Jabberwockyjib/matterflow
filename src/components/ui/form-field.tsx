import * as React from "react";
import { cn } from "@/lib/utils";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

/**
 * Base props shared by all form field types
 */
interface FormFieldBaseProps {
  /** Field label displayed above the input */
  label?: string;
  /** Error object from React Hook Form's formState.errors */
  error?: FieldError;
  /** Additional helper text displayed below the field (when no error) */
  helperText?: string;
  /** Whether the field is required (shows asterisk on label) */
  required?: boolean;
  /** Container class name */
  containerClassName?: string;
}

/**
 * Props for input fields (text, email, password, number, etc.)
 */
export interface FormInputProps
  extends FormFieldBaseProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "date";
  /** React Hook Form register return value */
  registration?: UseFormRegisterReturn;
  className?: string;
}

/**
 * Props for select fields
 */
export interface FormSelectProps
  extends FormFieldBaseProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  /** React Hook Form register return value */
  registration?: UseFormRegisterReturn;
  /** Options for the select field */
  options: Array<{ value: string; label: string }>;
  /** Placeholder option text (displays as disabled first option) */
  placeholder?: string;
  className?: string;
}

/**
 * Props for textarea fields
 */
export interface FormTextareaProps
  extends FormFieldBaseProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  /** React Hook Form register return value */
  registration?: UseFormRegisterReturn;
  className?: string;
}

/**
 * Label component for form fields
 */
const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500",
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="ml-0.5 text-red-500">*</span>}
  </label>
));
FormLabel.displayName = "FormLabel";

/**
 * Error message component for form fields
 */
const FormError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    role="alert"
    className={cn("mt-1 text-xs text-red-500", className)}
    {...props}
  >
    {children}
  </p>
));
FormError.displayName = "FormError";

/**
 * Helper text component for form fields
 */
const FormHelperText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mt-1 text-xs text-slate-500", className)}
    {...props}
  >
    {children}
  </p>
));
FormHelperText.displayName = "FormHelperText";

/**
 * Input styles following the existing codebase patterns
 */
const inputBaseStyles =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

const inputErrorStyles =
  "border-red-300 focus:border-red-400 focus:ring-red-200";

/**
 * FormInput - Text input field with built-in error display
 *
 * @example
 * ```tsx
 * <FormInput
 *   label="Email"
 *   type="email"
 *   placeholder="you@example.com"
 *   registration={register("email")}
 *   error={errors.email}
 *   required
 * />
 * ```
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      containerClassName,
      className,
      registration,
      type = "text",
      ...props
    },
    ref
  ) => {
    const inputId = React.useId();

    return (
      <div className={cn("text-sm text-slate-700", containerClassName)}>
        {label && (
          <FormLabel htmlFor={inputId} required={required}>
            {label}
          </FormLabel>
        )}
        <input
          id={inputId}
          ref={ref}
          type={type}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(inputBaseStyles, error && inputErrorStyles, className)}
          {...registration}
          {...props}
        />
        {error?.message && (
          <FormError id={`${inputId}-error`}>{error.message}</FormError>
        )}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);
FormInput.displayName = "FormInput";

/**
 * FormSelect - Select field with built-in error display
 *
 * @example
 * ```tsx
 * <FormSelect
 *   label="Status"
 *   options={[
 *     { value: "active", label: "Active" },
 *     { value: "inactive", label: "Inactive" },
 *   ]}
 *   registration={register("status")}
 *   error={errors.status}
 *   required
 * />
 * ```
 */
export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      containerClassName,
      className,
      registration,
      options,
      placeholder,
      ...props
    },
    ref
  ) => {
    const selectId = React.useId();

    return (
      <div className={cn("text-sm text-slate-700", containerClassName)}>
        {label && (
          <FormLabel htmlFor={selectId} required={required}>
            {label}
          </FormLabel>
        )}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={cn(inputBaseStyles, error && inputErrorStyles, className)}
          {...registration}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error?.message && (
          <FormError id={`${selectId}-error`}>{error.message}</FormError>
        )}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);
FormSelect.displayName = "FormSelect";

/**
 * FormTextarea - Textarea field with built-in error display
 *
 * @example
 * ```tsx
 * <FormTextarea
 *   label="Description"
 *   placeholder="Enter a description..."
 *   registration={register("description")}
 *   error={errors.description}
 *   rows={4}
 * />
 * ```
 */
export const FormTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FormTextareaProps
>(
  (
    {
      label,
      error,
      helperText,
      required,
      containerClassName,
      className,
      registration,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaId = React.useId();

    return (
      <div className={cn("text-sm text-slate-700", containerClassName)}>
        {label && (
          <FormLabel htmlFor={textareaId} required={required}>
            {label}
          </FormLabel>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={cn(
            inputBaseStyles,
            "resize-vertical min-h-[80px]",
            error && inputErrorStyles,
            className
          )}
          {...registration}
          {...props}
        />
        {error?.message && (
          <FormError id={`${textareaId}-error`}>{error.message}</FormError>
        )}
        {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
      </div>
    );
  }
);
FormTextarea.displayName = "FormTextarea";

// Export individual helper components for custom use cases
export { FormLabel, FormError, FormHelperText };
