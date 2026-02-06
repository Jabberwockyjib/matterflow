import type { Database } from '@/types/database.types'

// Type aliases for cleaner code
type Profile = Database['public']['Tables']['profiles']['Row']
type Matter = Database['public']['Tables']['matters']['Row']
type Task = Database['public']['Tables']['tasks']['Row']
type TimeEntry = Database['public']['Tables']['time_entries']['Row']
type Document = Database['public']['Tables']['documents']['Row']
type Invoice = Database['public']['Tables']['invoices']['Row']
type UserRole = Database['public']['Enums']['user_role']

// Default IDs for consistent test data
const DEFAULT_USER_ID = 'test-user-id-123'
const DEFAULT_MATTER_ID = 'test-matter-id-456'
const DEFAULT_TASK_ID = 'test-task-id-789'
const DEFAULT_TIME_ENTRY_ID = 'test-time-entry-id-012'

/**
 * Generate a unique ID for test entities
 */
function generateId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate an ISO timestamp string
 */
function timestamp(date: Date = new Date()): string {
  return date.toISOString()
}

/**
 * Mock profile/user factory
 *
 * @example
 * ```ts
 * const admin = mockProfile({ role: 'admin' })
 * const client = mockProfile({ role: 'client', full_name: 'Test Client' })
 * ```
 */
export function mockProfile(overrides: Partial<Profile> = {}): Profile {
  const now = timestamp()
  return {
    user_id: DEFAULT_USER_ID,
    full_name: 'Test User',
    role: 'staff' as UserRole,
    created_at: now,
    gmail_history_id: null,
    gmail_last_sync: null,
    gmail_sync_enabled: null,
    google_connected_at: null,
    google_refresh_token: null,
    invited_at: null,
    invited_by: null,
    last_login: null,
    password_must_change: null,
    status: 'active',
    phone: null,
    phone_secondary: null,
    phone_type: null,
    phone_secondary_type: null,
    address: null,
    address_street: null,
    address_city: null,
    address_state: null,
    address_zip: null,
    address_country: null,
    company_name: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    preferred_contact_method: null,
    client_notes: null,
    client_status: null,
    internal_notes: null,
    ...overrides,
  }
}

/**
 * Mock user for authentication contexts
 * Simulates Supabase auth user structure
 */
export interface MockUser {
  id: string
  email: string
  email_confirmed_at: string
  created_at: string
  updated_at: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
  aud: string
  role: string
}

export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  const now = timestamp()
  return {
    id: DEFAULT_USER_ID,
    email: 'test@example.com',
    email_confirmed_at: now,
    created_at: now,
    updated_at: now,
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    role: 'authenticated',
    ...overrides,
  }
}

/**
 * Mock session for authentication contexts
 * Simulates Supabase auth session structure
 */
export interface MockSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: MockUser
}

export function mockSession(overrides: Partial<MockSession> = {}): MockSession {
  const user = overrides.user ?? mockUser()
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
    ...overrides,
  }
}

/**
 * Combined session with profile for authenticated contexts
 */
export interface SessionWithProfile {
  session: MockSession
  profile: Profile
}

export function mockSessionWithProfile(
  overrides: Partial<{ session: Partial<MockSession>; profile: Partial<Profile> }> = {}
): SessionWithProfile {
  const profile = mockProfile(overrides.profile)
  const session = mockSession({
    ...overrides.session,
    user: mockUser({ id: profile.user_id }),
  })
  return { session, profile }
}

/**
 * Mock matter factory
 *
 * @example
 * ```ts
 * const matter = mockMatter({ title: 'New Case' })
 * const completedMatter = mockMatter({ stage: 'closed' })
 * ```
 */
export function mockMatter(overrides: Partial<Matter> = {}): Matter {
  const now = timestamp()
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  return {
    id: DEFAULT_MATTER_ID,
    title: 'Test Matter',
    matter_type: 'consultation',
    stage: 'intake',
    billing_model: 'hourly',
    owner_id: DEFAULT_USER_ID,
    client_id: null,
    responsible_party: 'attorney',
    next_action: 'Review and respond',
    next_action_due_date: futureDate,
    intake_received_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Mock task factory
 *
 * @example
 * ```ts
 * const task = mockTask({ title: 'Review documents' })
 * const completedTask = mockTask({ status: 'completed' })
 * ```
 */
export function mockTask(overrides: Partial<Task> = {}): Task {
  const now = timestamp()
  return {
    id: DEFAULT_TASK_ID,
    title: 'Test Task',
    matter_id: DEFAULT_MATTER_ID,
    status: 'open',
    responsible_party: 'attorney',
    created_by: DEFAULT_USER_ID,
    due_date: null,
    description: null,
    task_type: 'general',
    instructions: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Mock time entry factory
 *
 * @example
 * ```ts
 * const entry = mockTimeEntry({ duration_minutes: 60 })
 * const runningTimer = mockTimeEntry({ duration_minutes: null, ended_at: null })
 * ```
 */
export function mockTimeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  const now = timestamp()
  return {
    id: DEFAULT_TIME_ENTRY_ID,
    matter_id: DEFAULT_MATTER_ID,
    task_id: null,
    description: 'Test time entry',
    started_at: now,
    ended_at: now,
    duration_minutes: 30,
    billable_duration_minutes: null,
    rate_cents: 25000, // $250.00/hr
    status: 'recorded',
    created_by: DEFAULT_USER_ID,
    created_at: now,
    ...overrides,
  }
}

/**
 * Mock running time entry (timer)
 */
export function mockRunningTimer(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return mockTimeEntry({
    ended_at: null,
    duration_minutes: null,
    status: 'running',
    ...overrides,
  })
}

/**
 * Mock document factory
 *
 * @example
 * ```ts
 * const doc = mockDocument({ title: 'Contract.pdf' })
 * ```
 */
export function mockDocument(overrides: Partial<Document> = {}): Document {
  const now = timestamp()
  return {
    id: generateId('doc'),
    matter_id: DEFAULT_MATTER_ID,
    task_id: null,
    title: 'Test Document',
    summary: null,
    status: 'uploaded',
    version: 1,
    drive_file_id: null,
    folder_path: null,
    metadata: {},
    file_size: null,
    mime_type: null,
    web_view_link: null,
    ai_document_type: null,
    ai_summary: null,
    ai_suggested_folder: null,
    ai_processed_at: null,
    created_at: now,
    ...overrides,
  }
}

/**
 * Mock invoice factory
 *
 * @example
 * ```ts
 * const invoice = mockInvoice({ total_cents: 100000 }) // $1,000.00
 * ```
 */
export function mockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const now = timestamp()
  return {
    id: generateId('inv'),
    matter_id: DEFAULT_MATTER_ID,
    total_cents: 50000, // $500.00
    status: 'draft',
    line_items: [],
    due_date: null,
    square_invoice_id: null,
    last_reminder_sent_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

/**
 * Create multiple mock entities
 *
 * @example
 * ```ts
 * const matters = createMany(mockMatter, 5)
 * const tasks = createMany(mockTask, 3, { matter_id: 'specific-id' })
 * ```
 */
export function createMany<T>(
  factory: (overrides?: Partial<T>) => T,
  count: number,
  overrides?: Partial<T>
): T[] {
  return Array.from({ length: count }, (_, index) => {
    // Generate unique IDs for each entity
    const entityOverrides = {
      ...overrides,
      id: generateId(`item-${index}`),
    } as unknown as Partial<T>
    return factory(entityOverrides)
  })
}

// Export default IDs for use in tests
export const defaultIds = {
  userId: DEFAULT_USER_ID,
  matterId: DEFAULT_MATTER_ID,
  taskId: DEFAULT_TASK_ID,
  timeEntryId: DEFAULT_TIME_ENTRY_ID,
} as const
