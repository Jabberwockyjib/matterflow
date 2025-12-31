-- Minimal seed for local dev; skips FK enforcement to avoid auth.users dependency
set session_replication_role = replica;

insert into public.profiles (user_id, full_name, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Dev Admin', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Client One', 'client')
on conflict (user_id) do nothing;

insert into public.matters (id, title, client_id, owner_id, matter_type, billing_model, stage, next_action, next_action_due_date, responsible_party)
values
  ('11111111-1111-1111-1111-111111111111', 'Policy Review – Evergreen', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Policy Review', 'flat', 'Under Review', 'Draft review pack', current_date - 2, 'lawyer'),
  ('22222222-2222-2222-2222-222222222222', 'Contract Review – Lotus Clinic', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Contract Review', 'hourly', 'Waiting on Client', 'Nudge client', current_date, 'client'),
  ('33333333-3333-3333-3333-333333333333', 'Employment Agreement – Sunrise', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Employment Agreement', 'flat', 'Draft Ready', 'Send initial draft', current_date + 3, 'lawyer')
on conflict (id) do nothing;

insert into public.tasks (id, matter_id, title, due_date, status, responsible_party, created_by)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Approve conflict check – Parker Therapy', current_date, 'open', 'lawyer', '00000000-0000-0000-0000-000000000001'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Upload W9 – Evergreen Counseling', null, 'open', 'client', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.invoices (id, matter_id, status, total_cents, due_date, square_invoice_id, line_items)
values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'sent', 180000, current_date + 7, null, $$[{"description":"Policy review flat fee","amount_cents":180000}]$$),
  ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'draft', 75000, null, null, $$[{"description":"Contract review","amount_cents":75000}]$$)
on conflict (id) do nothing;

insert into public.time_entries (id, matter_id, task_id, status, description, duration_minutes, started_at, ended_at, created_by, rate_cents)
values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'draft', 'Review intake and prep notes', 45, now() - interval '1 hour', now() - interval '15 minutes', '00000000-0000-0000-0000-000000000001', 25000),
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', null, 'draft', 'Timer running for client follow-up', null, now() - interval '10 minutes', null, '00000000-0000-0000-0000-000000000001', 25000)
on conflict (id) do nothing;

set session_replication_role = DEFAULT;
