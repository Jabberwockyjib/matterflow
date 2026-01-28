-- ============================================
-- MatterFlow Production Database Setup
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- Creates all tables, functions, policies, and triggers
-- No test data - just default settings placeholders
-- ============================================

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
-- Google Drive integration schema

-- Add Google refresh token to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_connected_at TIMESTAMPTZ;

-- Create matter_folders table for storing Drive folder metadata
CREATE TABLE IF NOT EXISTS public.matter_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  client_folder_id TEXT NOT NULL,
  matter_folder_id TEXT NOT NULL,
  folder_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(matter_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_matter_folders_matter ON public.matter_folders(matter_id);
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected ON public.profiles(google_connected_at) WHERE google_refresh_token IS NOT NULL;

-- Update documents table with additional fields
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS web_view_link TEXT;

-- RLS policies for matter_folders
ALTER TABLE public.matter_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matter_folders follow matter visibility"
  ON public.matter_folders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
      AND (
        m.owner_id = auth.uid()
        OR m.client_id = auth.uid()
        OR current_user_role() IN ('admin', 'staff')
      )
    )
  );

CREATE POLICY "matter_folders editable by staff/owner"
  ON public.matter_folders FOR ALL
  USING (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT owner_id FROM public.matters WHERE id = matter_id
    )
  )
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
    OR auth.uid() IN (
      SELECT owner_id FROM public.matters WHERE id = matter_id
    )
  );

-- Add comment
COMMENT ON TABLE public.matter_folders IS 'Stores Google Drive folder IDs and structure for each matter';
COMMENT ON COLUMN public.profiles.google_refresh_token IS 'Encrypted Google OAuth refresh token for Drive access';
-- Add intake_received_at timestamp to matters table for tracking when intake was submitted
ALTER TABLE matters
ADD COLUMN intake_received_at TIMESTAMPTZ;

-- Add comment explaining the field
COMMENT ON COLUMN matters.intake_received_at IS 'Timestamp when client submitted intake form';
-- Add authentication management columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Create index on last_login for sorting
CREATE INDEX IF NOT EXISTS idx_profiles_last_login ON profiles(last_login);

-- Update RLS policies for admin user management
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR
         (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- Users can update own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE user_id = auth.uid()) = 'admin');

-- Update audit_logs with new event types
COMMENT ON TABLE audit_logs IS 'Audit trail for all system events including: user.invited, user.first_login, user.password_changed, user.password_reset_requested, user.password_reset_completed, user.role_changed, user.deactivated, user.reactivated, auth.failed_login';
-- Fix RLS policies to use helper function and restore staff permissions

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Users can view own profile OR admins/staff can view all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id OR current_user_role() IN ('admin', 'staff'));

-- Users can update own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins and staff can manage all profiles
CREATE POLICY "Admins and staff can manage all profiles"
  ON profiles FOR ALL
  USING (current_user_role() IN ('admin', 'staff'))
  WITH CHECK (current_user_role() IN ('admin', 'staff'));

-- Fix status column to be NOT NULL
ALTER TABLE profiles
  ALTER COLUMN status SET NOT NULL;
-- Create practice_settings table for firm-wide configuration
CREATE TABLE practice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL DEFAULT 'My Law Firm',
  contact_email text,
  contact_phone text,
  address text,
  default_hourly_rate numeric(10,2),
  payment_terms_days integer DEFAULT 30,
  late_fee_percentage numeric(5,2) DEFAULT 0,
  auto_reminders_enabled boolean DEFAULT true,
  matter_types jsonb DEFAULT '["Contract Review", "Employment Agreement", "Policy Review", "Litigation", "Estate Planning", "Real Estate", "Business Formation"]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row exists (singleton pattern)
CREATE UNIQUE INDEX idx_practice_settings_singleton ON practice_settings ((true));

-- Insert default row
INSERT INTO practice_settings (firm_name) VALUES ('My Law Firm');

-- Enable RLS
ALTER TABLE practice_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read and update practice settings
CREATE POLICY "Admin can manage practice settings"
  ON practice_settings
  FOR ALL
  USING (current_user_role() = 'admin');

-- Staff and client can read practice settings
CREATE POLICY "Staff and client can read practice settings"
  ON practice_settings
  FOR SELECT
  USING (current_user_role() IN ('staff', 'client'));

-- Add comment
COMMENT ON TABLE practice_settings IS 'Singleton table for firm-wide practice settings and configuration';
-- Add Google Drive fields to practice_settings (practice-wide, not per-user)
ALTER TABLE practice_settings
  ADD COLUMN google_refresh_token TEXT,
  ADD COLUMN google_connected_at TIMESTAMPTZ;

COMMENT ON COLUMN practice_settings.google_refresh_token IS 'OAuth refresh token for practice-wide Google Drive access';
COMMENT ON COLUMN practice_settings.google_connected_at IS 'Timestamp when Google Drive was connected';

-- Migrate existing token from any user profile to practice_settings
-- (Since this is a single-practice app, we just need one token)
UPDATE practice_settings
SET
  google_refresh_token = (
    SELECT google_refresh_token
    FROM profiles
    WHERE google_refresh_token IS NOT NULL
    LIMIT 1
  ),
  google_connected_at = (
    SELECT google_connected_at
    FROM profiles
    WHERE google_refresh_token IS NOT NULL
    LIMIT 1
  )
WHERE google_refresh_token IS NULL;

-- Optional: Clean up per-user tokens (keep columns for now in case needed later)
-- We'll leave the columns in profiles table but won't use them anymore
-- Migration: Client Invitations & Enhanced Client Tracking
-- Creates tables for invite-first client workflow

-- Client invitations table
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  matter_type TEXT,
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  invited_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client status and contact fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS client_status TEXT CHECK (client_status IN ('invited', 'intake_submitted', 'under_review', 'active', 'past')),
  ADD COLUMN IF NOT EXISTS client_notes TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Add review tracking to intake_responses
ALTER TABLE intake_responses
  ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('pending', 'under_review', 'accepted', 'declined')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Indexes for performance
CREATE INDEX idx_client_invitations_status ON client_invitations(status);
CREATE INDEX idx_client_invitations_invited_by ON client_invitations(invited_by);
CREATE INDEX idx_client_invitations_expires_at ON client_invitations(expires_at);
CREATE INDEX idx_client_invitations_client_email ON client_invitations(client_email);
CREATE INDEX idx_profiles_client_status ON profiles(client_status);
CREATE INDEX idx_intake_responses_review_status ON intake_responses(review_status);

-- RLS Policies for client_invitations
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- Staff and admins can see all invitations
CREATE POLICY "Staff and admins can view all invitations"
  ON client_invitations FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
  );

-- Staff and admins can create invitations
CREATE POLICY "Staff and admins can create invitations"
  ON client_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('admin', 'staff')
  );

-- Staff and admins can update invitations
CREATE POLICY "Staff and admins can update invitations"
  ON client_invitations FOR UPDATE
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
  );

-- Staff and admins can delete invitations
CREATE POLICY "Staff and admins can delete invitations"
  ON client_invitations FOR DELETE
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'staff')
  );

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to client_invitations
CREATE TRIGGER update_client_invitations_updated_at
  BEFORE UPDATE ON client_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE client_invitations IS 'Tracks client invitation codes and status for intake-first workflow';
COMMENT ON COLUMN profiles.client_status IS 'Current client lifecycle stage';
COMMENT ON COLUMN intake_responses.review_status IS 'Lawyer review status of intake submission';
-- Fix circular dependency in RLS policies
-- The current_user_role() function was causing infinite recursion because
-- it tries to SELECT from profiles, which has RLS policies that call current_user_role()

-- Recreate with SECURITY DEFINER to bypass RLS
-- This allows the function to read from profiles without triggering RLS policies
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER -- This is the key fix - bypasses RLS
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon;
-- Table to track additional information requests sent to clients
CREATE TABLE info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_response_id UUID NOT NULL REFERENCES intake_responses(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE RESTRICT,
  questions JSONB NOT NULL, -- Array of structured question objects
  message TEXT, -- Personal message from lawyer
  documents JSONB, -- Array of attached document metadata
  response_deadline TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responses JSONB, -- Client's responses to questions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by intake response
CREATE INDEX idx_info_requests_intake_response
  ON info_requests(intake_response_id);

-- Index for filtering by status
CREATE INDEX idx_info_requests_status
  ON info_requests(status) WHERE status = 'pending';

-- RLS policies
ALTER TABLE info_requests ENABLE ROW LEVEL SECURITY;

-- Staff/admin can view all requests
CREATE POLICY "Staff and admin can view all info requests"
  ON info_requests FOR SELECT
  USING (current_user_role() IN ('staff', 'admin'));

-- Staff/admin can create requests
CREATE POLICY "Staff and admin can create info requests"
  ON info_requests FOR INSERT
  WITH CHECK (current_user_role() IN ('staff', 'admin'));

-- Staff/admin can update requests they created
CREATE POLICY "Staff and admin can update info requests"
  ON info_requests FOR UPDATE
  USING (current_user_role() IN ('staff', 'admin'));

-- Clients can view requests for their intake responses
CREATE POLICY "Clients can view their info requests"
  ON info_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM intake_responses ir
      JOIN matters m ON m.id = ir.matter_id
      WHERE ir.id = info_requests.intake_response_id
        AND m.client_id = auth.uid()
    )
  );

-- Clients can update responses for their requests
CREATE POLICY "Clients can update responses to their info requests"
  ON info_requests FOR UPDATE
  USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM intake_responses ir
      JOIN matters m ON m.id = ir.matter_id
      WHERE ir.id = info_requests.intake_response_id
        AND m.client_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_info_requests_updated_at
  BEFORE UPDATE ON info_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Add review tracking fields to intake_responses
-- Note: review_status, reviewed_by, reviewed_at, internal_notes, and decline_reason
-- were already added in 20251230000001_client_invitations.sql
-- This migration completes the implementation by:
-- 1. Adding missing index on reviewed_by
-- 2. Backfilling existing records with appropriate review_status
-- 3. Making review_status NOT NULL

-- Add index for finding responses under review by specific lawyer
CREATE INDEX IF NOT EXISTS idx_intake_responses_reviewed_by
  ON intake_responses(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Set default review_status for existing rows
-- Map old 'status' values to new 'review_status' values
UPDATE intake_responses
SET review_status = CASE
  WHEN status = 'approved' THEN 'accepted'
  WHEN status = 'submitted' THEN 'pending'
  ELSE 'pending'
END
WHERE review_status IS NULL;

-- Make review_status required going forward (if not already)
-- First ensure all rows have a value (from UPDATE above)
-- Then set NOT NULL constraint
DO $$
BEGIN
  -- Check if column is already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intake_responses'
      AND column_name = 'review_status'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE intake_responses
      ALTER COLUMN review_status SET NOT NULL;
  END IF;
END $$;

COMMENT ON INDEX idx_intake_responses_reviewed_by IS 'Index for finding intake responses under review by specific lawyer';
-- Add "Declined" to matter stage allowed values
-- Note: The stage column is text type, not an enum, so we update the check constraint

-- First, drop the existing check constraint if it exists
ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_stage_check;

-- Add new check constraint including "Declined" and all valid stages from schemas.ts
ALTER TABLE public.matters ADD CONSTRAINT matters_stage_check
  CHECK (stage IN (
    'Lead Created',
    'Intake Sent',
    'Intake Received',
    'Conflict Check',
    'Under Review',
    'Waiting on Client',
    'Draft Ready',
    'Sent to Client',
    'Billing Pending',
    'Completed',
    'Archived',
    'Declined'
  ));

-- Add helpful comment
COMMENT ON COLUMN public.matters.stage IS 'Matter pipeline stages including Declined for rejected intakes';
-- Add description column to tasks table for storing additional task details
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;

-- Add helpful comment
COMMENT ON COLUMN tasks.description IS 'Optional text description or JSON data for task details (e.g., meeting info, instructions)';
-- Add contact fields to profiles table for client management
-- Some fields may already exist, so we use IF NOT EXISTS pattern

-- Phone secondary and phone type fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_secondary_type text;

-- Company name
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;

-- Address fields (address column already exists, add structured fields)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_street text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_zip text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_country text;

-- Emergency contact fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

-- Contact preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_contact_method text;

-- Internal notes (client_notes already exists, add internal_notes for staff-only notes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS internal_notes text;

-- Add check constraints for enum-like fields
-- Drop existing constraints first if they exist (to make migration idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_type_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_type_check
      CHECK (phone_type IS NULL OR phone_type IN ('mobile', 'business', 'home'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_secondary_type_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_secondary_type_check
      CHECK (phone_secondary_type IS NULL OR phone_secondary_type IN ('mobile', 'business', 'home'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_preferred_contact_method_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_preferred_contact_method_check
      CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'text'));
  END IF;
END$$;

-- Add column comments for documentation
COMMENT ON COLUMN profiles.phone IS 'Primary phone number';
COMMENT ON COLUMN profiles.phone_secondary IS 'Secondary phone number';
COMMENT ON COLUMN profiles.phone_type IS 'Type of primary phone: mobile, business, or home';
COMMENT ON COLUMN profiles.phone_secondary_type IS 'Type of secondary phone: mobile, business, or home';
COMMENT ON COLUMN profiles.company_name IS 'Client company or organization name';
COMMENT ON COLUMN profiles.address_street IS 'Street address';
COMMENT ON COLUMN profiles.address_city IS 'City';
COMMENT ON COLUMN profiles.address_state IS 'State or province';
COMMENT ON COLUMN profiles.address_zip IS 'ZIP or postal code';
COMMENT ON COLUMN profiles.address_country IS 'Country';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact full name';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN profiles.preferred_contact_method IS 'Preferred contact method: email, phone, or text';
COMMENT ON COLUMN profiles.internal_notes IS 'Private notes visible only to staff/admin';
-- Create a trigger to automatically create a profile when a new user signs up
-- This handles Google OAuth and other auth methods

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'client',  -- Default role for new sign-ups
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Don't fail if profile already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a profile row when a new user signs up (Google OAuth, email, etc.)';
-- Document Template System Schema
-- Stores templates, sections, fields, and client document records

-- ============================================================================
-- Template Fields (shared across templates)
-- ============================================================================
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'multi_line', 'date', 'currency', 'number', 'select', 'multi_select', 'checkbox')),
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  options JSONB,
  source_type TEXT CHECK (source_type IN ('intake', 'profile', 'matter', 'manual')) DEFAULT 'manual',
  intake_question_id TEXT,
  output_type TEXT CHECK (output_type IN ('merge', 'fillable')) DEFAULT 'merge',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Document Templates
-- ============================================================================
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
  original_file_url TEXT,
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Template Sections
-- ============================================================================
CREATE TABLE template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_conditional BOOLEAN DEFAULT FALSE,
  condition_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Template Field Mappings (which fields used in which templates)
-- ============================================================================
CREATE TABLE template_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES template_fields(id) ON DELETE CASCADE,
  UNIQUE(template_id, field_id)
);

-- ============================================================================
-- Matter Document Packages (optional per matter)
-- ============================================================================
CREATE TABLE matter_document_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  package_type TEXT CHECK (package_type IN ('base', 'custom', 'review')) DEFAULT 'base',
  selected_template_ids UUID[] DEFAULT '{}',
  status TEXT CHECK (status IN ('pending_info', 'ready', 'generating', 'delivered')) DEFAULT 'pending_info',
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(matter_id)
);

-- ============================================================================
-- Matter Documents (generated or uploaded)
-- ============================================================================
CREATE TABLE matter_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('template', 'custom')),
  source TEXT CHECK (source IN ('generated', 'uploaded_lawyer', 'uploaded_client')) DEFAULT 'generated',
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  template_version TEXT,
  status TEXT CHECK (status IN ('draft', 'review', 'final', 'delivered', 'needs_update')) DEFAULT 'draft',
  pdf_url TEXT,
  customizations JSONB,
  field_values JSONB,
  notes TEXT,
  generated_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Document History
-- ============================================================================
CREATE TABLE matter_document_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_document_id UUID NOT NULL REFERENCES matter_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('generated', 'edited', 'regenerated', 'delivered', 'status_changed')),
  changed_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB,
  previous_pdf_url TEXT
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_document_templates_status ON document_templates(status);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_template_sections_template_id ON template_sections(template_id);
CREATE INDEX idx_template_sections_sort_order ON template_sections(template_id, sort_order);
CREATE INDEX idx_matter_documents_matter_id ON matter_documents(matter_id);
CREATE INDEX idx_matter_documents_template_id ON matter_documents(template_id);
CREATE INDEX idx_matter_documents_status ON matter_documents(status);
CREATE INDEX idx_matter_document_history_document_id ON matter_document_history(matter_document_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_document_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_document_history ENABLE ROW LEVEL SECURITY;

-- Staff and admins can manage templates
CREATE POLICY "Staff and admins can view templates"
  ON document_templates FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage templates"
  ON document_templates FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view template sections"
  ON template_sections FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage template sections"
  ON template_sections FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view template fields"
  ON template_fields FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage template fields"
  ON template_fields FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view field mappings"
  ON template_field_mappings FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage field mappings"
  ON template_field_mappings FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

-- Matter documents follow matter access rules
CREATE POLICY "Staff and admins can view matter document packages"
  ON matter_document_packages FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage matter document packages"
  ON matter_document_packages FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view matter documents"
  ON matter_documents FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage matter documents"
  ON matter_documents FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can view document history"
  ON matter_document_history FOR SELECT TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Staff and admins can manage document history"
  ON matter_document_history FOR ALL TO authenticated
  USING (current_user_role() IN ('admin', 'staff'));

-- Triggers for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_sections_updated_at
  BEFORE UPDATE ON template_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_fields_updated_at
  BEFORE UPDATE ON template_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matter_document_packages_updated_at
  BEFORE UPDATE ON matter_document_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matter_documents_updated_at
  BEFORE UPDATE ON matter_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE document_templates IS 'Master template records for legal documents';
COMMENT ON TABLE template_sections IS 'Sections within templates, with optional conditional logic';
COMMENT ON TABLE template_fields IS 'Field definitions used across templates';
COMMENT ON TABLE matter_documents IS 'Documents generated or uploaded for specific matters';
-- Firm settings for email branding and other firm-wide configuration
CREATE TABLE firm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(user_id)
);

-- Initial settings with defaults
INSERT INTO firm_settings (key, value) VALUES
  ('firm_name', 'MatterFlow'),
  ('tagline', 'Workflow-first legal practice system'),
  ('logo_url', NULL),
  ('primary_color', '#1e293b'),
  ('reply_to_email', NULL),
  ('footer_text', NULL);

-- RLS: Only admins can read/write
ALTER TABLE firm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read firm settings"
  ON firm_settings FOR SELECT
  TO authenticated
  USING (current_user_role() = 'admin');

CREATE POLICY "Admins can update firm settings"
  ON firm_settings FOR UPDATE
  TO authenticated
  USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- Staff can read settings (needed for email sending)
CREATE POLICY "Staff can read firm settings"
  ON firm_settings FOR SELECT
  TO authenticated
  USING (current_user_role() = 'staff');

-- Trigger to update updated_at
CREATE TRIGGER update_firm_settings_updated_at
  BEFORE UPDATE ON firm_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
-- Gmail sync integration for MatterFlow
-- Adds matter_emails table and gmail sync state columns to profiles

-- =============================================================================
-- 1. Create matter_emails table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.matter_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  thread_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  ai_summary TEXT,
  action_needed BOOLEAN DEFAULT FALSE,
  gmail_date TIMESTAMPTZ NOT NULL,
  gmail_link TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gmail_message_id)
);

-- Add table comment
COMMENT ON TABLE public.matter_emails IS 'Synced email messages linked to matters from Gmail';

-- =============================================================================
-- 2. Create indexes for efficient queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_matter_emails_matter_id ON public.matter_emails(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_emails_gmail_date ON public.matter_emails(gmail_date DESC);
CREATE INDEX IF NOT EXISTS idx_matter_emails_direction ON public.matter_emails(direction);
CREATE INDEX IF NOT EXISTS idx_matter_emails_thread_id ON public.matter_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_matter_emails_action_needed ON public.matter_emails(action_needed) WHERE action_needed = TRUE;

-- =============================================================================
-- 3. Add Gmail sync columns to profiles table
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gmail_last_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;

-- Add column comments
COMMENT ON COLUMN public.profiles.gmail_sync_enabled IS 'Whether Gmail sync is enabled for this user';
COMMENT ON COLUMN public.profiles.gmail_last_sync IS 'Timestamp of last successful Gmail sync';
COMMENT ON COLUMN public.profiles.gmail_history_id IS 'Gmail history ID for incremental sync';

-- =============================================================================
-- 4. Enable RLS on matter_emails table
-- =============================================================================

ALTER TABLE public.matter_emails ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS Policies for matter_emails
-- =============================================================================

-- Staff and admin can view all matter emails
DROP POLICY IF EXISTS "matter_emails_staff_admin_select" ON public.matter_emails;
CREATE POLICY "matter_emails_staff_admin_select"
  ON public.matter_emails FOR SELECT
  USING (
    public.current_user_role() IN ('admin', 'staff')
  );

-- Clients can view emails for their own matters
DROP POLICY IF EXISTS "matter_emails_client_select" ON public.matter_emails;
CREATE POLICY "matter_emails_client_select"
  ON public.matter_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = matter_id
      AND m.client_id = auth.uid()
    )
  );

-- Staff and admin can insert/update/delete matter emails
DROP POLICY IF EXISTS "matter_emails_staff_admin_all" ON public.matter_emails;
CREATE POLICY "matter_emails_staff_admin_all"
  ON public.matter_emails FOR ALL
  USING (
    public.current_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'staff')
  );

-- Service role has full access (for sync operations)
-- Note: Service role bypasses RLS by default, so no explicit policy needed
-- Add AI summary fields to matter_documents table

ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_document_type TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_suggested_folder TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN matter_documents.ai_document_type IS 'AI-detected document type (Contract, Policy, etc.)';
COMMENT ON COLUMN matter_documents.ai_summary IS 'AI-generated 2-3 sentence summary of document content';
COMMENT ON COLUMN matter_documents.ai_suggested_folder IS 'AI-suggested folder for the document';
COMMENT ON COLUMN matter_documents.ai_processed_at IS 'Timestamp when AI processing was completed';
-- Add AI summary fields to documents table (Google Drive uploaded documents)

ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_document_type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_suggested_folder TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN documents.ai_document_type IS 'AI-detected document type (Contract, Policy, etc.)';
COMMENT ON COLUMN documents.ai_summary IS 'AI-generated 2-3 sentence summary of document content';
COMMENT ON COLUMN documents.ai_suggested_folder IS 'AI-suggested folder for the document';
COMMENT ON COLUMN documents.ai_processed_at IS 'Timestamp when AI processing was completed';
