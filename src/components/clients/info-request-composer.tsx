'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuestionBuilder } from '@/components/clients/question-builder';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/lib/toast';
import { infoRequestSchema, type InfoRequest } from '@/lib/validation/info-request-schemas';

// Internal question type used by QuestionBuilder
interface InternalQuestion {
  id: string;
  type: 'short_text' | 'long_text' | 'multiple_choice' | 'checkboxes' | 'file_upload' | 'date';
  text: string;
  helpText?: string;
  required: boolean;
  options?: string[];
}

interface InfoRequestComposerProps {
  intakeResponseId: string;
  onClose: () => void;
  onSubmit: (data: InfoRequest) => void | Promise<void>;
}

export function InfoRequestComposer({
  intakeResponseId,
  onClose,
  onSubmit,
}: InfoRequestComposerProps) {
  // State for questions (using QuestionBuilder's internal format)
  const [questions, setQuestions] = useState<InternalQuestion[]>([]);

  // Calculate default deadline (3 days from now)
  const getDefaultDeadline = () => {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const [deadline, setDeadline] = useState(getDefaultDeadline());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ message?: string }>({
    resolver: zodResolver(infoRequestSchema.omit({ intakeResponseId: true, questions: true, deadline: true })),
  });

  const onFormSubmit = async (formData: { message?: string }) => {
    try {
      // Validate that we have at least one question
      if (questions.length === 0) {
        showError('Please add at least one question');
        return;
      }

      // Convert internal questions to schema format
      const schemaQuestions = questions.map((q) => {
        const baseQuestion: any = {
          type: q.type,
          question: q.text,
          required: q.required,
        };

        // Add options for multiple choice and checkboxes
        if (q.type === 'multiple_choice' || q.type === 'checkboxes') {
          baseQuestion.options = q.options || [];
        }

        return baseQuestion;
      });

      // Validate the full request using Zod schema
      const requestData = infoRequestSchema.parse({
        intakeResponseId,
        questions: schemaQuestions,
        message: formData.message || undefined,
        deadline: new Date(`${deadline}T23:59:59`).toISOString(), // Convert to ISO datetime
      });

      await onSubmit(requestData);
      showSuccess('Information request sent successfully');
      onClose();
    } catch (error) {
      console.error('Failed to submit info request:', error);
      showError('Failed to send information request. Please check all fields and try again.');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Additional Information</DialogTitle>
          <DialogDescription>
            Create a structured request for additional information from your client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Questions Section */}
          <div>
            <Label htmlFor="questions-section" className="text-base font-semibold mb-3 block">Questions</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Add the questions you need answered. You can include text, multiple choice, file uploads, and more.
            </p>
            <div id="questions-section" aria-label="Questions">
              <QuestionBuilder questions={questions} onChange={setQuestions} />
            </div>
          </div>

          {/* Personal Message Section */}
          <div>
            <Label htmlFor="message" className="text-base font-semibold">
              Personal Message (Optional)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Add any additional context or instructions for your client.
            </p>
            <Textarea
              id="message"
              {...register('message')}
              placeholder="Add any additional context or instructions..."
              rows={4}
              className="resize-none"
            />
            {errors.message && (
              <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
            )}
          </div>

          {/* Response Deadline Section */}
          <div>
            <Label htmlFor="deadline" className="text-base font-semibold">
              Response Deadline
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              When do you need this information by?
            </p>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="max-w-xs"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || questions.length === 0}>
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
