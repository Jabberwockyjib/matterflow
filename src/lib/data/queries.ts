import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";
import { getSessionWithProfile } from "@/lib/auth/server";
import type { Database } from "@/types/database.types";

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
  invitedAt: string;
  expiresAt: string;
  daysAgo: number;
};

export type IntakeReview = {
  id: string;
  matterId: string;
  formType: string;
  reviewStatus: string;
  submittedAt: string;
  responses: Record<string, any>;
  internalNotes: string | null;
  isNew: boolean;
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

export async function fetchMatters(): Promise<{
  data: MatterSummary[];
  source: DataSource;
  error?: string;
}> {
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
}

export async function fetchTasks(): Promise<{
  data: TaskSummary[];
  source: DataSource;
  error?: string;
}> {
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
}

export async function fetchInvoices(): Promise<{
  data: InvoiceSummary[];
  source: DataSource;
  error?: string;
}> {
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
}

export async function fetchTimeEntries(): Promise<{
  data: TimeEntrySummary[];
  source: DataSource;
  error?: string;
}> {
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
      invitedAt: inv.invited_at || "",
      expiresAt: inv.expires_at || "",
      daysAgo: Math.floor(
        (now.getTime() - new Date(inv.invited_at || 0).getTime()) / (1000 * 60 * 60 * 24)
      ),
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
    };

    return {
      pending: [mockIntake],
      underReview: [],
      source: "mock",
    };
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("intake_responses")
      .select("*")
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

    const now = new Date();
    const mapped = (data || []).map((intake) => ({
      id: intake.id,
      matterId: intake.matter_id,
      formType: intake.form_type,
      reviewStatus: intake.review_status || "pending",
      submittedAt: intake.submitted_at || "",
      responses: (intake.responses as Record<string, any>) || {},
      internalNotes: intake.internal_notes,
      isNew: Boolean(
        intake.submitted_at &&
        now.getTime() - new Date(intake.submitted_at).getTime() < 24 * 60 * 60 * 1000
      ),
    }));

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