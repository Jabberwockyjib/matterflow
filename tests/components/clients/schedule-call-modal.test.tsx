import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduleCallModal } from '@/components/clients/schedule-call-modal';

describe('ScheduleCallModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSubmit.mockClear();
  });

  const getDefaultProps = () => ({
    intakeResponseId: 'intake-123',
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  });

  it('renders all form fields (date/time, duration, meeting type)', () => {
    render(<ScheduleCallModal {...getDefaultProps()} />);

    // Check for date/time field
    expect(screen.getByLabelText(/date & time/i)).toBeInTheDocument();

    // Check for duration field
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();

    // Check for meeting type field
    expect(screen.getByLabelText(/meeting type/i)).toBeInTheDocument();

    // Check for notes field
    expect(screen.getByLabelText(/notes to client/i)).toBeInTheDocument();

    // Check for submit button
    expect(screen.getByRole('button', { name: /send calendar invite/i })).toBeInTheDocument();
  });

  it('shows meeting link field for video calls', async () => {
    const user = userEvent.setup();
    render(<ScheduleCallModal {...getDefaultProps()} />);

    // Meeting link should not be visible initially (default is phone)
    expect(screen.queryByLabelText(/meeting link/i)).not.toBeInTheDocument();

    // Click the meeting type select trigger
    const meetingTypeButton = screen.getByRole('combobox', { name: /meeting type/i });
    await user.click(meetingTypeButton);

    // Wait for dropdown to appear and find the option by role
    const videoOption = await screen.findByRole('option', { name: /video call/i });
    await user.click(videoOption);

    // Meeting link field should now be visible
    await waitFor(() => {
      expect(screen.getByLabelText(/meeting link/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('submits call details', async () => {
    const user = userEvent.setup();
    render(<ScheduleCallModal {...getDefaultProps()} />);

    // Fill in date/time field
    const dateTimeInput = screen.getByLabelText(/date & time/i);
    await user.type(dateTimeInput, '2025-01-15T10:00');

    // Fill in notes (duration and meeting type have defaults)
    const notesTextarea = screen.getByLabelText(/notes to client/i);
    await user.type(notesTextarea, 'Looking forward to discussing your case');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send calendar invite/i });
    await user.click(submitButton);

    // Verify onSubmit was called with correct data (using defaults: 60 minutes, phone)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        intakeResponseId: 'intake-123',
        dateTime: '2025-01-15T10:00',
        duration: 60,
        meetingType: 'phone',
        meetingLink: undefined,
        notes: 'Looking forward to discussing your case',
      });
    }, { timeout: 2000 });
  });
});
