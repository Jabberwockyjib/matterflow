import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineBoard } from '@/components/clients/pipeline-board'

describe('PipelineBoard', () => {
  it('renders three columns', () => {
    render(
      <PipelineBoard
        invitations={{ pending: [], completed: [], expired: [], source: 'mock' }}
        intakes={{ pending: [], underReview: [], source: 'mock' }}
      />
    )

    expect(screen.getByText('Invited')).toBeInTheDocument()
    expect(screen.getByText('Intake Submitted')).toBeInTheDocument()
    expect(screen.getByText('Under Review')).toBeInTheDocument()
  })

  it('displays invitation cards in Invited column', () => {
    const mockInvitations = {
      pending: [
        {
          id: '1',
          inviteCode: 'ABC123',
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
          matterType: 'Contract Review',
          notes: null,
          status: 'pending',
          invitedAt: '2025-12-28T10:00:00Z',
          expiresAt: '2026-01-04T10:00:00Z',
          daysAgo: 2,
        },
      ],
      completed: [],
      expired: [],
      source: 'mock' as const,
    }

    render(
      <PipelineBoard
        invitations={mockInvitations}
        intakes={{ pending: [], underReview: [], source: 'mock' }}
      />
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
