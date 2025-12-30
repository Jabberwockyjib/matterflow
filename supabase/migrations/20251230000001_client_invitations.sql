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
