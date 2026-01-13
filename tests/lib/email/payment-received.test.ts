import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import PaymentReceivedEmail from '@/lib/email/templates/payment-received'
import React from 'react'

describe('PaymentReceivedEmail', () => {
  const baseProps = {
    recipientName: 'John Doe',
    matterTitle: 'Contract Review - Acme Corp',
    invoiceAmount: '$1,500.00',
    paymentAmount: '$1,500.00',
    paymentDate: 'January 13, 2026',
    invoiceNumber: 'INV-12345',
    isClient: true,
  }

  describe('client version (isClient: true)', () => {
    it('renders with all props for client', async () => {
      const html = await render(
        React.createElement(PaymentReceivedEmail, baseProps)
      )

      expect(html).toContain('John Doe')
      expect(html).toContain('Contract Review - Acme Corp')
      expect(html).toContain('$1,500.00')
      expect(html).toContain('January 13, 2026')
      expect(html).toContain('INV-12345')
      expect(html).toContain('Payment Received')
      expect(html).toContain('Payment Confirmed')
    })

    it('shows thank you message for client', async () => {
      const html = await render(
        React.createElement(PaymentReceivedEmail, baseProps)
      )

      expect(html).toContain('Thank you!')
      expect(html).toContain('We have received your payment')
      expect(html).toContain('Your Legal Team')
    })

    it('mentions receipt for client', async () => {
      const html = await render(
        React.createElement(PaymentReceivedEmail, baseProps)
      )

      expect(html).toContain('receipt has been sent')
    })
  })

  describe('lawyer version (isClient: false)', () => {
    it('renders lawyer-specific content', async () => {
      const html = await render(
        React.createElement(PaymentReceivedEmail, {
          ...baseProps,
          recipientName: 'Jane Smith',
          isClient: false,
        })
      )

      expect(html).toContain('Jane Smith')
      expect(html).toContain('A payment has been received for matter')
      expect(html).toContain('MatterFlow')
    })

    it('mentions billing dashboard for lawyer', async () => {
      const html = await render(
        React.createElement(PaymentReceivedEmail, {
          ...baseProps,
          isClient: false,
        })
      )

      expect(html).toContain('billing dashboard')
      expect(html).toContain('invoice status has been automatically updated')
    })
  })

  describe('optional fields', () => {
    it('renders without invoice number', async () => {
      const propsWithoutInvoice = {
        ...baseProps,
        invoiceNumber: undefined,
      }

      const html = await render(
        React.createElement(PaymentReceivedEmail, propsWithoutInvoice)
      )

      expect(html).toContain('John Doe')
      expect(html).toContain('$1,500.00')
      expect(html).not.toContain('Invoice #:')
    })
  })

  it('uses BaseLayout for consistent branding', async () => {
    const html = await render(
      React.createElement(PaymentReceivedEmail, baseProps)
    )

    expect(html).toContain('MatterFlow')
    expect(html).toContain('Payment Received')
  })

  it('escapes HTML special characters to prevent XSS', async () => {
    const html = await render(
      React.createElement(PaymentReceivedEmail, {
        ...baseProps,
        recipientName: "<script>alert('xss')</script>",
        matterTitle: "Test matter with <b>markup</b>",
      })
    )

    // React Email escapes content - script tags should not be executable
    expect(html).not.toContain('<script>alert')
    // The escaped version should be present
    expect(html).toContain('&lt;script&gt;')
  })

  it('handles partial payment amounts', async () => {
    const html = await render(
      React.createElement(PaymentReceivedEmail, {
        ...baseProps,
        invoiceAmount: '$1,500.00',
        paymentAmount: '$500.00',
      })
    )

    expect(html).toContain('$1,500.00')
    expect(html).toContain('$500.00')
  })
})
