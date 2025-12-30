import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteUser, getAllUsers, updateUserRole, deactivateUser, reactivateUser, adminResetPassword, requestPasswordReset, resetPassword, changePassword } from '@/lib/data/actions'
import * as auth from '@/lib/auth/server'
import * as server from '@/lib/supabase/server'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock email client
vi.mock('@/lib/email/client', () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-id' }),
    },
  },
  FROM_EMAIL: 'test@example.com',
}))

// Mock @react-email/components
vi.mock('@react-email/components', () => ({
  render: vi.fn().mockReturnValue('<html>mock email</html>'),
  Html: ({ children }: any) => children,
  Head: () => null,
  Preview: () => null,
  Body: ({ children }: any) => children,
  Container: ({ children }: any) => children,
  Section: ({ children }: any) => children,
  Text: ({ children }: any) => children,
  Link: ({ children }: any) => children,
  Hr: () => null,
  Button: ({ children }: any) => children,
}))

// Mock @supabase/supabase-js for user client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}))

// Shared test data and mocks
const mockAuthUser = {
  user: {
    id: 'new-user-id',
    email: 'newuser@example.com',
  },
}

const mockProfilesData = [
  {
    user_id: 'admin-id',
    full_name: 'Admin User',
    role: 'admin',
    status: 'active',
    last_login: '2025-01-01T00:00:00Z',
    invited_at: '2024-12-01T00:00:00Z',
    invited_by: null,
  },
  {
    user_id: 'staff-id',
    full_name: 'Staff User',
    role: 'staff',
    status: 'active',
    last_login: null,
    invited_at: '2024-12-15T00:00:00Z',
    invited_by: 'admin-id',
  },
]

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => {
          // Return both order and eq to support different query patterns
          return {
            order: vi.fn().mockResolvedValue({
              data: mockProfilesData,
              error: null,
            }),
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { user_id: 'new-user-id' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'audit_logs') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    }
    return {}
  }),
  auth: {
    admin: {
      createUser: vi.fn().mockResolvedValue({ data: mockAuthUser, error: null }),
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
      listUsers: vi.fn().mockResolvedValue({
        data: {
          users: [
            { id: 'admin-id', email: 'admin@example.com' },
            { id: 'staff-id', email: 'staff@example.com' },
          ],
        },
        error: null,
      }),
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()

  // Set up default environment variables
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

  vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
    mockSupabase as unknown as ReturnType<typeof server.supabaseAdmin>
  )
  vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
    session: { user: { id: 'admin-id', email: 'admin@example.com' } },
    profile: { full_name: 'Admin', role: 'admin' },
  } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>)
})

describe('inviteUser', () => {

  it('successfully invites a new user', async () => {
    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(true)
    expect(result.data).toHaveProperty('userId')
    expect(result.data?.userId).toBe('new-user-id')
  })

  it('rejects invitation from non-admin', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>)

    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })

  it('validates email format', async () => {
    const result = await inviteUser({
      email: 'invalid-email',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    // Should contain either 'email' or 'Invalid email'
    expect(result.error?.toLowerCase()).toMatch(/email|validation/)
  })

  it('rejects duplicate email', async () => {
    const mockSupabaseWithExisting = {
      ...mockSupabase,
      auth: {
        admin: {
          ...mockSupabase.auth.admin,
          listUsers: vi.fn().mockResolvedValue({
            data: {
              users: [{ email: 'existing@example.com', id: 'existing-user-id' }]
            },
            error: null
          }),
        },
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithExisting as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await inviteUser({
      email: 'existing@example.com',
      fullName: 'Existing User',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('already exists')
  })

  it('validates full name is required', async () => {
    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: '',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('validates role is valid', async () => {
    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'invalid' as any,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('cleans up auth user if profile creation fails', async () => {
    const mockSupabaseWithProfileError = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Profile creation failed' }
                }),
              }),
            }),
          }
        }
        return {}
      }),
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: mockAuthUser, error: null }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        },
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithProfileError as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await inviteUser({
      email: 'newuser@example.com',
      fullName: 'New User',
      role: 'staff',
    })

    expect(result.success).toBe(false)
    expect(mockSupabaseWithProfileError.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id')
  })
})

describe('getAllUsers', () => {
  it('returns all users for admin', async () => {
    const result = await getAllUsers()

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('rejects non-admin users', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as any)

    const result = await getAllUsers()

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })
})

describe('updateUserRole', () => {
  it('successfully updates user role for admin', async () => {
    const mockSupabaseWithUpdate = {
      ...mockSupabase,
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithUpdate as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await updateUserRole('user-123', 'staff')

    expect(result.success).toBe(true)
  })

  it('rejects role update from non-admin', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as any)

    const result = await updateUserRole('user-123', 'admin')

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })

  it('validates role is valid', async () => {
    const result = await updateUserRole('user-123', 'invalid-role' as any)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/role/i)
  })
})

describe('deactivateUser', () => {
  it('successfully deactivates user for admin', async () => {
    const mockSupabaseWithUpdate = {
      ...mockSupabase,
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithUpdate as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await deactivateUser('user-123')

    expect(result.success).toBe(true)
  })

  it('rejects deactivation from non-admin', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>)

    const result = await deactivateUser('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })
})

describe('reactivateUser', () => {
  it('successfully reactivates user for admin', async () => {
    const mockSupabaseWithUpdate = {
      ...mockSupabase,
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithUpdate as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await reactivateUser('user-123')

    expect(result.success).toBe(true)
  })

  it('rejects reactivation from non-admin', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as unknown as Awaited<ReturnType<typeof auth.getSessionWithProfile>>)

    const result = await reactivateUser('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })
})

describe('adminResetPassword', () => {
  it('successfully resets password for admin', async () => {
    const mockSupabaseWithPasswordReset = {
      ...mockSupabase,
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { full_name: 'Test User' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'user@example.com' } },
            error: null,
          }),
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithPasswordReset as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await adminResetPassword('user-123')

    expect(result.success).toBe(true)
  })

  it('rejects password reset from non-admin', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: { user: { id: 'staff-id' } },
      profile: { full_name: 'Staff', role: 'staff' },
    } as any)

    const result = await adminResetPassword('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('admin')
  })
})

describe('requestPasswordReset', () => {
  it('returns success for valid email', async () => {
    const mockSupabaseWithReset = {
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithReset as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await requestPasswordReset('user@example.com')

    expect(result.success).toBe(true)
  })

  it('returns success for non-existent email (prevents enumeration)', async () => {
    const mockSupabaseWithReset = {
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          error: { message: 'User not found' }
        }),
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithReset as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await requestPasswordReset('nonexistent@example.com')

    // Still returns success to prevent enumeration
    expect(result.success).toBe(true)
  })

  it('validates email format', async () => {
    const result = await requestPasswordReset('invalid-email')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/email/i)
  })
})

describe('resetPassword', () => {
  it('successfully resets password with valid token', async () => {
    const mockSupabaseWithReset = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'user@example.com' } },
          error: null,
        }),
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithReset as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await resetPassword('valid-token', 'NewSecure123')

    expect(result.success).toBe(true)
  })

  it('validates password requirements', async () => {
    const result = await resetPassword('valid-token', 'weak')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/password/i)
  })

  it('rejects invalid token', async () => {
    const mockSupabaseWithInvalidToken = {
      from: vi.fn((table: string) => {
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Invalid or expired token' },
        }),
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithInvalidToken as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await resetPassword('invalid-token', 'NewSecure123')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/token|invalid|expired/i)
  })
})

describe('changePassword', () => {
  it('successfully changes password for authenticated user', async () => {
    // Set up environment variables for user client creation
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const mockSupabaseWithPasswordChange = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }
        }
        if (table === 'audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }),
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }

    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(
      mockSupabaseWithPasswordChange as unknown as ReturnType<typeof server.supabaseAdmin>
    )

    const result = await changePassword('OldPassword123', 'NewPassword123')

    expect(result.success).toBe(true)
  })

  it('validates new password requirements', async () => {
    const result = await changePassword('OldPassword123', 'weak')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/password/i)
  })

  it('rejects unauthenticated requests', async () => {
    vi.spyOn(auth, 'getSessionWithProfile').mockResolvedValue({
      session: null,
      profile: null,
    } as any)

    const result = await changePassword('OldPassword123', 'NewPassword123')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/authenticated|signed in/i)
  })

  it('validates new password is different from current', async () => {
    const result = await changePassword('SamePassword123', 'SamePassword123')

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/different/i)
  })

  it('handles incorrect current password', async () => {
    // Mock createClient to return error for wrong password
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValueOnce({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: 'Invalid login credentials' }
        }),
      },
    } as any)

    const result = await changePassword('WrongPassword123', 'NewPassword123')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
