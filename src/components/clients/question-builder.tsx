'use client';

import { useState } from 'react';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { Question } from '@/lib/validation/info-request-schemas';

interface QuestionBuilderProps {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}

interface QuestionCardProps {
  question: Question;
  index: number;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
}

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'checkboxes', label: 'Checkboxes' },
  { value: 'file_upload', label: 'File Upload' },
  { value: 'date', label: 'Date' },
] as const;

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const addOption = () => {
    onChange([...options, '']);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange(newOptions);
  };

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeOption(index)}
            aria-label="Remove option"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addOption}>
        <Plus className="h-4 w-4 mr-2" />
        Add Option
      </Button>
    </div>
  );
}

// Helper to get options from a question (handles discriminated union)
function getQuestionOptions(q: Question): string[] {
  if (q.type === 'multiple_choice' || q.type === 'checkboxes') {
    return q.options || [];
  }
  return [];
}

function QuestionCard({ question, index, onUpdate, onDelete }: QuestionCardProps) {
  const handleTypeChange = (newType: Question['type']) => {
    // Create the base question data
    const baseData = {
      id: question.id,
      question: question.question,
      required: question.required,
      helpText: question.helpText,
    };

    // Create the appropriate question type
    if (newType === 'multiple_choice') {
      onUpdate({ ...baseData, type: 'multiple_choice', options: getQuestionOptions(question) });
    } else if (newType === 'checkboxes') {
      onUpdate({ ...baseData, type: 'checkboxes', options: getQuestionOptions(question) });
    } else if (newType === 'short_text') {
      onUpdate({ ...baseData, type: 'short_text' });
    } else if (newType === 'long_text') {
      onUpdate({ ...baseData, type: 'long_text' });
    } else if (newType === 'file_upload') {
      onUpdate({ ...baseData, type: 'file_upload' });
    } else {
      onUpdate({ ...baseData, type: 'date' });
    }
  };

  const handleOptionsChange = (newOptions: string[]) => {
    if (question.type === 'multiple_choice') {
      onUpdate({ ...question, options: newOptions });
    } else if (question.type === 'checkboxes') {
      onUpdate({ ...question, options: newOptions });
    }
  };

  const showOptionsEditor = question.type === 'multiple_choice' || question.type === 'checkboxes';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-2 cursor-move text-muted-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Question {index + 1}
                </span>
                <Select value={question.type} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`question-${question.id}-text`}>Question Text</Label>
                <Input
                  id={`question-${question.id}-text`}
                  value={question.question}
                  onChange={(e) => onUpdate({ ...question, question: e.target.value })}
                  placeholder="Enter your question"
                />
              </div>

              <div>
                <Label htmlFor={`question-${question.id}-help`}>Help Text (optional)</Label>
                <Input
                  id={`question-${question.id}-help`}
                  value={question.helpText || ''}
                  onChange={(e) => onUpdate({ ...question, helpText: e.target.value })}
                  placeholder="Additional instructions or context"
                />
              </div>

              {showOptionsEditor && question.options && (
                <OptionsEditor options={question.options} onChange={handleOptionsChange} />
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id={`question-${question.id}-required`}
                  checked={question.required}
                  onChange={(e) => onUpdate({ ...question, required: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Required
                </span>
              </label>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="Delete question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: 'short_text',
      question: '',
      required: false,
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    onChange(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No questions yet</p>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          onUpdate={(updated) => updateQuestion(index, updated)}
          onDelete={() => deleteQuestion(index)}
        />
      ))}
      <Button onClick={addQuestion} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Question
      </Button>
    </div>
  );
}
