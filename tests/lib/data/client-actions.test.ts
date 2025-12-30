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

describe('inviteClient', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              invite_code: 'ABC123',
              client_name: 'Test Client',
              client_email: 'test@example.com',
            },
            error: null,
          }),
        })),
      })),
    })),
  }

  beforeEach(() => {
    vi.clearAllMocks()
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
