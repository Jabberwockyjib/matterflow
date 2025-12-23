import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockTimeEntry, mockRunningTimer, mockSession, mockProfile, defaultIds } from '../setup/mocks/fixtures'
import {
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeEntry,
  getTimeEntries,
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
      if (table === 'time_entries') {
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

describe('Time Entry Integration Tests', () => {
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

  describe('createTimeEntry', () => {
    it('creates a time entry with valid form data when authorized', async () => {
      // Setup: authenticated staff user
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', 'Client consultation')
      formData.set('durationMinutes', '60')
      formData.set('rateCents', '25000')
      formData.set('status', 'recorded')

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          matter_id: defaultIds.matterId,
          description: 'Client consultation',
          duration_minutes: 60,
          rate_cents: 25000,
          status: 'recorded',
          created_by: session.user.id,
        })
      )
    })

    it('returns error when matter ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('description', 'Test entry')
      // Not setting matterId

      const result = await createTimeEntry(formData)

      expect(result.error).toBe('Matter ID is required')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', 'Test entry')

      const result = await createTimeEntry(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns error when client tries to create a time entry', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', 'Test entry')

      const result = await createTimeEntry(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('creates time entry with task association', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('taskId', defaultIds.taskId)
      formData.set('description', 'Working on task')
      formData.set('durationMinutes', '30')

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          matter_id: defaultIds.matterId,
          task_id: defaultIds.taskId,
        })
      )
    })

    it('creates running timer entry (no duration or end time)', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('status', 'running')
      // Not setting durationMinutes or endedAt

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          matter_id: defaultIds.matterId,
          duration_minutes: null,
          ended_at: null,
          status: 'running',
        })
      )
    })

    it('returns error when database insert fails', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: { message: 'Database error' } })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', 'Test entry')

      const result = await createTimeEntry(formData)

      expect(result.error).toBe('Database error')
      expect(result.ok).toBeUndefined()
    })

    it('allows admin to create a time entry', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', 'Admin time entry')
      formData.set('durationMinutes', '45')

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('updateTimeEntry', () => {
    it('updates time entry when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)
      formData.set('description', 'Updated description')
      formData.set('durationMinutes', '90')
      formData.set('status', 'recorded')

      const result = await updateTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        description: 'Updated description',
        duration_minutes: 90,
        status: 'recorded',
      })
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.timeEntryId)
    })

    it('returns error when time entry ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('description', 'Updated description')
      // Not setting id

      const result = await updateTimeEntry(formData)

      expect(result.error).toBe('Time entry ID is required')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)
      formData.set('description', 'Updated description')

      const result = await updateTimeEntry(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('returns error when client tries to update time entry', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)
      formData.set('description', 'Updated description')

      const result = await updateTimeEntry(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('stops running timer by setting ended_at and duration', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const endTime = new Date().toISOString()
      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)
      formData.set('endedAt', endTime)
      formData.set('durationMinutes', '45')
      formData.set('status', 'recorded')

      const result = await updateTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        ended_at: endTime,
        duration_minutes: 45,
        status: 'recorded',
      })
    })

    it('updates billing rate', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)
      formData.set('rateCents', '30000') // $300/hr

      const result = await updateTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        rate_cents: 30000,
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
      formData.set('id', defaultIds.timeEntryId)
      formData.set('description', 'Updated description')

      const result = await updateTimeEntry(formData)

      expect(result.error).toBe('Update failed')
    })
  })

  describe('deleteTimeEntry', () => {
    it('deletes a time entry when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)

      const result = await deleteTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.timeEntryId)
    })

    it('returns error when time entry ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      // Not setting id

      const result = await deleteTimeEntry(formData)

      expect(result.error).toBe('Time entry ID is required')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)

      const result = await deleteTimeEntry(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when client tries to delete time entry', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)

      const result = await deleteTimeEntry(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when database delete fails', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: { message: 'Delete failed' } }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.timeEntryId)

      const result = await deleteTimeEntry(formData)

      expect(result.error).toBe('Delete failed')
    })
  })

  describe('getTimeEntry', () => {
    it('retrieves a time entry by ID when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testTimeEntry = mockTimeEntry({ id: defaultIds.timeEntryId, description: 'Retrieved Entry' })
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: testTimeEntry, error: null }),
        }),
      })

      const result = await getTimeEntry(defaultIds.timeEntryId)

      expect(result.data).toEqual(testTimeEntry)
      expect(result.error).toBeUndefined()
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.timeEntryId)
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const result = await getTimeEntry(defaultIds.timeEntryId)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns null when time entry is not found', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }),
        }),
      })

      const result = await getTimeEntry('non-existent-id')

      expect(result.data).toBeNull()
      expect(result.error).toBeUndefined()
    })

    it('retrieves running timer entry', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const runningTimer = mockRunningTimer({ id: defaultIds.timeEntryId })
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: runningTimer, error: null }),
        }),
      })

      const result = await getTimeEntry(defaultIds.timeEntryId)

      expect(result.data).toEqual(runningTimer)
      expect((result.data as typeof runningTimer).status).toBe('running')
      expect((result.data as typeof runningTimer).ended_at).toBeNull()
      expect((result.data as typeof runningTimer).duration_minutes).toBeNull()
    })

    it('returns error when database query fails', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } }),
        }),
      })

      const result = await getTimeEntry(defaultIds.timeEntryId)

      expect(result.error).toBe('Query failed')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getTimeEntries', () => {
    it('retrieves all time entries when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testTimeEntries = [
        mockTimeEntry({ id: 'entry-1', description: 'Entry 1' }),
        mockTimeEntry({ id: 'entry-2', description: 'Entry 2' }),
      ]
      mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          eq: mockEq,
        }),
      })
      mockOrder.mockResolvedValueOnce({ data: testTimeEntries, error: null })

      const result = await getTimeEntries()

      expect(result.data).toEqual(testTimeEntries)
      expect(result.error).toBeUndefined()
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('started_at', { ascending: false })
    })

    it('filters time entries by matter ID', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testTimeEntries = [
        mockTimeEntry({ id: 'entry-1', matter_id: defaultIds.matterId }),
      ]
      mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          eq: mockEq.mockResolvedValueOnce({ data: testTimeEntries, error: null }),
        }),
      })

      const result = await getTimeEntries(defaultIds.matterId)

      expect(result.data).toEqual(testTimeEntries)
      expect(mockEq).toHaveBeenCalledWith('matter_id', defaultIds.matterId)
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const result = await getTimeEntries()

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns empty array when no time entries exist', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValueOnce({ data: [], error: null }),
      })

      const result = await getTimeEntries()

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

      const result = await getTimeEntries()

      expect(result.error).toBe('Query failed')
      expect(result.data).toBeUndefined()
    })
  })

  describe('Time Entry Validation Edge Cases', () => {
    it('handles null duration for running timers', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('status', 'running')
      // Explicitly not setting duration

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_minutes: null,
        })
      )
    })

    it('handles zero duration', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('durationMinutes', '0')

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      // 0 is falsy, so parseInt returns 0, but we should handle this edge case
      expect(mockInsert).toHaveBeenCalled()
    })

    it('handles very long descriptions', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const longDescription = 'A'.repeat(1000)
      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', longDescription)

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: longDescription,
        })
      )
    })

    it('handles special characters in description', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('description', 'Client call re: Smith v. Jones & Associates (Case #123)')

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Client call re: Smith v. Jones & Associates (Case #123)',
        })
      )
    })

    it('handles high billing rates', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('rateCents', '100000') // $1000/hr

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          rate_cents: 100000,
        })
      )
    })

    it('handles custom start time', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const customStartTime = '2024-01-15T10:30:00.000Z'
      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      formData.set('startedAt', customStartTime)
      formData.set('durationMinutes', '60')

      const result = await createTimeEntry(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          started_at: customStartTime,
        })
      )
    })
  })
})
