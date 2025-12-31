"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { InfoRequestDetail } from "@/lib/data/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface InfoResponseFormProps {
  infoRequest: InfoRequestDetail;
  onSubmit: (responses: Record<string, any>) => void;
}

type QuestionType = {
  id: string;
  question_text: string;
  question_type: "short_text" | "long_text" | "multiple_choice" | "checkboxes" | "date" | "file_upload";
  required: boolean;
  options?: string[];
  order_index: number;
};

interface QuestionFieldProps {
  question: QuestionType;
  register: any;
  setValue: any;
  watch: any;
  errors: any;
}

function QuestionField({ question, register, setValue, watch, errors }: QuestionFieldProps) {
  const fieldId = question.id;
  const value = watch(fieldId);

  const renderInput = () => {
    switch (question.question_type) {
      case "short_text":
        return (
          <Input
            id={fieldId}
            {...register(fieldId, {
              required: question.required ? "This field is required" : false,
            })}
            aria-label={question.question_text}
          />
        );

      case "long_text":
        return (
          <Textarea
            id={fieldId}
            {...register(fieldId, {
              required: question.required ? "This field is required" : false,
            })}
            rows={4}
            aria-label={question.question_text}
          />
        );

      case "multiple_choice":
        return (
          <RadioGroup
            value={value || ""}
            onValueChange={(val) => setValue(fieldId, val)}
          >
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${fieldId}-${option}`} />
                <Label htmlFor={`${fieldId}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkboxes":
        const currentValues = value || [];
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldId}-${option}`}
                  checked={currentValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...currentValues, option]
                      : currentValues.filter((v: string) => v !== option);
                    setValue(fieldId, newValues);
                  }}
                />
                <Label htmlFor={`${fieldId}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case "date":
        return (
          <Input
            id={fieldId}
            type="date"
            {...register(fieldId, {
              required: question.required ? "This field is required" : false,
            })}
            aria-label={question.question_text}
          />
        );

      case "file_upload":
        return (
          <Input
            id={fieldId}
            type="file"
            {...register(fieldId, {
              required: question.required ? "This field is required" : false,
            })}
            aria-label={question.question_text}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {question.question_text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderInput()}
      {errors[fieldId] && (
        <p className="text-sm text-red-500">{errors[fieldId].message}</p>
      )}
    </div>
  );
}

export function InfoResponseForm({ infoRequest, onSubmit }: InfoResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse questions from JSONB format
  const questions: QuestionType[] = Array.isArray(infoRequest.questions)
    ? infoRequest.questions
    : Object.values(infoRequest.questions || {});

  // Sort questions by order_index
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: sortedQuestions.reduce((acc, q) => {
      acc[q.id] = q.question_type === "checkboxes" ? [] : "";
      return acc;
    }, {} as Record<string, any>),
  });

  const onFormSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Personal message card */}
      {infoRequest.message && (
        <Card>
          <CardHeader>
            <CardTitle>Message from your lawyer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {infoRequest.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Response deadline */}
      {infoRequest.responseDeadline && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm">
              <strong>Response needed by:</strong>{" "}
              {format(new Date(infoRequest.responseDeadline), "MMMM d, yyyy")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Please answer the following questions. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sortedQuestions.map((question) => (
            <QuestionField
              key={question.id}
              question={question}
              register={register}
              setValue={setValue}
              watch={watch}
              errors={errors}
            />
          ))}
        </CardContent>
      </Card>

      {/* Submit button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Response"}
        </Button>
      </div>
    </form>
  );
}
