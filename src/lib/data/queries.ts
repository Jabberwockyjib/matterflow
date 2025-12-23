import { supabaseAdmin, supabaseEnvReady } from "@/lib/supabase/server";

export type MatterSummary = {
  id: string;
  title: string;
  stage: string;
  nextAction: string | null;
  responsibleParty: string;
  billingModel: string;
  matterType: string;
  updatedAt: string;
};

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

type DataSource = "supabase" | "mock";

const matterFallback: MatterSummary[] = [
  {
    id: "mock-1",
    title: "Policy Review – Evergreen",
    stage: "Under Review",
    nextAction: "Draft review pack",
    responsibleParty: "lawyer",
    billingModel: "flat",
    matterType: "Policy Review",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mock-2",
    title: "Contract – Lotus Clinic",
    stage: "Waiting on Client",
    nextAction: "Nudge client",
    responsibleParty: "client",
    billingModel: "hourly",
    matterType: "Contract Review",
    updatedAt: new Date().toISOString(),
  },
];

const taskFallback: TaskSummary[] = [
  {
    id: "mock-task-1",
    title: "Approve conflict check – Parker Therapy",
    dueDate: new Date().toISOString(),
    status: "open",
    responsibleParty: "lawyer",
    matterId: "mock-1",
  },
  {
    id: "mock-task-2",
    title: "Upload W9 – Evergreen Counseling",
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
        "id,title,stage,next_action,responsible_party,billing_model,matter_type,updated_at",
      );

    if (error || !data) {
      return {
        data: matterFallback,
        source: "mock",
        error: error?.message || "No matter data returned",
      };
    }

    return {
      data: data.map((row) => ({
        id: row.id,
        title: row.title,
        stage: row.stage,
        nextAction: row.next_action,
        responsibleParty: row.responsible_party,
        billingModel: row.billing_model,
        matterType: row.matter_type,
        updatedAt: row.updated_at,
      })),
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
