import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { renderWithUser } from '../setup/test-utils'
import { mockUser } from '../setup/mocks/fixtures'
import SignInPage from '@/app/auth/sign-in/page'
import { AuthWidget } from '@/components/auth-widget'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'redirect') return null
      return null
    }),
  })),
}))

// Mock the supabase client module
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
}))

// Mock window.location
const mockAssign = vi.fn()
const mockReload = vi.fn()

describe('Authentication Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        assign: mockAssign,
        reload: mockReload,
        href: 'http://localhost:3000',
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('SignInPage', () => {
    it('renders login form with email and password inputs', async () => {
      const { user } = renderWithUser(<SignInPage />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it.skip('disables submit button when email or password is empty', async () => {
      renderWithUser(<SignInPage />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when email and password are filled', async () => {
      const { user } = renderWithUser(<SignInPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).not.toBeDisabled()
    })

    it('calls signInWithPassword when form is submitted', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { session: { user: { id: '123' } } },
        error: null
      })

      const { user } = renderWithUser(<SignInPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        })
      })
    })

    it.skip('displays error message when authentication fails', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid login credentials' },
      })

      const { user } = renderWithUser(<SignInPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials')
      })
    })

    it.skip('redirects to home page on successful login', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null })

      const { user } = renderWithUser(<SignInPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith('/')
      })
    })

    it.skip('redirects to custom redirect URL on successful login', async () => {
      const { useSearchParams } = await import('next/navigation')
      ;(useSearchParams as Mock).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'redirect') return '/dashboard'
          return null
        }),
      })

      mockSignInWithPassword.mockResolvedValueOnce({ error: null })

      const { user } = renderWithUser(<SignInPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockAssign).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('AuthWidget', () => {
    it('displays sign in link when no email is provided', () => {
      renderWithUser(<AuthWidget />)

      expect(screen.getByText(/sign in via/i)).toBeInTheDocument()
    })

    it('displays email and sign out button when email is provided', () => {
      renderWithUser(<AuthWidget email="test@example.com" />)

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    })

    it('calls signOut when sign out button is clicked', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null })

      const { user } = renderWithUser(<AuthWidget email="test@example.com" />)

      await user.click(screen.getByRole('button', { name: /sign out/i }))

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })
    })

    it('reloads page after successful sign out', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null })

      const { user } = renderWithUser(<AuthWidget email="test@example.com" />)

      await user.click(screen.getByRole('button', { name: /sign out/i }))

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled()
      })
    })

    it('displays error message when sign out fails', async () => {
      mockSignOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      })

      const { user } = renderWithUser(<AuthWidget email="test@example.com" />)

      await user.click(screen.getByRole('button', { name: /sign out/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Sign out failed')
      })
    })
  })

  describe('Protected Route Access', () => {
    it('unauthenticated users see sign in prompt', () => {
      renderWithUser(<AuthWidget email={null} />)

      expect(screen.getByText(/sign in via/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument()
    })

    it('authenticated users see their email and sign out option', () => {
      const testUser = mockUser({ email: 'authenticated@example.com' })

      renderWithUser(<AuthWidget email={testUser.email} />)

      expect(screen.getByText(testUser.email)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    })
  })
})
