-- Anonymous Intake: add columns linking matters <-> client_invitations
-- Allows clients to fill intake forms without creating an account first.

-- 1. Add matter_id to client_invitations (links invitation to its auto-created matter)
ALTER TABLE client_invitations
  ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES matters(id) ON DELETE SET NULL;

-- 2. Add invitation_id to matters (back-reference for account linking)
ALTER TABLE matters
  ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES client_invitations(id) ON DELETE SET NULL;

-- 3. Add client_name and client_email to matters (store identity before account exists)
ALTER TABLE matters
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Index for looking up matters by invitation
CREATE INDEX IF NOT EXISTS idx_matters_invitation_id ON matters(invitation_id) WHERE invitation_id IS NOT NULL;

-- Index for looking up invitations by matter
CREATE INDEX IF NOT EXISTS idx_client_invitations_matter_id ON client_invitations(matter_id) WHERE matter_id IS NOT NULL;
