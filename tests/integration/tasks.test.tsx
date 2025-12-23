import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mockTask, mockSession, mockProfile, defaultIds } from '../setup/mocks/fixtures'
import {
  createTask,
  updateTaskStatus,
  deleteTask,
  getTask,
  getTasks,
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
      if (table === 'tasks') {
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

describe('Task Management Integration Tests', () => {
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

  describe('createTask', () => {
    it('creates a task with valid form data when authorized', async () => {
      // Setup: authenticated staff user
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'Review documents')
      formData.set('matterId', defaultIds.matterId)
      formData.set('responsibleParty', 'attorney')

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockInsert).toHaveBeenCalledWith({
        title: 'Review documents',
        matter_id: defaultIds.matterId,
        status: 'open',
        responsible_party: 'attorney',
        due_date: null,
        created_by: session.user.id,
      })
    })

    it('sets status to open by default', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'New task')
      formData.set('matterId', defaultIds.matterId)
      // Not setting status to test default

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
        })
      )
    })

    it('returns error when matter ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('title', 'Test task')
      // Not setting matterId

      const result = await createTask(formData)

      expect(result.error).toBe('Matter ID is required')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('title', 'Test task')
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('returns error when client tries to create a task', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('title', 'Test task')
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(result.ok).toBeUndefined()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('creates task with due date', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const dueDate = '2024-01-31'
      const formData = new FormData()
      formData.set('title', 'Task with deadline')
      formData.set('matterId', defaultIds.matterId)
      formData.set('dueDate', dueDate)

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          due_date: dueDate,
        })
      )
    })

    it('creates task with custom status', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'In progress task')
      formData.set('matterId', defaultIds.matterId)
      formData.set('status', 'in_progress')

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
        })
      )
    })

    it('returns error when database insert fails', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: { message: 'Database error' } })

      const formData = new FormData()
      formData.set('title', 'Test task')
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.error).toBe('Database error')
      expect(result.ok).toBeUndefined()
    })

    it('allows admin to create a task', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'Admin created task')
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalled()
    })

    it('uses default values for missing form fields', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('matterId', defaultIds.matterId)
      // Not setting title to test default

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled Task',
          responsible_party: 'attorney',
        })
      )
    })
  })

  describe('updateTaskStatus', () => {
    it('updates task status when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)
      formData.set('status', 'completed')

      const result = await updateTaskStatus(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'completed',
      })
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.taskId)
    })

    it('returns error when task ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('status', 'completed')
      // Not setting id

      const result = await updateTaskStatus(formData)

      expect(result.error).toBe('Task ID is required')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)
      formData.set('status', 'completed')

      const result = await updateTaskStatus(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('returns error when client tries to update task', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)
      formData.set('status', 'completed')

      const result = await updateTaskStatus(formData)

      expect(result.error).toBe('Forbidden: clients cannot perform this action')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('updates task responsible party', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)
      formData.set('responsibleParty', 'client')

      const result = await updateTaskStatus(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        responsible_party: 'client',
      })
    })

    it('updates task due date', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const newDueDate = '2024-02-15'
      const formData = new FormData()
      formData.set('id', defaultIds.taskId)
      formData.set('dueDate', newDueDate)

      const result = await updateTaskStatus(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        due_date: newDueDate,
      })
    })

    it('updates multiple task fields at once', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)
      formData.set('status', 'in_progress')
      formData.set('responsibleParty', 'paralegal')
      formData.set('dueDate', '2024-03-01')

      const result = await updateTaskStatus(formData)

      expect(result.ok).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'in_progress',
        responsible_party: 'paralegal',
        due_date: '2024-03-01',
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
      formData.set('id', defaultIds.taskId)
      formData.set('status', 'completed')

      const result = await updateTaskStatus(formData)

      expect(result.error).toBe('Update failed')
    })
  })

  describe('deleteTask', () => {
    it('deletes a task when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockDelete.mockReturnValue({
        eq: mockEq.mockResolvedValueOnce({ error: null }),
      })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)

      const result = await deleteTask(formData)

      expect(result.ok).toBe(true)
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.taskId)
    })

    it('returns error when task ID is missing', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      // Not setting id

      const result = await deleteTask(formData)

      expect(result.error).toBe('Task ID is required')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)

      const result = await deleteTask(formData)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns error when client tries to delete task', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'client' })
      setMockSessionWithProfile({ session, profile })

      const formData = new FormData()
      formData.set('id', defaultIds.taskId)

      const result = await deleteTask(formData)

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
      formData.set('id', defaultIds.taskId)

      const result = await deleteTask(formData)

      expect(result.error).toBe('Delete failed')
    })
  })

  describe('getTask', () => {
    it('retrieves a task by ID when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testTask = mockTask({ id: defaultIds.taskId, title: 'Retrieved Task' })
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: testTask, error: null }),
        }),
      })

      const result = await getTask(defaultIds.taskId)

      expect(result.data).toEqual(testTask)
      expect(result.error).toBeUndefined()
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('id', defaultIds.taskId)
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const result = await getTask(defaultIds.taskId)

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns null when task is not found', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }),
        }),
      })

      const result = await getTask('non-existent-id')

      expect(result.data).toBeNull()
      expect(result.error).toBeUndefined()
    })

    it('retrieves task with all fields populated', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const fullTask = mockTask({
        id: defaultIds.taskId,
        title: 'Complete Task',
        status: 'completed',
        responsible_party: 'paralegal',
        due_date: '2024-01-31',
      })
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle.mockResolvedValueOnce({ data: fullTask, error: null }),
        }),
      })

      const result = await getTask(defaultIds.taskId)

      expect(result.data).toEqual(fullTask)
      expect((result.data as typeof fullTask).status).toBe('completed')
      expect((result.data as typeof fullTask).responsible_party).toBe('paralegal')
      expect((result.data as typeof fullTask).due_date).toBe('2024-01-31')
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

      const result = await getTask(defaultIds.taskId)

      expect(result.error).toBe('Query failed')
      expect(result.data).toBeUndefined()
    })
  })

  describe('getTasks', () => {
    it('retrieves all tasks when authorized', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testTasks = [
        mockTask({ id: 'task-1', title: 'Task 1' }),
        mockTask({ id: 'task-2', title: 'Task 2' }),
      ]
      mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          eq: mockEq,
        }),
      })
      mockOrder.mockResolvedValueOnce({ data: testTasks, error: null })

      const result = await getTasks()

      expect(result.data).toEqual(testTasks)
      expect(result.error).toBeUndefined()
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('filters tasks by matter ID', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      const testTasks = [
        mockTask({ id: 'task-1', matter_id: defaultIds.matterId }),
      ]
      mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          eq: mockEq.mockResolvedValueOnce({ data: testTasks, error: null }),
        }),
      })

      const result = await getTasks(defaultIds.matterId)

      expect(result.data).toEqual(testTasks)
      expect(mockEq).toHaveBeenCalledWith('matter_id', defaultIds.matterId)
    })

    it('returns error when user is not authenticated', async () => {
      setMockSessionWithProfile({ session: null, profile: null })

      const result = await getTasks()

      expect(result.error).toBe('Unauthorized: please sign in')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns empty array when no tasks exist', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'admin' })
      setMockSessionWithProfile({ session, profile })

      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValueOnce({ data: [], error: null }),
      })

      const result = await getTasks()

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

      const result = await getTasks()

      expect(result.error).toBe('Query failed')
      expect(result.data).toBeUndefined()
    })
  })

  describe('Task Validation Edge Cases', () => {
    it('handles empty title by using default', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', '') // Empty string
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled Task',
        })
      )
    })

    it('preserves special characters in title', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      mockInsert.mockResolvedValueOnce({ error: null })

      const formData = new FormData()
      formData.set('title', 'Review docs for Smith v. Jones & Associates (Case #123)')
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Review docs for Smith v. Jones & Associates (Case #123)',
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
      formData.set('matterId', defaultIds.matterId)

      const result = await createTask(formData)

      expect(result.ok).toBe(true)
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: longTitle,
        })
      )
    })

    it('handles task status transitions', async () => {
      const session = mockSession()
      const profile = mockProfile({ role: 'staff' })
      setMockSessionWithProfile({ session, profile })

      // Test various status values
      const statuses = ['open', 'in_progress', 'blocked', 'completed']

      for (const status of statuses) {
        mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValueOnce({ error: null }),
        })

        const formData = new FormData()
        formData.set('id', defaultIds.taskId)
        formData.set('status', status)

        const result = await updateTaskStatus(formData)

        expect(result.ok).toBe(true)
        expect(mockUpdate).toHaveBeenCalledWith({
          status,
        })

        vi.clearAllMocks()
      }
    })
  })
})
