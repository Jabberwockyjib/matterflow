import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoRequestComposer } from '@/components/clients/info-request-composer';

describe('InfoRequestComposer', () => {
  it('renders with all sections (questions, message, deadline)', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <InfoRequestComposer
        intakeResponseId="123e4567-e89b-12d3-a456-426614174000"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    // Check for dialog title
    expect(screen.getByRole('heading', { name: /request additional information/i })).toBeInTheDocument();

    // Check for section labels
    expect(screen.getByLabelText(/questions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/personal message/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/response deadline/i)).toBeInTheDocument();

    // Check for buttons
    expect(screen.getByRole('button', { name: /send request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('requires at least one question', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <InfoRequestComposer
        intakeResponseId="123e4567-e89b-12d3-a456-426614174000"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    // Try to submit without questions
    const submitButton = screen.getByRole('button', { name: /send request/i });
    await user.click(submitButton);

    // Should not call onSubmit
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits with questions and message', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn();

    render(
      <InfoRequestComposer
        intakeResponseId="123e4567-e89b-12d3-a456-426614174000"
        onClose={onClose}
        onSubmit={onSubmit}
      />
    );

    // Add a question first
    const addQuestionButton = screen.getByRole('button', { name: /add question/i });
    await user.click(addQuestionButton);

    // Fill in the question text
    const questionInput = screen.getByPlaceholderText(/enter your question/i);
    await user.clear(questionInput);
    await user.type(questionInput, 'What is your preferred contact method?');

    // Fill in personal message
    const messageTextarea = screen.getByPlaceholderText(/add any additional context/i);
    await user.clear(messageTextarea);
    await user.type(messageTextarea, 'Please provide this information at your earliest convenience.');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send request/i });
    await user.click(submitButton);

    // Should call onSubmit with correct data
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          intakeResponseId: '123e4567-e89b-12d3-a456-426614174000',
          questions: expect.arrayContaining([
            expect.objectContaining({
              type: 'short_text',
              question: 'What is your preferred contact method?',
              required: false,
            }),
          ]),
          message: 'Please provide this information at your earliest convenience.',
          deadline: expect.any(String),
        })
      );
    });
  });
});
