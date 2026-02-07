import { describe, it, expect, vi, beforeEach } from 'vitest'
import { inviteClient } from '@/lib/data/actions'
import * as server from '@/lib/supabase/server'
import * as auth from '@/lib/auth/server'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/email/client', () => ({
  sendInvitationEmail: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/auth/server', () => ({
  getSessionWithProfile: vi.fn().mockResolvedValue({
    session: { user: { id: 'user-1' } },
    profile: { role: 'admin', full_name: 'Admin' },
  }),
}))

/**
 * Build a chainable mock that handles arbitrary Supabase query chains.
 * Each table has specific return values for its operations.
 */
function createMockSupabase() {
  const chainable = (terminal: any = { data: null, error: null }) => {
    const obj: any = {}
    const methods = ['select', 'insert', 'update', 'upsert', 'eq', 'is', 'limit', 'single', 'maybeSingle', 'order']
    for (const m of methods) {
      if (m === 'single' || m === 'maybeSingle') {
        obj[m] = vi.fn().mockResolvedValue(terminal)
      } else {
        obj[m] = vi.fn(() => obj)
      }
    }
    return obj
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'client_invitations') {
        // insert().select().single() returns the invitation
        const chain = chainable({
          data: {
            id: 'invite-1',
            invite_code: 'ABC123',
            client_name: 'Test Client',
            client_email: 'test@example.com',
          },
          error: null,
        })
        // update() returns success
        chain.update = vi.fn(() => chainable({ data: null, error: null }))
        return chain
      }
      if (table === 'matters') {
        return chainable({
          data: { id: 'matter-1' },
          error: null,
        })
      }
      if (table === 'practice_settings') {
        return chainable({
          data: {
            google_refresh_token: null,
            contact_email: null,
            firm_name: 'Test Firm',
          },
          error: null,
        })
      }
      if (table === 'audit_logs') {
        return chainable({ data: null, error: null })
      }
      return chainable()
    }),
  }
}

describe('inviteClient', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue(mockSupabase as any)
  })

  it('creates invitation and returns invite code', async () => {
    const formData = new FormData()
    formData.set('clientName', 'Test Client')
    formData.set('clientEmail', 'test@example.com')
    formData.set('matterType', 'Contract Review')
    formData.set('notes', 'From phone call')

    const result = await inviteClient(formData)

    expect(result.ok).toBe(true)
    expect(result.inviteCode).toBeTruthy()
    expect(result.inviteLink).toContain('/intake/invite/')
  })

  it('validates required fields', async () => {
    const formData = new FormData()
    formData.set('clientName', '')
    formData.set('clientEmail', 'test@example.com')

    const result = await inviteClient(formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Client name is required')
  })

  it('validates email format', async () => {
    const formData = new FormData()
    formData.set('clientName', 'Test')
    formData.set('clientEmail', 'invalid-email')

    const result = await inviteClient(formData)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Valid email is required')
  })
})
