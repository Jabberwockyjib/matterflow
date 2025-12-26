import { describe, it, expect } from 'vitest'
import { inviteUserSchema, passwordResetSchema, changePasswordSchema, forgotPasswordSchema } from '@/lib/validation/schemas'

describe('Auth Validation Schemas', () => {
  describe('inviteUserSchema', () => {
    it('accepts valid invitation data', () => {
      const valid = {
        email: 'user@example.com',
        fullName: 'John Doe',
        role: 'staff' as const,
      }
      expect(() => inviteUserSchema.parse(valid)).not.toThrow()
    })

    it('rejects invalid email', () => {
      const invalid = {
        email: 'not-an-email',
        fullName: 'John Doe',
        role: 'staff' as const,
      }
      expect(() => inviteUserSchema.parse(invalid)).toThrow()
    })

    it('rejects invalid role', () => {
      const invalid = {
        email: 'user@example.com',
        fullName: 'John Doe',
        role: 'invalid' as const,
      }
      expect(() => inviteUserSchema.parse(invalid)).toThrow()
    })

    it('rejects empty full name', () => {
      const invalid = {
        email: 'user@example.com',
        fullName: '',
        role: 'staff' as const,
      }
      expect(() => inviteUserSchema.parse(invalid)).toThrow()
    })
  })

  describe('passwordResetSchema', () => {
    it('accepts valid password', () => {
      const valid = {
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123',
      }
      expect(() => passwordResetSchema.parse(valid)).not.toThrow()
    })

    it('rejects password under 8 characters', () => {
      const invalid = {
        password: 'Short1',
        confirmPassword: 'Short1',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects password without uppercase', () => {
      const invalid = {
        password: 'securepass123',
        confirmPassword: 'securepass123',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects password without lowercase', () => {
      const invalid = {
        password: 'SECUREPASS123',
        confirmPassword: 'SECUREPASS123',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects password without number', () => {
      const invalid = {
        password: 'SecurePassword',
        confirmPassword: 'SecurePassword',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })

    it('rejects mismatched passwords', () => {
      const invalid = {
        password: 'SecurePass123',
        confirmPassword: 'DifferentPass123',
      }
      expect(() => passwordResetSchema.parse(invalid)).toThrow()
    })
  })

  describe('changePasswordSchema', () => {
    it('accepts valid password change data', () => {
      const valid = {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      }
      expect(() => changePasswordSchema.parse(valid)).not.toThrow()
    })

    it('rejects when new password same as current', () => {
      const invalid = {
        currentPassword: 'SamePass123',
        newPassword: 'SamePass123',
        confirmPassword: 'SamePass123',
      }
      expect(() => changePasswordSchema.parse(invalid)).toThrow()
    })
  })

  describe('forgotPasswordSchema', () => {
    it('accepts valid email', () => {
      const valid = {
        email: 'user@example.com',
      }
      expect(() => forgotPasswordSchema.parse(valid)).not.toThrow()
    })

    it('rejects invalid email', () => {
      const invalid = {
        email: 'not-an-email',
      }
      expect(() => forgotPasswordSchema.parse(invalid)).toThrow()
    })
  })
})
