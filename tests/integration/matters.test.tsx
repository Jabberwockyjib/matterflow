import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockMatter, mockSession, mockProfile, defaultIds } from '../setup/mocks/fixtures'
import {
  createMatter,
  updateMatterStage,
  deleteMatter,
  getMatter,
  getMatters,
} from '@/lib/data/actions'
import { setMockSessionWithProfile } from '@/lib/auth/server'

// Mock the supabase server module
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()
const mockOrder = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  supabaseEnvReady: vi.fn(() => true),
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'matters') {
        return {
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
          select: mockSelect,
        }
      }
      if (table === 'audit_logs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    }),
  })),
}))

describe('Matter CRUD Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mock implementations
    mockInsert.mockReset()
    mockUpdate.mockReset()
    mockDelete.mockReset()
    mockSelect.mockReset()
    mockEq.mockReset()
    mockMaybeSingle.mockReset()
    mockOrder.mockReset()
  })

  afterEach(() => {
    // Clear mock session after each test
    setMockSessionWithProfile(null)
  })

  describe('createMatter', () => {
    it('creates a matter with valid form data when authorized', async () => {
      // Setup: authenticated staff user
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'Test Case')
      formData.set('ownerId', defaultIds.userId)
      formData.set('matterType', 'consultation')
      formData.set('billingModel', 'hourly')
      formData.set('responsibleParty', 'attorney')

      const result = await createMatter(formData)

      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockInsert).toHaveBeenCalledWith({
        title: 'Test Case',
        owner_id: defaultIds.userId,
        client_id: null,
        matter_type: 'consultation',
        billing_model: 'hourly',
        responsible_party: 'attorney',
        next_action: null,
      })
    })

    it('returns error when user is not authenticated', async () => {
      // Setup: no session
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('title', 'Test Case')

      const result = await createMatter(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns error when client tries to create a matter', async () => {
      // Setup: authenticated client user
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('title', 'Test Case')

      const result = await createMatter(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('uses default values for missing form fields', async () => {
      // Setup: authenticated staff user
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      // Not setting any fields to test defaults

      const result = await createMatter(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith({
        title: 'Untitled Matter',
        owner_id: null,
        client_id: null,
        matter_type: 'General',
        billing_model: 'hourly',
        responsible_party: 'lawyer',
        next_action: null,
      })
    })

    it('returns error when database insert fails', async () => {
      // Setup: authenticated staff user
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: { message: 'Database error' } })

      const formData = new FormData()
      formData.set('title', 'Test Case')

      const result = await createMatter(formData)

      expect(result.error).toBe('Database error')
      expect(result.ok).toBeUndefined()
    })

    it('allows admin to create a matter', async () => {
      // Setup: authenticated admin user
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'Admin Created Case')

      const result = await createMatter(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('updateMatterStage', () => {
    it('updates matter stage when authorized', async () => {
      // Setup: authenticated staff user
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)
      formData.set('stage', 'active')
      formData.set('responsibleParty', 'client')
      formData.set('nextAction', 'Review documents')

      const result = await updateMatterStage(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        stage: 'active',
        responsible_party: 'client',
        next_action: 'Review documents',
      })
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.matterId)
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)
      formData.set('stage', 'active')

      const result = await updateMatterStage(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('returns error when client tries to update matter', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)
      formData.set('stage', 'active')

      const result = await updateMatterStage(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('handles null responsible party', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)
      formData.set('stage', 'closed')
      // Not setting responsibleParty

      const result = await updateMatterStage(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        stage: 'closed',
        responsible_party: undefined,
        next_action: null,
      })
    })

    it('returns error when database update fails', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: { message: 'Update failed' } }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)
      formData.set('stage', 'active')

      const result = await updateMatterStage(formData)

      expect(result.error).toBe('Update failed')
    })
  })

  describe('deleteMatter', () => {
    it('deletes a matter when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)

      const result = await deleteMatter(formData)

      expect(result.ok).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.matterId)
    })

    it('returns error when matter ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      // Not setting id

      const result = await deleteMatter(formData)

      expect(result.error).toBe('Matter ID is required')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)

      const result = await deleteMatter(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when client tries to delete matter', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('id', defaultIds.matterId)

      const result = await deleteMatter(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe('getMatter', () => {
    it('retrieves a matter by ID when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testMatter = mockMatter({ id: defaultIds.matterId, title: 'Retrieved Matter' })
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: testMatter, error: null }),
        }),
      })

      const result = await getMatter(defaultIds.matterId)

      expect(result.data).toEqual(testMatter)
      expect(result.error).toBeUndefined()
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.matterId)
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const result = await getMatter(defaultIds.matterId)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns error when matter is not found', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }),
        }),
      })

      const result = await getMatter('non-existent-id')

      expect(result.data).toBeNull()
      expect(result.error).toBeUndefined()
    })
  })

  describe('getMatters', () => {
    it('retrieves all matters when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testMatters = [
        mockMatter({ id: 'matter-1', title: 'Matter 1' }),
        mockMatter({ id: 'matter-2', title: 'Matter 2' }),
      ]
      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValueOnce({ data: testMatters, error: null }),
      })

      const result = await getMatters()

      expect(result.data).toEqual(testMatters)
      expect(result.error).toBeUndefined()
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const result = await getMatters()

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns empty array when no matters exist', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValueOnce({ data: [], error: null }),
      })

      const result = await getMatters()

      expect(result.data).toEqual([])
      expect(result.error).toBeUndefined()
    })

    it('returns error when database query fails', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } }),
      })

      const result = await getMatters()

      expect(result.error).toBe('Query failed')
      expect(result.data).toBeUndefined()
    })
  })

  describe('Form Validation Edge Cases', () => {
    it('handles empty title by using default', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', '') // Empty string

      const result = await createMatter(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled Matter',
        })
      )
    })

    it('preserves special characters in title', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'Smith v. Jones & Associates (Case #123)')

      const result = await createMatter(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Smith v. Jones & Associates (Case #123)',
        })
      )
    })

    it('handles very long titles', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const longTitle = 'A'.repeat(500)
      const formData = new FormData()
      formData.set('title', longTitle)

      const result = await createMatter(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: longTitle,
        })
      )
    })
  })
})
