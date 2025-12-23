-- Migration: Add Next Action tracking schema changes
-- Purpose: Enable Next Action tracking with due dates, update responsible party to include 'staff'
-- Feature: Next Action & Responsible Party Tracking

-- Add next_action_due_date column with NOT NULL constraint
-- Using current_date as default for existing rows
alter table public.matters
  add column next_action_due_date date not null default current_date;

-- Update responsible_party constraint to include 'staff' option
-- First drop the existing constraint, then add the new one
alter table public.matters
  drop constraint if exists matters_responsible_party_check;

alter table public.matters
  add constraint matters_responsible_party_check
  check (responsible_party in ('lawyer', 'staff', 'client'));

-- Make next_action column NOT NULL to enforce exactly-one constraint
-- Using a default value for any existing NULL values
update public.matters
  set next_action = 'Set next action'
  where next_action is null;

alter table public.matters
  alter column next_action set not null;

-- Add index on next_action_due_date for query performance (sorting by due date)
create index if not exists idx_matters_next_action_due_date
  on public.matters(next_action_due_date);
