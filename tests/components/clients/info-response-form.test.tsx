import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InfoResponseForm } from '@/components/clients/info-response-form';

describe('InfoResponseForm', () => {
  const mockInfoRequest = {
    id: '123',
    intakeResponseId: 'intake-123',
    requestedBy: {
      userId: 'user-1',
      fullName: 'Jane Lawyer',
      email: 'jane@law.com',
    },
    questions: [
      {
        id: 'q1',
        question_text: 'What is your full name?',
        question_type: 'short_text' as const,
        required: true,
        order_index: 0,
      },
      {
        id: 'q2',
        question_text: 'Tell us about your situation',
        question_type: 'long_text' as const,
        required: false,
        order_index: 1,
      },
      {
        id: 'q3',
        question_text: 'What is your preferred contact method?',
        question_type: 'multiple_choice' as const,
        required: true,
        options: ['Email', 'Phone', 'Text'],
        order_index: 2,
      },
    ],
    message: 'Hi John, please answer these questions.',
    documents: null,
    responseDeadline: '2025-12-31',
    status: 'pending' as const,
    requestedAt: '2025-01-01',
    respondedAt: null,
    responses: null,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    intakeResponse: null,
  };

  it('renders personal message from lawyer', () => {
    const mockSubmit = vi.fn();
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={mockSubmit} />);

    expect(screen.getByText('Hi John, please answer these questions.')).toBeInTheDocument();
  });

  it('renders all questions', () => {
    const mockSubmit = vi.fn();
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={mockSubmit} />);

    expect(screen.getByText('What is your full name?')).toBeInTheDocument();
    expect(screen.getByText('Tell us about your situation')).toBeInTheDocument();
    expect(screen.getByText('What is your preferred contact method?')).toBeInTheDocument();
  });

  it('shows required indicator for required questions', () => {
    const mockSubmit = vi.fn();
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={mockSubmit} />);

    const requiredIndicators = screen.getAllByText('*');
    expect(requiredIndicators.length).toBeGreaterThanOrEqual(2); // At least 2 required questions
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={mockSubmit} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits responses when valid', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    render(<InfoResponseForm infoRequest={mockInfoRequest} onSubmit={mockSubmit} />);

    // Fill in required fields
    const nameInput = screen.getByLabelText(/what is your full name/i);
    await user.type(nameInput, 'John Doe');

    // Select radio option
    const emailOption = screen.getByLabelText('Email');
    await user.click(emailOption);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        q1: 'John Doe',
        q2: '',
        q3: 'Email',
      });
    });
  });
});
