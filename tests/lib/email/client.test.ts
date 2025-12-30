import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendInvitationEmail } from '@/lib/email/client'

// Mock Resend
vi.mock('resend', () => {
  const mockSend = vi.fn(() => Promise.resolve({ data: { id: 'test-email-id' }, error: null }))

  return {
    Resend: class {
      emails = {
        send: mockSend,
      }
    },
  }
})

describe('sendInvitationEmail - Input Validation', () => {
  const validParams = {
    to: 'client@example.com',
    clientName: 'John Doe',
    inviteCode: 'ABC123',
    inviteLink: 'https://app.example.com/intake/invite/ABC123',
    lawyerName: 'Jane Smith',
    message: 'Welcome!',
  }

  describe('Required field validation', () => {
    it('rejects missing recipient email', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        to: '',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Recipient email is required')
    })

    it('rejects whitespace-only recipient email', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        to: '   ',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Recipient email is required')
    })

    it('rejects missing client name', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        clientName: '',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Client name is required')
    })

    it('rejects missing invite code', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        inviteCode: '',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invite code is required')
    })

    it('rejects missing invite link', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        inviteLink: '',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invite link is required')
    })

    it('rejects missing lawyer name', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        lawyerName: '',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Lawyer name is required')
    })
  })

  describe('Email format validation', () => {
    it('rejects invalid email without @', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        to: 'notanemail',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid email address format')
    })

    it('rejects invalid email without domain', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        to: 'test@',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid email address format')
    })

    it('rejects invalid email without TLD', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        to: 'test@example',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid email address format')
    })

    it('accepts valid email format', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        to: 'valid@example.com',
      })

      expect(result.ok).toBe(true)
    })
  })

  describe('URL validation', () => {
    it('rejects invite link without protocol', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        inviteLink: 'app.example.com/invite/ABC123',
      })

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invite link must be a valid URL')
    })

    it('accepts http:// protocol', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        inviteLink: 'http://localhost:3000/invite/ABC123',
      })

      expect(result.ok).toBe(true)
    })

    it('accepts https:// protocol', async () => {
      const result = await sendInvitationEmail({
        ...validParams,
        inviteLink: 'https://app.example.com/invite/ABC123',
      })

      expect(result.ok).toBe(true)
    })
  })

  describe('Optional fields', () => {
    it('accepts valid params without optional message', async () => {
      const { message, ...requiredParams } = validParams
      const result = await sendInvitationEmail(requiredParams)

      expect(result.ok).toBe(true)
    })
  })
})
