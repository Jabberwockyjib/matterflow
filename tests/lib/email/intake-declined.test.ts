import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import IntakeDeclinedEmail from '@/lib/email/templates/intake-declined'
import React from 'react'

describe('IntakeDeclinedEmail', () => {
  const baseProps = {
    clientName: 'John Doe',
    matterTitle: 'Contract Review - Acme Corp',
    lawyerName: 'Jane Smith, Esq.',
    reason: 'Conflict of interest with existing client',
  }

  it('renders with all required props', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).toContain('John Doe')
    expect(html).toContain('Contract Review - Acme Corp')
    expect(html).toContain('Jane Smith, Esq.')
    expect(html).toContain('Conflict of interest with existing client')
    expect(html).toContain('Matter Update')
  })

  it('shows decline reason prominently', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).toContain('Reason:')
    expect(html).toContain('unable to proceed with this matter')
  })

  it('renders with optional notes', async () => {
    const propsWithNotes = {
      ...baseProps,
      notes: 'I recommend reaching out to the State Bar referral service for assistance.',
    }

    const html = await render(
      React.createElement(IntakeDeclinedEmail, propsWithNotes)
    )

    expect(html).toContain('Additional Notes from')
    expect(html).toContain('Jane Smith, Esq.')
    expect(html).toContain('State Bar referral service')
  })

  it('renders without optional notes', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).not.toContain('Additional Notes')
    expect(html).toContain('John Doe')
    expect(html).toContain('Conflict of interest')
  })

  it('thanks the client for their submission', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).toContain('Thank you for submitting your intake form')
    expect(html).toContain('appreciate your understanding')
  })

  it('invites follow-up questions', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).toContain('questions about this decision')
    expect(html).toContain('discuss further')
  })

  it('signs off with lawyer name', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).toContain('Sincerely')
    expect(html).toContain('Jane Smith, Esq.')
  })

  it('uses BaseLayout for consistent branding', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, baseProps)
    )

    expect(html).toContain('MatterFlow')
  })

  it('escapes HTML special characters to prevent XSS', async () => {
    const html = await render(
      React.createElement(IntakeDeclinedEmail, {
        ...baseProps,
        clientName: "<script>alert('xss')</script>",
        reason: "Test reason with <b>markup</b>",
      })
    )

    // React Email escapes content - script tags should not be executable
    expect(html).not.toContain('<script>alert')
    // The escaped version should be present
    expect(html).toContain('&lt;script&gt;')
  })

  it('handles various decline reasons', async () => {
    const reasons = [
      'Outside our practice area',
      'Insufficient documentation provided',
      'Matter complexity exceeds current capacity',
      'Statute of limitations has expired',
    ]

    for (const reason of reasons) {
      const html = await render(
        React.createElement(IntakeDeclinedEmail, {
          ...baseProps,
          reason,
        })
      )

      expect(html).toContain(reason)
    }
  })

  it('handles long notes gracefully', async () => {
    const longNotes = 'This is a very detailed explanation. '.repeat(20)

    const html = await render(
      React.createElement(IntakeDeclinedEmail, {
        ...baseProps,
        notes: longNotes,
      })
    )

    expect(html).toContain('This is a very detailed explanation')
    expect(html).toContain('Additional Notes')
  })
})
