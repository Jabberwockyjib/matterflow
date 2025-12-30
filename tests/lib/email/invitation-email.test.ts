import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import InvitationEmail from '@/lib/email/templates/invitation-email'
import React from 'react'

describe('InvitationEmail', () => {
  it('renders with all props', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "John Doe",
        inviteCode: "ABC123",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
        message: "Looking forward to reviewing your contract.",
      })
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('ABC123')
    expect(html).toContain('intake/invite/ABC123')
    expect(html).toContain('Jane Smith')
    expect(html).toContain('Looking forward to reviewing your contract')
    expect(html).toContain('MatterFlow')
  })

  it('renders without optional message', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "John Doe",
        inviteCode: "ABC123",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
      })
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('ABC123')
    expect(html).toContain('Complete Your Intake Form')
    expect(html).toContain('MatterFlow')
  })

  it('uses BaseLayout for consistent branding', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "John Doe",
        inviteCode: "ABC123",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
      })
    )

    // BaseLayout adds the MatterFlow branding and structure
    expect(html).toContain('MatterFlow')
    expect(html).toContain('Complete Your Intake Form')
  })

  it('escapes HTML special characters to prevent XSS', async () => {
    const html = await render(
      React.createElement(InvitationEmail, {
        clientName: "<script>alert('xss')</script>",
        inviteCode: "ABC123",
        inviteLink: "https://app.example.com/intake/invite/ABC123",
        lawyerName: "Jane Smith",
      })
    )

    // React Email should escape HTML special characters by default
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })
})
