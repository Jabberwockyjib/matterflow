-- Core extensions
create extension if not exists "pgcrypto";

-- Role model
do $$
begin
  if not exists (select 1 from pg_type typ join pg_namespace nsp on typ.typnamespace = nsp.oid where typ.typname = 'user_role') then
    create type public.user_role as enum ('admin', 'staff', 'client');
  end if;
end$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role() returns public.user_role as $$
  select role from public.profiles where user_id = auth.uid();
$$ language sql stable;

create table if not exists public.matters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid references public.profiles(user_id),
  owner_id uuid not null references public.profiles(user_id),
  matter_type text not null,
  billing_model text not null, -- hourly | flat | hybrid
  stage text not null default 'Lead Created',
  next_action text,
  responsible_party text not null check (responsible_party in ('lawyer', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'open',
  responsible_party text not null check (responsible_party in ('lawyer', 'client')),
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  form_type text not null,
  responses jsonb default '{}'::jsonb,
  status text not null default 'draft', -- draft | submitted | approved
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer,
  description text,
  rate_cents integer,
  status text not null default 'draft', -- draft | approved | locked
  created_by uuid references public.profiles(user_id),
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null default 0,
  included_hours numeric,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  status text not null default 'draft', -- draft | sent | paid | partial | overdue
  total_cents integer not null default 0,
  due_date date,
  square_invoice_id text,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  title text not null,
  drive_file_id text,
  folder_path text,
  version integer not null default 1,
  status text not null default 'uploaded', -- uploaded | classified | synced
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(user_id),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_matters_owner on public.matters(owner_id);
create index if not exists idx_matters_client on public.matters(client_id);
create index if not exists idx_tasks_matter on public.tasks(matter_id);
create index if not exists idx_time_entries_matter on public.time_entries(matter_id);
create index if not exists idx_invoices_matter on public.invoices(matter_id);
create index if not exists idx_documents_matter on public.documents(matter_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.matters enable row level security;
alter table public.tasks enable row level security;
alter table public.intake_responses enable row level security;
alter table public.time_entries enable row level security;
alter table public.packages enable row level security;
alter table public.invoices enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles are viewable to owners and staff"
  on public.profiles for select
  using (
    auth.uid() = user_id
    or current_user_role() in ('admin', 'staff')
  );

create policy "staff and admin can manage profiles"
  on public.profiles for all
  using (current_user_role() in ('admin', 'staff'))
  with check (current_user_role() in ('admin', 'staff'));

create policy "matter visibility by owner, staff, or client"
  on public.matters for select
  using (
    owner_id = auth.uid()
    or client_id = auth.uid()
    or current_user_role() in ('admin', 'staff')
  );

create policy "matter writes for staff and owner"
  on public.matters for all
  using (
    owner_id = auth.uid() or current_user_role() in ('admin', 'staff')
  )
  with check (
    owner_id = auth.uid() or current_user_role() in ('admin', 'staff')
  );

create policy "tasks follow matter visibility"
  on public.tasks for select
  using (
    exists (select 1 from public.matters m where m.id = matter_id and (
      m.owner_id = auth.uid() or m.client_id = auth.uid() or current_user_role() in ('admin', 'staff')
    ))
  );

create policy "tasks are editable by staff/owner"
  on public.tasks for all
  using (current_user_role() in ('admin', 'staff') or created_by = auth.uid())
  with check (current_user_role() in ('admin', 'staff') or created_by = auth.uid());

create policy "intake responses follow matter visibility"
  on public.intake_responses for select
  using (
    exists (select 1 from public.matters m where m.id = matter_id and (
      m.owner_id = auth.uid() or m.client_id = auth.uid() or current_user_role() in ('admin', 'staff')
    ))
  );

create policy "intake responses editable by staff/owner"
  on public.intake_responses for all
  using (current_user_role() in ('admin', 'staff') or auth.uid() in (select client_id from public.matters where matters.id = intake_responses.matter_id))
  with check (true);

create policy "time entries visible by matter context"
  on public.time_entries for select
  using (
    exists (select 1 from public.matters m where m.id = matter_id and (
      m.owner_id = auth.uid() or m.client_id = auth.uid() or current_user_role() in ('admin', 'staff')
    ))
  );

create policy "time entries editable by staff/owner"
  on public.time_entries for all
  using (current_user_role() in ('admin', 'staff') or created_by = auth.uid())
  with check (current_user_role() in ('admin', 'staff') or created_by = auth.uid());

create policy "packages are visible to authenticated users"
  on public.packages for select
  using (auth.role() = 'authenticated');

create policy "packages manageable by staff/admin"
  on public.packages for all
  using (current_user_role() in ('admin', 'staff'))
  with check (current_user_role() in ('admin', 'staff'));

create policy "invoices visible by matter context"
  on public.invoices for select
  using (
    exists (select 1 from public.matters m where m.id = matter_id and (
      m.owner_id = auth.uid() or m.client_id = auth.uid() or current_user_role() in ('admin', 'staff')
    ))
  );

create policy "invoices editable by staff/admin"
  on public.invoices for all
  using (current_user_role() in ('admin', 'staff') or auth.uid() in (select owner_id from public.matters where matters.id = invoices.matter_id))
  with check (current_user_role() in ('admin', 'staff') or auth.uid() in (select owner_id from public.matters where matters.id = invoices.matter_id));

create policy "documents visible by matter context"
  on public.documents for select
  using (
    exists (select 1 from public.matters m where m.id = matter_id and (
      m.owner_id = auth.uid() or m.client_id = auth.uid() or current_user_role() in ('admin', 'staff')
    ))
  );

create policy "documents editable by staff/admin"
  on public.documents for all
  using (current_user_role() in ('admin', 'staff') or auth.uid() in (select owner_id from public.matters where matters.id = documents.matter_id))
  with check (current_user_role() in ('admin', 'staff') or auth.uid() in (select owner_id from public.matters where matters.id = documents.matter_id));

create policy "audit logs readable by staff/admin"
  on public.audit_logs for select
  using (current_user_role() in ('admin', 'staff'));

comment on table public.audit_logs is 'System-level audit trail for auth, invoices, and AI actions';
