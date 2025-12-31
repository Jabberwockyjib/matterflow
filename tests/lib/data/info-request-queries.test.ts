import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getInfoRequests, getInfoRequestById } from '@/lib/data/queries'
import * as server from '@/lib/supabase/server'

vi.mock('@/lib/auth/server', () => ({
  getSessionWithProfile: vi.fn().mockResolvedValue({
    session: { user: { id: 'user-1' } },
    profile: { role: 'admin' },
  }),
}))

describe('getInfoRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all info requests for an intake response', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'req-1',
                  intake_response_id: 'intake-1',
                  requested_by: 'user-1',
                  questions: [{ id: 'q1', text: 'What is your business name?', required: true }],
                  message: 'Please provide additional details',
                  documents: null,
                  response_deadline: '2026-01-05T10:00:00Z',
                  status: 'pending',
                  requested_at: '2025-12-30T10:00:00Z',
                  responded_at: null,
                  responses: null,
                  created_at: '2025-12-30T10:00:00Z',
                  updated_at: '2025-12-30T10:00:00Z',
                  requestedBy: {
                    user_id: 'user-1',
                    full_name: 'Jane Lawyer',
                    email: 'jane@law.com',
                  },
                },
              ],
              error: null,
            }),
          })),
        })),
      })),
    } as any)

    const result = await getInfoRequests('intake-1')

    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe('req-1')
    expect(result.data[0].intakeResponseId).toBe('intake-1')
    expect(result.data[0].requestedBy?.fullName).toBe('Jane Lawyer')
    expect(result.source).toBe('supabase')
  })

  it('returns empty array when no requests found', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          })),
        })),
      })),
    } as any)

    const result = await getInfoRequests('intake-1')

    expect(result.data).toEqual([])
    expect(result.source).toBe('supabase')
  })

  it('handles database errors gracefully', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          })),
        })),
      })),
    } as any)

    const result = await getInfoRequests('intake-1')

    expect(result.data).toEqual([])
    expect(result.source).toBe('supabase')
  })

  it('returns empty array when Supabase not ready', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(false)

    const result = await getInfoRequests('intake-1')

    expect(result.data).toEqual([])
    expect(result.source).toBe('supabase')
  })
})

describe('getInfoRequestById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns single info request with full context', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'req-1',
                intake_response_id: 'intake-1',
                requested_by: 'user-1',
                questions: [{ id: 'q1', text: 'What is your business name?', required: true }],
                message: 'Please provide additional details',
                documents: null,
                response_deadline: '2026-01-05T10:00:00Z',
                status: 'pending',
                requested_at: '2025-12-30T10:00:00Z',
                responded_at: null,
                responses: null,
                created_at: '2025-12-30T10:00:00Z',
                updated_at: '2025-12-30T10:00:00Z',
                requestedBy: {
                  user_id: 'user-1',
                  full_name: 'Jane Lawyer',
                  email: 'jane@law.com',
                },
                intakeResponse: {
                  id: 'intake-1',
                  matter_id: 'matter-1',
                  form_type: 'Contract Review',
                  matter: {
                    id: 'matter-1',
                    title: 'Contract Review - Acme Corp',
                    client_id: 'client-1',
                    client: {
                      user_id: 'client-1',
                      full_name: 'John Client',
                      email: 'john@client.com',
                    },
                  },
                },
              },
              error: null,
            }),
          })),
        })),
      })),
    } as any)

    const result = await getInfoRequestById('req-1')

    expect(result.data).not.toBeNull()
    expect(result.data?.id).toBe('req-1')
    expect(result.data?.requestedBy?.fullName).toBe('Jane Lawyer')
    expect(result.data?.intakeResponse?.matter?.title).toBe('Contract Review - Acme Corp')
    expect(result.data?.intakeResponse?.matter?.client?.fullName).toBe('John Client')
    expect(result.source).toBe('supabase')
  })

  it('returns null when request not found', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows returned' },
            }),
          })),
        })),
      })),
    } as any)

    const result = await getInfoRequestById('nonexistent')

    expect(result.data).toBeNull()
    expect(result.source).toBe('supabase')
  })

  it('handles database errors gracefully', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(true)
    vi.spyOn(server, 'supabaseAdmin').mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' },
            }),
          })),
        })),
      })),
    } as any)

    const result = await getInfoRequestById('req-1')

    expect(result.data).toBeNull()
    expect(result.source).toBe('supabase')
  })

  it('returns null when Supabase not ready', async () => {
    vi.spyOn(server, 'supabaseEnvReady').mockReturnValue(false)

    const result = await getInfoRequestById('req-1')

    expect(result.data).toBeNull()
    expect(result.source).toBe('supabase')
  })
})
