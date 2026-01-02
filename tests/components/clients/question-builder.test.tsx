import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionBuilder } from '@/components/clients/question-builder';
import type { Question } from '@/lib/validation/info-request-schemas';

describe('QuestionBuilder', () => {
  it('renders empty state with add button', () => {
    const onChange = vi.fn();
    render(<QuestionBuilder questions={[]} onChange={onChange} />);

    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add question/i })).toBeInTheDocument();
  });

  it('adds new question when add button clicked', () => {
    const onChange = vi.fn();
    render(<QuestionBuilder questions={[]} onChange={onChange} />);

    const addButton = screen.getByRole('button', { name: /add question/i });
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: expect.any(String),
        type: 'short_text',
        question: '',
        required: false,
      }),
    ]);
  });

  it('renders existing questions', () => {
    const questions: Question[] = [
      { id: '1', type: 'short_text', question: 'What is your name?', required: true },
      { id: '2', type: 'long_text', question: 'Describe the issue', required: false },
    ];
    const onChange = vi.fn();

    render(<QuestionBuilder questions={questions} onChange={onChange} />);

    expect(screen.getByDisplayValue('What is your name?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Describe the issue')).toBeInTheDocument();
  });

  it('updates question text', () => {
    const questions: Question[] = [
      { id: '1', type: 'short_text', question: 'Old text', required: false },
    ];
    const onChange = vi.fn();

    render(<QuestionBuilder questions={questions} onChange={onChange} />);

    const input = screen.getByDisplayValue('Old text');
    fireEvent.change(input, { target: { value: 'New text' } });

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: '1',
        question: 'New text',
      }),
    ]);
  });

  it('removes question when delete button clicked', () => {
    const questions: Question[] = [
      { id: '1', type: 'short_text', question: 'Question 1', required: false },
      { id: '2', type: 'short_text', question: 'Question 2', required: false },
    ];
    const onChange = vi.fn();

    render(<QuestionBuilder questions={questions} onChange={onChange} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: '2' }),
    ]);
  });

  it('changes question type', () => {
    const questions: Question[] = [
      { id: '1', type: 'short_text', question: 'Question', required: false },
    ];
    const onChange = vi.fn();

    render(<QuestionBuilder questions={questions} onChange={onChange} />);

    // Find the select button and click it
    const selectButton = screen.getByRole('combobox');
    fireEvent.click(selectButton);

    // Find the multiple choice option and click it
    const multipleChoiceOption = screen.getByRole('option', { name: /multiple choice/i });
    fireEvent.click(multipleChoiceOption);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: '1',
        type: 'multiple_choice',
        options: [],
      }),
    ]);
  });

  it('shows options input for multiple choice questions', () => {
    const questions: Question[] = [
      {
        id: '1',
        type: 'multiple_choice',
        question: 'Choose one',
        required: false,
        options: ['Option 1', 'Option 2'],
      },
    ];
    const onChange = vi.fn();

    render(<QuestionBuilder questions={questions} onChange={onChange} />);

    expect(screen.getByDisplayValue('Option 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Option 2')).toBeInTheDocument();
  });

  it('toggles required field', () => {
    const questions: Question[] = [
      { id: '1', type: 'short_text', question: 'Question', required: false },
    ];
    const onChange = vi.fn();

    render(<QuestionBuilder questions={questions} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /required/i });
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: '1',
        required: true,
      }),
    ]);
  });
});
