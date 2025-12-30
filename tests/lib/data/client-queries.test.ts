import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchClientInvitations, fetchIntakesByReviewStatus } from '@/lib/data/queries'
import * as server from '@/lib/supabase/server'

vi.mock('@/lib/auth/server', () => ({
  getSessionWithProfile: vi.fn().mockResolvedValue({
    session: { user: { id: 'user-1' } },
    profile: { role: 'admin' },
  }),
}))

describe('fetchClientInvitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns invitations grouped by status', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: '1',
                invite_code: 'ABC123',
                client_name: 'Test Client',
                client_email: 'test@example.com',
                matter_type: 'Contract Review',
                status: 'pending',
                invited_at: '2025-12-28T10:00:00Z',
                expires_at: '2026-01-04T10:00:00Z',
                notes: null,
              },
            ],
            error: null,
          }),
        })),
      })),
    } as any)

    const result = await fetchClientInvitations()

    expect(result.pending).toHaveLength(1)
    expect(result.pending[0].clientName).toBe('Test Client')
  })

  it('returns mock data when Supabase not ready', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(false)

    const result = await fetchClientInvitations()

    expect(result.source).toBe('mock')
    expect(result.pending.length).toBeGreaterThan(0)
  })
})

describe('fetchIntakesByReviewStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns intakes grouped by review status', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: '1',
                  matter_id: 'matter-1',
                  form_type: 'Contract Review',
                  review_status: 'pending',
                  submitted_at: '2025-12-29T10:00:00Z',
                  responses: { client_name: 'John Doe' },
                  internal_notes: null,
                },
              ],
              error: null,
            }),
          })),
        })),
      })),
    } as any)

    const result = await fetchIntakesByReviewStatus()

    expect(result.pending).toHaveLength(1)
    expect(result.pending[0].formType).toBe('Contract Review')
  })

  it('returns mock data when Supabase not ready', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(false)

    const result = await fetchIntakesByReviewStatus()

    expect(result.source).toBe('mock')
    expect(result.pending.length).toBeGreaterThan(0)
  })
})
