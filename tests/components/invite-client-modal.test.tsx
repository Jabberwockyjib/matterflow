import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InviteClientModal } from '@/components/clients/invite-client-modal'

// Mock server action
vi.mock('@/lib/data/actions', () => ({
  inviteClient: vi.fn().mockResolvedValue({
    ok: true,
    inviteCode: 'ABC123',
    inviteLink: 'http://localhost:3000/intake/invite/ABC123',
  }),
}))

describe('InviteClientModal', () => {
  it('opens modal on button click', async () => {
    const user = userEvent.setup()
    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))

    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    // HTML5 validation will prevent form submission
    // Check that required fields exist with required attribute
    const clientNameInput = screen.getByLabelText(/client name/i)
    const emailInput = screen.getByLabelText(/email address/i)

    expect(clientNameInput).toHaveAttribute('required')
    expect(emailInput).toHaveAttribute('required')
  })

  it('submits form successfully', async () => {
    const user = userEvent.setup()
    const { inviteClient } = await import('@/lib/data/actions')

    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.type(screen.getByLabelText(/client name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(inviteClient).toHaveBeenCalled()
    })
  })

  it('shows success state with invite link after submission', async () => {
    const user = userEvent.setup()
    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.type(screen.getByLabelText(/client name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/invitation sent/i)).toBeInTheDocument()
    })

    // Check that the invite link is displayed
    expect(screen.getByDisplayValue('http://localhost:3000/intake/invite/ABC123')).toBeInTheDocument()
  })

  it('displays error message on failure', async () => {
    const user = userEvent.setup()
    const { inviteClient } = await import('@/lib/data/actions')

    // Mock error response
    vi.mocked(inviteClient).mockResolvedValueOnce({
      ok: false,
      error: 'Failed to send invitation',
    })

    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.type(screen.getByLabelText(/client name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(screen.getByText('Failed to send invitation')).toBeInTheDocument()
    })
  })

  it('enforces max length on personal notes', async () => {
    const user = userEvent.setup()
    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))

    const notesTextarea = screen.getByLabelText(/personal notes/i)
    expect(notesTextarea).toHaveAttribute('maxLength', '500')
  })

  it('copies invite link to clipboard', async () => {
    const user = userEvent.setup()

    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
    })

    render(<InviteClientModal />)

    await user.click(screen.getByText('Invite New Client'))
    await user.type(screen.getByLabelText(/client name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com')
    await user.click(screen.getByRole('button', { name: /send invitation/i }))

    await waitFor(() => {
      expect(screen.getByText(/invitation sent/i)).toBeInTheDocument()
    })

    // Click copy button
    const copyButton = screen.getByTitle('Copy link')
    await user.click(copyButton)

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:3000/intake/invite/ABC123')
    })
  })
})
