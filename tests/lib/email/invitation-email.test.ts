import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import InvitationEmail from '@/lib/email/templates/invitation-email'
import React from 'react'

describe('InvitationEmail', () => {
  it('renders invitation email with all props', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "John Doe",
        matterType: "Contract Review",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
        firmName: "Smith Law",
        personalNotes: "Looking forward to reviewing your contract.",
      })
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('Contract Review')
    expect(html).toContain('intake/invite/ABC123')
    expect(html).toContain('Looking forward to reviewing your contract')
  })

  it('renders without optional personalNotes', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "John Doe",
        matterType: "Contract Review",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
      })
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('Complete Your Intake Form')
  })

  it('renders without optional firmName', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "John Doe",
        matterType: "Contract Review",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
      })
    )

    expect(html).toContain('MatterFlow')
  })
})
