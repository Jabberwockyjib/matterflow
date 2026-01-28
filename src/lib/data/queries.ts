import { cache } from "react";
import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import type { Database } from "@/types/database.types";
import { DEFAULT_FIRM_SETTINGS, type FirmSettings } from "@/types/firm-settings";

export type MatterSummary = {
  id: string;
  title: string;
  stage: string;
  nextAction: string;
  nextActionDueDate: string;
  dueDate: string; // Alias for nextActionDueDate for backwards compatibility
  responsibleParty: string;
  billingModel: string;
  matterType: string;
  updatedAt: string;
  createdAt: string;
  clientName: string | null;
};

// Alias for consistency with intake components
export type Matter = MatterSummary;

export type TaskSummary = {
  id: string;
  title: string;
  dueDate: string | null;
  status: string;
  responsibleParty: string;
  matterId: string;
};

export type InvoiceSummary = {
  id: string;
  matterId: string;
  status: string;
  totalCents: number;
  dueDate: string | null;
  squareInvoiceId: string | null;
};

export type TimeEntrySummary = {
  id: string;
  matterId: string;
  taskId: string | null;
  status: string;
  description: string | null;
  durationMinutes: number | null;
  startedAt: string;
  endedAt: string | null;
};

export type ClientInvitation = {
  id: string;
  inviteCode: string;
  clientName: string;
  clientEmail: string;
  matterType: string | null;
  notes: string | null;
  status: string;
  invitedAt: string | null;
  expiresAt: string | null;
  daysAgo: number;
};

export type IntakeReview = {
  id: string;
  matterId: string;
  formType: string;
  reviewStatus: string;
  submittedAt: string | null;
  responses: Record<string, any>;
  internalNotes: string | null;
  isNew: boolean;
  clientEmail: string | null;
  clientName: string | null;
};

export type ClientProfile = {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  phone: string | null;
  phoneType: string | null;
  phoneSecondary: string | null;
  phoneSecondaryType: string | null;
  companyName: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  addressCountry: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredContactMethod: string | null;
  internalNotes: string | null;
  createdAt: string;
};

export type ClientMatterSummary = {
  id: string;
  title: string;
  stage: string;
  matterType: string;
  createdAt: string;
};

export type ClientIntakeSummary = {
  id: string;
  formType: string;
  status: string;
  submittedAt: string | null;
};

export type ClientInfoRequestSummary = {
  id: string;
  status: string;
  questionCount: number;
  createdAt: string;
  respondedAt: string | null;
};

export type ClientProfileResult = {
  success: boolean;
  data?: {
    profile: ClientProfile;
    matters: ClientMatterSummary[];
    intakes: ClientIntakeSummary[];
    infoRequests: ClientInfoRequestSummary[];
  };
  error?: string;
};

export type ActiveClient = {
  userId: string;
  email: string;
  fullName: string | null;
  matterCount: number;
  lastActivity: string | null;
};

export type ActiveClientsResult = {
  success: boolean;
  data?: ActiveClient[];
  error?: string;
};

export type MatterEmail = {
  id: string;
  gmailMessageId: string;
  direction: "sent" | "received";
  fromEmail: string;
  toEmail: string;
  subject: string | null;
  snippet: string | null;
  aiSummary: string | null;
  actionNeeded: boolean;
  gmailDate: string;
  gmailLink: string | null;
};

type DataSource = "supabase" | "mock";

// Get today's date in ISO format for mock data
const getTodayISO = () => new Date().toISOString().split("T")[0];

// Get a date N days from today in ISO format
const getDateFromTodayISO = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

const matterFallback: MatterSummary[] = [
  {
    id: "mock-1",
    title: "Policy Review - Evergreen",
    stage: "Under Review",
    nextAction: "Draft review pack",
    nextActionDueDate: getDateFromTodayISO(-2), // Overdue by 2 days
    dueDate: getDateFromTodayISO(-2),
    responsibleParty: "lawyer",
    billingModel: "flat",
    matterType: "Policy Review",
    updatedAt: new Date().toISOString(),
    createdAt: getDateFromTodayISO(-10),
    clientName: "Evergreen Counseling",
  },
  {
    id: "mock-2",
    title: "Contract - Lotus Clinic",
    stage: "Waiting on Client",
    nextAction: "Nudge client",
    nextActionDueDate: getTodayISO(), // Due today
    dueDate: getTodayISO(),
    responsibleParty: "client",
    billingModel: "hourly",
    matterType: "Contract Review",
    updatedAt: new Date().toISOString(),
    createdAt: getDateFromTodayISO(-7),
    clientName: "Lotus Clinic",
  },
  {
    id: "mock-3",
    title: "Employment Agreement - Sunrise",
    stage: "Drafting",
    nextAction: "Send initial draft",
    nextActionDueDate: getDateFromTodayISO(3), // Due in 3 days
    dueDate: getDateFromTodayISO(3),
    responsibleParty: "staff",
    billingModel: "flat",
    matterType: "Employment Agreement",
    updatedAt: new Date().toISOString(),
    createdAt: getDateFromTodayISO(-5),
    clientName: "Sunrise Therapy",
  },
  {
    id: "mock-4",
    title: "Intake Form - Parker Therapy",
    stage: "Intake Received",
    nextAction: "Review intake responses",
    nextActionDueDate: getTodayISO(),
    dueDate: getTodayISO(),
    responsibleParty: "lawyer",
    billingModel: "flat",
    matterType: "Contract Review",
    updatedAt: new Date().toISOString(),
    createdAt: getDateFromTodayISO(-2),
    clientName: "Parker Therapy",
  },
  {
    id: "mock-5",
    title: "Policy Update - Wellness Center",
    stage: "Intake Sent",
    nextAction: "Complete intake form",
    nextActionDueDate: getDateFromTodayISO(2),
    dueDate: getDateFromTodayISO(2),
    responsibleParty: "client",
    billingModel: "hourly",
    matterType: "Policy Review",
    updatedAt: new Date().toISOString(),
    createdAt: getDateFromTodayISO(-4),
    clientName: "Wellness Center",
  },
];

const taskFallback: TaskSummary[] = [
  {
    id: "mock-task-1",
    title: "Approve conflict check - Parker Therapy",
    dueDate: new Date().toISOString(),
    status: "open",
    responsibleParty: "lawyer",
    matterId: "mock-1",
  },
  {
    id: "mock-task-2",
    title: "Upload W9 - Evergreen Counseling",
    dueDate: null,
    status: "open",
    responsibleParty: "client",
    matterId: "mock-2",
  },
];

const invoiceFallback: InvoiceSummary[] = [
  {
    id: "mock-invoice-1",
    matterId: "mock-1",
    status: "sent",
    totalCents: 180000,
    dueDate: null,
    squareInvoiceId: null,
  },
];

const timeFallback: TimeEntrySummary[] = [
  {
    id: "mock-time-1",
    matterId: "mock-1",
    taskId: "mock-task-1",
    status: "draft",
    description: "Review intake and prep notes",
    durationMinutes: 45,
    startedAt: new Date().toISOString(),
    endedAt: null,
  },
];

/**
 * Fetch all matters with React cache for request deduplication.
 * Multiple calls within the same request will be deduplicated automatically.
 */
export const fetchMatters = cache(async (): Promise<{
  data: MatterSummary[];
  source: DataSource;
  error?: string;
}> => {
  if (!supabaseEnvReady()) {
    return { data: matterFallback, source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("matters")
      .select(
        "id,title,stage,next_action,next_action_due_date,responsible_party,billing_model,matter_type,updated_at,created_at,client:profiles!matters_client_id_fkey(full_name)",
      )
      .order("next_action_due_date", { ascending: true });

    if (error || !data) {
      return {
        data: matterFallback,
        source: "mock",
        error: error?.message || "No matter data returned",
      };
    }

    return {
      data: data.map(mapMatter),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: matterFallback, source: "mock", error: message };
  }
});

/**
 * Fetch all tasks with React cache for request deduplication.
 */
export const fetchTasks = cache(async (): Promise<{
  data: TaskSummary[];
  source: DataSource;
  error?: string;
}> => {
  if (!supabaseEnvReady()) {
    return { data: taskFallback, source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id,title,due_date,status,responsible_party,matter_id",
      )
      .order("due_date", { ascending: true, nullsFirst: true });

    if (error || !data) {
      return {
        data: taskFallback,
        source: "mock",
        error: error?.message || "No task data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        status: row.status,
        responsibleParty: row.responsible_party,
        matterId: row.matter_id,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: taskFallback, source: "mock", error: message };
  }
});

export async function fetchTasksForMatter(matterId: string): Promise<{
  data: TaskSummary[];
  source: DataSource;
  error?: string;
}> {
  if (!supabaseEnvReady()) {
    return { data: taskFallback.filter(t => t.matterId === matterId), source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id,title,due_date,status,responsible_party,matter_id",
      )
      .eq("matter_id", matterId)
      .order("due_date", { ascending: true, nullsFirst: true });

    if (error || !data) {
      return {
        data: taskFallback.filter(t => t.matterId === matterId),
        source: "mock",
        error: error?.message || "No task data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        status: row.status,
        responsibleParty: row.responsible_party,
        matterId: row.matter_id,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: taskFallback.filter(t => t.matterId === matterId), source: "mock", error: message };
  }
}

/**
 * Fetch all invoices with React cache for request deduplication.
 */
export const fetchInvoices = cache(async (): Promise<{
  data: InvoiceSummary[];
  source: DataSource;
  error?: string;
}> => {
  if (!supabaseEnvReady()) {
    return { data: invoiceFallback, source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("invoices")
      .select("id,matter_id,status,total_cents,due_date,square_invoice_id")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return {
        data: invoiceFallback,
        source: "mock",
        error: error?.message || "No invoice data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        matterId: row.matter_id,
        status: row.status,
        totalCents: row.total_cents,
        dueDate: row.due_date,
        squareInvoiceId: row.square_invoice_id,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: invoiceFallback, source: "mock", error: message };
  }
});

export async function getInvoice(invoiceId: string): Promise<{
  data: {
    id: string;
    matterId: string;
    matterTitle: string;
    clientEmail: string | null;
    clientName: string | null;
    status: string;
    totalCents: number;
    dueDate: string | null;
    squareInvoiceId: string | null;
    lineItems: Array<{
      description: string;
      hours?: number;
      rate?: number;
      amount: number;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
  error?: string;
}> {
  if (!supabaseEnvReady()) {
    return { data: null, error: "Supabase not configured" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        matter_id,
        status,
        total_cents,
        due_date,
        square_invoice_id,
        line_items,
        created_at,
        updated_at,
        matters (
          title,
          client_id
        )
      `)
      .eq("id", invoiceId)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message || "Invoice not found" };
    }

    // Get client info if client_id exists
    let clientEmail: string | null = null;
    let clientName: string | null = null;

    const matter = data.matters as { title: string; client_id: string | null } | null;

    if (matter?.client_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", matter.client_id)
        .single();

      const { data: { user } } = await supabase.auth.admin.getUserById(matter.client_id);

      clientEmail = user?.email || null;
      clientName = profile?.full_name || null;
    }

    return {
      data: {
        id: data.id,
        matterId: data.matter_id,
        matterTitle: matter?.title || "Unknown Matter",
        clientEmail,
        clientName,
        status: data.status,
        totalCents: data.total_cents,
        dueDate: data.due_date,
        squareInvoiceId: data.square_invoice_id,
        lineItems: (data.line_items as Array<{
          description: string;
          hours?: number;
          rate?: number;
          amount: number;
        }>) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Fetch all time entries with React cache for request deduplication.
 */
export const fetchTimeEntries = cache(async (): Promise<{
  data: TimeEntrySummary[];
  source: DataSource;
  error?: string;
}> => {
  if (!supabaseEnvReady()) {
    return { data: timeFallback, source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("time_entries")
      .select(
        "id,matter_id,task_id,status,description,duration_minutes,started_at,ended_at",
      )
      .order("started_at", { ascending: false });

    if (error || !data) {
      return {
        data: timeFallback,
        source: "mock",
        error: error?.message || "No time entry data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        matterId: row.matter_id,
        taskId: row.task_id,
        status: row.status,
        description: row.description,
        durationMinutes: row.duration_minutes,
        startedAt: row.started_at,
        endedAt: row.ended_at,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: timeFallback, source: "mock", error: message };
  }
});

export async function fetchTimeEntriesForMatter(matterId: string): Promise<{
  data: TimeEntrySummary[];
  source: DataSource;
  error?: string;
}> {
  if (!supabaseEnvReady()) {
    return { data: timeFallback.filter(t => t.matterId === matterId), source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("time_entries")
      .select(
        "id,matter_id,task_id,status,description,duration_minutes,started_at,ended_at",
      )
      .eq("matter_id", matterId)
      .order("started_at", { ascending: false });

    if (error || !data) {
      return {
        data: timeFallback.filter(t => t.matterId === matterId),
        source: "mock",
        error: error?.message || "No time entry data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        matterId: row.matter_id,
        taskId: row.task_id,
        status: row.status,
        description: row.description,
        durationMinutes: row.duration_minutes,
        startedAt: row.started_at,
        endedAt: row.ended_at,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: timeFallback.filter(t => t.matterId === matterId), source: "mock", error: message };
  }
}

/**
 * Helper function to map database row to MatterSummary
 */
function mapMatter(row: {
  id: string;
  title: string;
  stage: string;
  next_action: string;
  next_action_due_date: string;
  responsible_party: string;
  billing_model: string;
  matter_type: string;
  updated_at: string;
  created_at: string;
  client?: { full_name: string | null } | null;
}): MatterSummary {
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    nextAction: row.next_action,
    nextActionDueDate: row.next_action_due_date,
    dueDate: row.next_action_due_date, // Alias for backwards compatibility
    responsibleParty: row.responsible_party,
    billingModel: row.billing_model,
    matterType: row.matter_type,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    clientName: row.client?.full_name || null,
  };
}

export type MatterFilters = {
  stages?: string[];
  matterTypes?: string[];
  searchQuery?: string;
};

export async function fetchMattersWithFilters(
  filters: MatterFilters = {},
): Promise<{
  data: MatterSummary[];
  source: DataSource;
  error?: string;
}> {
  const { stages, matterTypes, searchQuery } = filters;

  if (!supabaseEnvReady()) {
    // Apply filters to mock data
    let filtered = [...matterFallback];

    if (stages && stages.length > 0) {
      filtered = filtered.filter((m) => stages.includes(m.stage));
    }

    if (matterTypes && matterTypes.length > 0) {
      filtered = filtered.filter((m) => matterTypes.includes(m.matterType));
    }

    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          (m.clientName && m.clientName.toLowerCase().includes(query)) ||
          (m.nextAction && m.nextAction.toLowerCase().includes(query)),
      );
    }

    return { data: filtered, source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    let query = supabase.from("matters").select(
      `id,title,stage,next_action,next_action_due_date,responsible_party,billing_model,matter_type,updated_at,created_at,client:profiles!matters_client_id_fkey(full_name)`,
    );

    // Apply stage filter
    if (stages && stages.length > 0) {
      query = query.in("stage", stages);
    }

    // Apply matter type filter
    if (matterTypes && matterTypes.length > 0) {
      query = query.in("matter_type", matterTypes);
    }

    // Apply search filter (searches title for now, client name is filtered post-query)
    // Note: Supabase ilike can be used for server-side text search
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.trim()}%`;
      query = query.or(`title.ilike.${searchTerm},next_action.ilike.${searchTerm}`);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        data: matterFallback,
        source: "mock",
        error: error?.message || "No matter data returned",
      };
    }

    let mapped = data.map(mapMatter);

    // Apply client name search filter post-query (since it's from joined table)
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      mapped = mapped.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          (m.clientName && m.clientName.toLowerCase().includes(query)) ||
          (m.nextAction && m.nextAction.toLowerCase().includes(query)),
      );
    }

    return {
      data: mapped,
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: matterFallback, source: "mock", error: message };
  }
}

/**
 * Fetch matters awaiting intake review (stage = "Intake Received")
 */
export async function fetchMattersAwaitingReview() {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { data: [], source: "mock" as const };
  }

  if (!supabaseEnvReady()) {
    return {
      data: matterFallback.filter((m) => m.stage === "Intake Received"),
      source: "mock" as const,
    };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("matters")
    .select("*, client:profiles!matters_client_id_fkey(full_name)")
    .eq("stage", "Intake Received")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching matters awaiting review:", error);
    return { data: [], source: "supabase" as const, error: error.message };
  }

  return {
    data: (data || []).map(mapMatter),
    source: "supabase" as const,
  };
}

/**
 * Fetch matters awaiting client intake (stage = "Intake Sent")
 */
export async function fetchMattersAwaitingIntake() {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { data: [], source: "mock" as const };
  }

  if (!supabaseEnvReady()) {
    return {
      data: matterFallback.filter((m) => m.stage === "Intake Sent"),
      source: "mock" as const,
    };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("matters")
    .select("*, client:profiles!matters_client_id_fkey(full_name)")
    .eq("stage", "Intake Sent")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching matters awaiting intake:", error);
    return { data: [], source: "supabase" as const, error: error.message };
  }

  return {
    data: (data || []).map(mapMatter),
    source: "supabase" as const,
  };
}

/**
 * Fetch overdue matters where responsible_party = lawyer/staff
 */
export async function fetchOverdueMatters() {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { data: [], source: "mock" as const };
  }

  if (!supabaseEnvReady()) {
    const today = new Date().toISOString().split("T")[0];
    return {
      data: matterFallback.filter(
        (m) => m.nextActionDueDate < today && m.responsibleParty !== "client"
      ),
      source: "mock" as const,
    };
  }

  const supabase = supabaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("matters")
    .select("*, client:profiles!matters_client_id_fkey(full_name)")
    .lt("next_action_due_date", today)
    .neq("responsible_party", "client")
    .neq("stage", "Completed")
    .neq("stage", "Archived")
    .order("next_action_due_date", { ascending: true });

  if (error) {
    console.error("Error fetching overdue matters:", error);
    return { data: [], source: "supabase" as const, error: error.message };
  }

  return {
    data: (data || []).map(mapMatter),
    source: "supabase" as const,
  };
}

/**
 * Fetch client invitations grouped by status
 */
export async function fetchClientInvitations(): Promise<{
  pending: ClientInvitation[];
  completed: ClientInvitation[];
  expired: ClientInvitation[];
  source: DataSource;
  error?: string;
}> {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { pending: [], completed: [], expired: [], source: "mock" };
  }

  if (!supabaseEnvReady()) {
    // Mock data for development
    const mockInvitation: ClientInvitation = {
      id: "mock-invite-1",
      inviteCode: "ABC123",
      clientName: "John Doe",
      clientEmail: "john@example.com",
      matterType: "Contract Review",
      notes: "Phone consultation follow-up",
      status: "pending",
      invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      daysAgo: 2,
    };

    return {
      pending: [mockInvitation],
      completed: [],
      expired: [],
      source: "mock",
    };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("client_invitations")
      .select("*")
      .order("invited_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return {
        pending: [],
        completed: [],
        expired: [],
        source: "supabase",
        error: error.message,
      };
    }

    const now = new Date();
    const mapped = (data || []).map((inv) => ({
      id: inv.id,
      inviteCode: inv.invite_code,
      clientName: inv.client_name,
      clientEmail: inv.client_email,
      matterType: inv.matter_type,
      notes: inv.notes,
      status: inv.status,
      invitedAt: inv.invited_at,
      expiresAt: inv.expires_at,
      daysAgo: inv.invited_at
        ? Math.floor(
            (now.getTime() - new Date(inv.invited_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0,
    }));

    return {
      pending: mapped.filter((i) => i.status === "pending"),
      completed: mapped.filter((i) => i.status === "completed"),
      expired: mapped.filter((i) => i.status === "expired"),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      pending: [],
      completed: [],
      expired: [],
      source: "supabase",
      error: message,
    };
  }
}

/**
 * Fetch intake submissions grouped by review status
 */
export async function fetchIntakesByReviewStatus(): Promise<{
  pending: IntakeReview[];
  underReview: IntakeReview[];
  source: DataSource;
  error?: string;
}> {
  const { session } = await getSessionWithProfile();

  if (!session) {
    return { pending: [], underReview: [], source: "mock" };
  }

  if (!supabaseEnvReady()) {
    // Mock data
    const mockIntake: IntakeReview = {
      id: "mock-intake-1",
      matterId: "mock-matter-1",
      formType: "Contract Review",
      reviewStatus: "pending",
      submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      responses: {
        full_name: "Jane Smith",
        email: "jane@example.com",
        company_name: "Acme Corp",
      },
      internalNotes: null,
      isNew: true,
      clientEmail: "jane@example.com",
      clientName: "Jane Smith",
    };

    return {
      pending: [mockIntake],
      underReview: [],
      source: "mock",
    };
  }

  try {
    const supabase = supabaseAdmin();

    // Fetch intake responses with joined matter to get client_id
    const { data, error } = await supabase
      .from("intake_responses")
      .select(`
        *,
        matters!intake_responses_matter_id_fkey (
          client_id
        )
      `)
      .in("review_status", ["pending", "under_review"])
      .order("submitted_at", { ascending: false });

    if (error) {
      console.error("Error fetching intake reviews:", error);
      return {
        pending: [],
        underReview: [],
        source: "supabase",
        error: error.message,
      };
    }

    // Collect all client IDs to fetch their emails in bulk
    const clientIds = (data || [])
      .map((intake) => (intake.matters as { client_id: string | null })?.client_id)
      .filter((id): id is string => id !== null && id !== undefined);

    // Fetch client profiles
    const profileMap = new Map<string, string>();
    if (clientIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", clientIds);

      if (profiles) {
        profiles.forEach((p) => profileMap.set(p.user_id, p.full_name || ""));
      }
    }

    // Fetch client emails from auth
    const emailMap = new Map<string, string>();
    for (const clientId of clientIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(clientId);
      if (userData?.user?.email) {
        emailMap.set(clientId, userData.user.email);
      }
    }

    const now = new Date();
    const mapped = (data || []).map((intake) => {
      const matter = intake.matters as { client_id: string | null } | null;
      const clientId = matter?.client_id || null;
      const clientEmail = clientId ? emailMap.get(clientId) || null : null;
      const clientName = clientId ? profileMap.get(clientId) || null : null;

      return {
        id: intake.id,
        matterId: intake.matter_id,
        formType: intake.form_type,
        reviewStatus: intake.review_status || "pending",
        submittedAt: intake.submitted_at,
        responses: (intake.responses as Record<string, any>) || {},
        internalNotes: intake.internal_notes,
        isNew: intake.submitted_at
          ? now.getTime() - new Date(intake.submitted_at).getTime() < 24 * 60 * 60 * 1000
          : false,
        clientEmail,
        clientName,
      };
    });

    return {
      pending: mapped.filter((i) => i.reviewStatus === "pending"),
      underReview: mapped.filter((i) => i.reviewStatus === "under_review"),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { pending: [], underReview: [], source: "supabase", error: message };
  }
}

/**
 * Practice Settings
 */

export type PracticeSettings = {
  id: string;
  firmName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  defaultHourlyRate: number | null;
  paymentTermsDays: number;
  lateFeePercentage: number;
  autoRemindersEnabled: boolean;
  matterTypes: string[];
  createdAt: string;
  updatedAt: string;
};

export async function getPracticeSettings(): Promise<{
  data: PracticeSettings | null;
  source: "supabase" | "mock";
}> {
  if (!supabaseEnvReady()) {
    return {
      data: {
        id: "mock-settings",
        firmName: "Mock Law Firm",
        contactEmail: "contact@mocklaw.com",
        contactPhone: "(555) 123-4567",
        address: "123 Main St, Suite 100\nMock City, MC 12345",
        defaultHourlyRate: 250.0,
        paymentTermsDays: 30,
        lateFeePercentage: 5.0,
        autoRemindersEnabled: true,
        matterTypes: [
          "Contract Review",
          "Employment Agreement",
          "Policy Review",
          "Litigation",
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      source: "mock" as const,
    };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("practice_settings")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Error fetching practice settings:", error);
    return { data: null, source: "supabase" as const };
  }

  if (!data) {
    return { data: null, source: "supabase" as const };
  }

  return {
    data: {
      id: data.id,
      firmName: data.firm_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      address: data.address,
      defaultHourlyRate: data.default_hourly_rate,
      paymentTermsDays: data.payment_terms_days ?? 30,
      lateFeePercentage: data.late_fee_percentage ?? 0,
      autoRemindersEnabled: data.auto_reminders_enabled ?? false,
      matterTypes: (data.matter_types as string[]) || [],
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    },
    source: "supabase" as const,
  };
}

/**
 * Gmail credentials for sending emails
 */
export type GmailCredentials = {
  refreshToken: string;
  fromEmail: string;
  fromName: string;
};

/**
 * Get Gmail credentials from practice_settings for sending emails
 * Returns null if Gmail is not configured
 */
export async function getGmailCredentials(): Promise<GmailCredentials | null> {
  if (!supabaseEnvReady()) {
    return null;
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("practice_settings")
    .select("google_refresh_token, contact_email, firm_name")
    .limit(1)
    .single();

  if (error || !data?.google_refresh_token || !data?.contact_email) {
    return null;
  }

  return {
    refreshToken: data.google_refresh_token,
    fromEmail: data.contact_email,
    fromName: data.firm_name || "MatterFlow",
  };
}

/**
 * Fetch all client users (role='client')
 */
export async function fetchClients(): Promise<{
  data: Array<{ id: string; fullName: string }>;
  source: "supabase" | "mock";
}> {
  if (!supabaseEnvReady()) {
    return {
      data: [
        {
          id: "00000000-0000-0000-0000-000000000002",
          fullName: "Client One",
        },
      ],
      source: "mock",
    };
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("role", "client")
    .order("full_name");

  if (error) {
    console.error("Error fetching clients:", error);
    return { data: [], source: "supabase" };
  }

  return {
    data: (data || []).map((client) => ({
      id: client.user_id,
      fullName: client.full_name || "Unknown",
    })),
    source: "supabase",
  };
}

/**
 * Info Request types and queries
 */

export type InfoRequestSummary = {
  id: string;
  intakeResponseId: string;
  requestedBy: {
    userId: string;
    fullName: string;
  } | null;
  questions: Record<string, any>;
  message: string | null;
  documents: Record<string, any> | null;
  responseDeadline: string | null;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  responses: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

export type InfoRequestDetail = InfoRequestSummary & {
  intakeResponse: {
    id: string;
    matterId: string;
    formType: string;
    matter: {
      id: string;
      title: string;
      clientId: string | null;
      client: {
        userId: string;
        fullName: string;
      } | null;
    } | null;
  } | null;
};

/**
 * Get all info requests for an intake response
 */
export async function getInfoRequests(
  intakeResponseId: string
): Promise<{
  data: InfoRequestSummary[];
  source: DataSource;
}> {
  if (!supabaseEnvReady()) {
    return { data: [], source: "supabase" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("info_requests")
      .select(
        `
        *,
        requestedBy:profiles!info_requests_requested_by_fkey(
          user_id,
          full_name
        )
      `
      )
      .eq("intake_response_id", intakeResponseId)
      .order("requested_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching info requests:", error);
      return { data: [], source: "supabase" };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        intakeResponseId: row.intake_response_id,
        requestedBy: row.requestedBy
          ? {
              userId: row.requestedBy.user_id,
              fullName: row.requestedBy.full_name || "Unknown",
            }
          : null,
        questions: (row.questions as Record<string, any>) || {},
        message: row.message,
        documents: row.documents as Record<string, any> | null,
        responseDeadline: row.response_deadline,
        status: row.status,
        requestedAt: row.requested_at,
        respondedAt: row.responded_at,
        responses: row.responses as Record<string, any> | null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching info requests:", message);
    return { data: [], source: "supabase" };
  }
}

/**
 * Get a single info request by ID with full context
 */
export async function getInfoRequestById(
  id: string
): Promise<{
  data: InfoRequestDetail | null;
  source: DataSource;
}> {
  if (!supabaseEnvReady()) {
    return { data: null, source: "supabase" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("info_requests")
      .select(
        `
        *,
        requestedBy:profiles!info_requests_requested_by_fkey(
          user_id,
          full_name
        ),
        intakeResponse:intake_responses!info_requests_intake_response_id_fkey(
          id,
          matter_id,
          form_type,
          matter:matters!intake_responses_matter_id_fkey(
            id,
            title,
            client_id,
            client:profiles!matters_client_id_fkey(
              user_id,
              full_name
            )
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching info request by ID:", error);
      return { data: null, source: "supabase" };
    }

    return {
      data: {
        id: data.id,
        intakeResponseId: data.intake_response_id,
        requestedBy: data.requestedBy
          ? {
              userId: data.requestedBy.user_id,
              fullName: data.requestedBy.full_name || "Unknown",
            }
          : null,
        questions: (data.questions as Record<string, any>) || {},
        message: data.message,
        documents: data.documents as Record<string, any> | null,
        responseDeadline: data.response_deadline,
        status: data.status,
        requestedAt: data.requested_at,
        respondedAt: data.responded_at,
        responses: data.responses as Record<string, any> | null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        intakeResponse: data.intakeResponse
          ? {
              id: data.intakeResponse.id,
              matterId: data.intakeResponse.matter_id,
              formType: data.intakeResponse.form_type,
              matter: data.intakeResponse.matter
                ? {
                    id: data.intakeResponse.matter.id,
                    title: data.intakeResponse.matter.title,
                    clientId: data.intakeResponse.matter.client_id,
                    client: data.intakeResponse.matter.client
                      ? {
                          userId: data.intakeResponse.matter.client.user_id,
                          fullName: data.intakeResponse.matter.client.full_name || "Unknown",
                        }
                      : null,
                  }
                : null,
            }
          : null,
      },
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching info request by ID:", message);
    return { data: null, source: "supabase" };
  }
}

// ============================================================================
// Client Profile Queries
// ============================================================================

export async function getClientProfile(userId: string): Promise<ClientProfileResult> {
  if (!supabaseEnvReady()) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const supabase = supabaseAdmin();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Client not found" };
    }

    // Validate that the user is actually a client
    if (profile.role !== "client") {
      return { success: false, error: "User is not a client" };
    }

    // Get email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email || "";

    // Get matters for this client
    const { data: matters } = await supabase
      .from("matters")
      .select("id, title, stage, matter_type, created_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false });

    // Get intake responses via matters
    const matterIds = (matters || []).map((m) => m.id);
    let intakes: { id: string; form_type: string; status: string; submitted_at: string | null; matter_id: string }[] = [];
    if (matterIds.length > 0) {
      const { data: intakeData } = await supabase
        .from("intake_responses")
        .select("id, form_type, status, submitted_at, matter_id")
        .in("matter_id", matterIds);
      intakes = intakeData || [];
    }

    // Get info requests for intakes
    const intakeIds = intakes.map((i) => i.id);
    let infoRequests: { id: string; status: string; questions: unknown; created_at: string; responded_at: string | null; intake_response_id: string }[] = [];
    if (intakeIds.length > 0) {
      const { data: irData } = await supabase
        .from("info_requests")
        .select("id, status, questions, created_at, responded_at, intake_response_id")
        .in("intake_response_id", intakeIds);
      infoRequests = irData || [];
    }

    return {
      success: true,
      data: {
        profile: {
          userId: profile.user_id,
          email,
          fullName: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          phoneType: profile.phone_type,
          phoneSecondary: profile.phone_secondary,
          phoneSecondaryType: profile.phone_secondary_type,
          companyName: profile.company_name,
          addressStreet: profile.address_street,
          addressCity: profile.address_city,
          addressState: profile.address_state,
          addressZip: profile.address_zip,
          addressCountry: profile.address_country,
          emergencyContactName: profile.emergency_contact_name,
          emergencyContactPhone: profile.emergency_contact_phone,
          preferredContactMethod: profile.preferred_contact_method,
          internalNotes: profile.internal_notes,
          createdAt: profile.created_at,
        },
        matters: (matters || []).map((m) => ({
          id: m.id,
          title: m.title,
          stage: m.stage,
          matterType: m.matter_type,
          createdAt: m.created_at,
        })),
        intakes: intakes.map((i) => ({
          id: i.id,
          formType: i.form_type,
          status: i.status,
          submittedAt: i.submitted_at,
        })),
        infoRequests: infoRequests.map((ir) => ({
          id: ir.id,
          status: ir.status,
          questionCount: Array.isArray(ir.questions) ? ir.questions.length : 0,
          createdAt: ir.created_at,
          respondedAt: ir.responded_at,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching client profile:", error);
    return { success: false, error: "Failed to fetch client profile" };
  }
}

export async function getActiveClients(): Promise<ActiveClientsResult> {
  if (!supabaseEnvReady()) {
    return { success: false, error: "Database not configured" };
  }

  try {
    const supabase = supabaseAdmin();

    // Get all client profiles
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, data: [] };
    }

    // Get all matters for these clients in bulk
    const userIds = profiles.map(p => p.user_id);
    const { data: allMatters } = await supabase
      .from("matters")
      .select("client_id, updated_at")
      .in("client_id", userIds);

    // Aggregate matter stats in memory
    const matterStats = new Map<string, { count: number; lastActivity: string | null }>();
    for (const matter of allMatters || []) {
      if (!matter.client_id) continue; // Skip matters without a client
      const existing = matterStats.get(matter.client_id) || { count: 0, lastActivity: null };
      matterStats.set(matter.client_id, {
        count: existing.count + 1,
        lastActivity: !existing.lastActivity || matter.updated_at > existing.lastActivity
          ? matter.updated_at
          : existing.lastActivity,
      });
    }

    // Build client list (still need individual email lookups - unavoidable with Supabase)
    const clients: ActiveClient[] = [];
    for (const profile of profiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email || "";
      const stats = matterStats.get(profile.user_id) || { count: 0, lastActivity: null };

      clients.push({
        userId: profile.user_id,
        email,
        fullName: profile.full_name,
        matterCount: stats.count,
        lastActivity: stats.lastActivity || profile.created_at,
      });
    }

    return { success: true, data: clients };
  } catch (error) {
    console.error("Error fetching active clients:", error);
    return { success: false, error: "Failed to fetch active clients" };
  }
}

/**
 * Fetch matters for the current client (client_id = current user)
 */
export async function fetchMattersForClient(): Promise<{
  data: MatterSummary[];
  source: DataSource;
  error?: string;
}> {
  const { session, profile } = await getSessionWithProfile();

  if (!session || profile?.role !== "client") {
    return { data: [], source: "mock" };
  }

  if (!supabaseEnvReady()) {
    return { data: [], source: "mock" };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("matters")
      .select(
        "id,title,stage,next_action,next_action_due_date,responsible_party,billing_model,matter_type,updated_at,created_at"
      )
      .eq("client_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (error || !data) {
      return {
        data: [],
        source: "supabase",
        error: error?.message || "No matter data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        title: row.title,
        stage: row.stage,
        nextAction: row.next_action,
        nextActionDueDate: row.next_action_due_date,
        dueDate: row.next_action_due_date, // Alias for backwards compatibility
        responsibleParty: row.responsible_party,
        billingModel: row.billing_model,
        matterType: row.matter_type,
        clientName: null,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      })),
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: [], source: "mock", error: message };
  }
}

/**
 * Check if client has pending intake forms
 */
export async function getClientPendingIntake(): Promise<{
  hasPendingIntake: boolean;
  matterId: string | null;
  matterTitle: string | null;
}> {
  const { session, profile } = await getSessionWithProfile();

  if (!session || profile?.role !== "client") {
    return { hasPendingIntake: false, matterId: null, matterTitle: null };
  }

  if (!supabaseEnvReady()) {
    return { hasPendingIntake: false, matterId: null, matterTitle: null };
  }

  try {
    const supabase = supabaseAdmin();

    // Find matters in "Intake Sent" stage where this client is assigned
    const { data: matters } = await supabase
      .from("matters")
      .select("id, title")
      .eq("client_id", session.user.id)
      .eq("stage", "Intake Sent")
      .limit(1)
      .maybeSingle();

    if (matters) {
      return {
        hasPendingIntake: true,
        matterId: matters.id,
        matterTitle: matters.title,
      };
    }

    return { hasPendingIntake: false, matterId: null, matterTitle: null };
  } catch {
    return { hasPendingIntake: false, matterId: null, matterTitle: null };
  }
}

// In-memory cache for firm settings
let firmSettingsCache: FirmSettings | null = null;
let firmSettingsCacheTime: number = 0;
const FIRM_SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get firm settings for email branding
 * Cached in memory for 5 minutes to avoid DB hits on every email
 */
export async function getFirmSettings(): Promise<FirmSettings> {
  // Check cache first
  const now = Date.now();
  if (firmSettingsCache && now - firmSettingsCacheTime < FIRM_SETTINGS_CACHE_TTL) {
    return firmSettingsCache;
  }

  if (!supabaseEnvReady()) {
    return DEFAULT_FIRM_SETTINGS;
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("firm_settings")
      .select("key, value");

    if (error || !data) {
      console.error("Error fetching firm settings:", error);
      return DEFAULT_FIRM_SETTINGS;
    }

    // Convert array of key-value pairs to object
    const settings: FirmSettings = { ...DEFAULT_FIRM_SETTINGS };
    for (const row of data) {
      if (row.key in settings) {
        (settings as unknown as Record<string, string | null>)[row.key] = row.value;
      }
    }

    // Update cache
    firmSettingsCache = settings;
    firmSettingsCacheTime = now;

    return settings;
  } catch (err) {
    console.error("Error fetching firm settings:", err);
    return DEFAULT_FIRM_SETTINGS;
  }
}

/**
 * Invalidate firm settings cache (call after updates)
 */
export function invalidateFirmSettingsCache(): void {
  firmSettingsCache = null;
  firmSettingsCacheTime = 0;
}

/**
 * Get emails associated with a matter
 */
export async function getMatterEmails(matterId: string): Promise<MatterEmail[]> {
  if (!supabaseEnvReady()) return [];

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("matter_emails")
    .select("*")
    .eq("matter_id", matterId)
    .order("gmail_date", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    direction: row.direction as "sent" | "received",
    fromEmail: row.from_email,
    toEmail: row.to_email,
    subject: row.subject,
    snippet: row.snippet,
    aiSummary: row.ai_summary,
    actionNeeded: row.action_needed ?? false,
    gmailDate: row.gmail_date,
    gmailLink: row.gmail_link,
  }));
}
