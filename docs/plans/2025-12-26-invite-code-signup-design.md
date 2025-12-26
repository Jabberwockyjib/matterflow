# Invite Code Signup & Onboarding Design

## Overview

**Goal:** Create a user-friendly landing page where solo practitioners can sign up for MatterFlow using invite codes provided by the developer, then complete a guided onboarding wizard to connect essential services (Google Drive, Gmail, and optionally Square).

**User Flow:**
1. Visit landing page → Enter invite code
2. Complete signup form (email, password, name, practice name)
3. Guided wizard: Connect Google Drive → Connect Gmail → Connect Square (optional)
4. Access dashboard with all services configured

**Tech Stack:**
- Next.js App Router pages
- Supabase Auth for user creation
- Google OAuth for Drive + Gmail
- Square OAuth for payments
- React Hook Form + Zod validation
- Real-time invite code validation

---

## Landing Page & Invite Code System

### Landing Page Structure (`/`)

**Three-section layout:**

1. **Header**
   - Logo (left)
   - "Already have an account? Sign In" link (right)
   - Clean, minimal navigation

2. **Hero Section** (centered)
   - Headline: "Practice Management for Solo Lawyers"
   - Subheadline: "Streamline matters, time tracking, billing, and client communication—all in one place"
   - Prominent signup card (centered, elevated)

3. **Features Section** (scrollable below hero)
   - 4 key features with icons:
     - Document Management (Google Drive integration)
     - Payment Processing (Square integration)
     - Email Integration (Gmail two-way sync)
     - Time Tracking (built-in timer)
   - Brief descriptions, professional tone, no marketing fluff

### Invite Code Database Schema

```sql
CREATE TABLE invite_codes (
  code TEXT PRIMARY KEY,  -- "ABC123DEF" (9 chars, uppercase alphanumeric)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- nullable for no expiration
  used_at TIMESTAMPTZ,     -- when code was redeemed
  used_by UUID REFERENCES auth.users(id),  -- who used it
  metadata JSONB,  -- { customer_name, notes, generated_by }
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'used' | 'expired' | 'revoked'
  CHECK (status IN ('active', 'used', 'expired', 'revoked'))
);

CREATE INDEX idx_invite_codes_status ON invite_codes(status);
CREATE INDEX idx_invite_codes_used_by ON invite_codes(used_by);
```

### Code Generation CLI

Command-line tool for developers to generate invite codes:

```bash
pnpm generate-invite --name "John Smith Law" --expires "2025-12-31"
# Output: Generated invite code: XYZ789ABC (expires 2025-12-31)

# Optional flags:
# --name: Customer/practice name for metadata
# --expires: Expiration date (YYYY-MM-DD)
# --notes: Additional notes
```

**Implementation:**
- Script: `scripts/generate-invite-code.ts`
- Generates random 9-character alphanumeric code
- Stores in `invite_codes` table with metadata
- Returns code to console for distribution to customer

---

## Signup Flow & Form Validation

### Signup Page (`/auth/signup`)

**Single-page form with progressive enablement:**

Form fields (in order):
1. **Invite Code** (autofocus)
2. **Email**
3. **Password**
4. **Full Name**
5. **Practice Name**

### Form Fields & Validation

**1. Invite Code Field**
- Format: 9 characters, uppercase alphanumeric
- Real-time validation (debounced 500ms after typing stops)
- Server action: `validateInviteCode(code: string)`
- Visual feedback:
  - ✓ Green checkmark + "Valid invite code"
  - ✗ Red error + message: "Invalid code" | "Code already used" | "Code expired"
- Blocks form submission if invalid

**2. Email Field**
- Standard email validation
- Check for existing user in real-time (debounced)
- Error: "This email is already registered"

**3. Password Field**
- Requirements: 8+ characters, uppercase, lowercase, number
- Visual strength meter: Weak / Medium / Strong
- Show/hide toggle icon
- Real-time validation feedback

**4. Full Name Field**
- Single text field (not split first/last)
- Required, 2-100 characters

**5. Practice Name Field**
- Practice/firm name
- Examples: "Smith & Associates" or "John Smith, Attorney at Law"
- Pre-populates practice settings

### Validation Flow

```typescript
// Server action
async function validateInviteCode(code: string): Promise<{
  valid: boolean;
  error?: string;
  metadata?: { customer_name: string };
}> {
  // 1. Check format (9 chars, alphanumeric)
  // 2. Query database
  // 3. Check status: active, not used, not expired
  // 4. Return result
}

// On successful signup:
async function signupWithInviteCode(data: SignupFormData) {
  // 1. Validate invite code (double-check)
  // 2. Create Supabase Auth user
  // 3. Mark invite code as used (used_at, used_by)
  // 4. Create profile with role='admin'
  // 5. Create practice record
  // 6. Sign user in automatically
  // 7. Redirect to /onboarding
}
```

### New Database Table: Practices

```sql
CREATE TABLE practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- practice/firm name
  owner_id UUID NOT NULL REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb,
  -- settings: { address, phone, specialties, website, etc }
  UNIQUE(owner_id)  -- one practice per owner
);

CREATE INDEX idx_practices_owner_id ON practices(owner_id);
```

---

## Onboarding Wizard & Service Connections

### Wizard Structure (`/onboarding`)

**Multi-step wizard with progress indicator:**
- Progress bar at top: "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"
- Modal overlay prevents navigation away (with confirmation dialog)
- Each step has: Title, Description, Action button(s)
- Linear flow: can't skip steps or go backward

### Step 1: Connect Google Drive (Required)

**Title:** "Connect Your Google Drive"

**Description:** "Store client documents securely. We'll create organized folders for each matter automatically."

**OAuth Scopes:**
```typescript
DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',     // create/access app files
  'https://www.googleapis.com/auth/drive.appdata',  // app data storage
]
```

**Flow:**
1. Button: "Connect Google Drive" → Opens OAuth popup
2. User authorizes in Google
3. OAuth callback receives tokens
4. Store refresh token in `profiles.google_refresh_token`
5. Set `profiles.google_connected_at = NOW()`
6. Show success: ✓ "Connected: user@example.com"
7. Enable "Next" button → Step 2

### Step 2: Connect Gmail (Required)

**Title:** "Connect Your Gmail"

**Description:** "Sync client emails automatically. Tag Gmail messages to link them to matters, and all emails sent from MatterFlow will appear in your Gmail Sent folder."

**OAuth Scopes:**
```typescript
GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',  // read emails
  'https://www.googleapis.com/auth/gmail.send',      // send emails
  'https://www.googleapis.com/auth/gmail.modify',    // add labels/tags
]
```

**Feature Highlights:**
- "Two-way sync keeps everything in one place"
- "Never miss a client email"
- "Automatic audit trail for compliance"

**Flow:**
1. Button: "Connect Gmail" → OAuth popup
2. User authorizes Gmail scopes
3. Store tokens (same as Drive, shared Google account)
4. Create Gmail label "MatterFlow" via API
5. Show success: ✓ "Connected: user@example.com"
6. Enable "Next" button → Step 3

### Step 3: Connect Square (Optional)

**Title:** "Connect Square for Payments"

**Description:** "Accept credit card payments and sync invoices automatically. You can skip this and add it later from Settings."

**Buttons:**
- Primary: "Connect Square"
- Secondary: "Skip for Now"

**Flow:**
1. If "Connect Square": OAuth flow (existing implementation)
2. If "Skip for Now": Mark as skipped, proceed to completion
3. Either way: Show completion screen

### Completion Screen

**Title:** "You're All Set! 🎉"

**Summary:**
- ✓ Google Drive connected
- ✓ Gmail connected
- ✓ Square connected (or "Skipped - add from Settings")

**Button:** "Go to Dashboard" → Redirect to `/dashboard`

**Database Update:**
- Set `profiles.onboarding_completed_at = NOW()`
- Used to prevent re-showing wizard

---

## Gmail Integration Architecture

### Email Tagging System

**Gmail Labels (auto-created):**
- Main label: `MatterFlow`
- Sub-labels: `MatterFlow/Matter-{id}`, `MatterFlow/Client-{id}`
- User can manually tag emails in Gmail → syncs to MatterFlow
- MatterFlow auto-tags all sent emails

**Label Management:**
- Created via Gmail API on first connection
- Stored label IDs in database for fast lookup
- Sync changes when labels modified

### Database Schema: Communications

```sql
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID REFERENCES matters(id),  -- nullable
  client_id UUID REFERENCES profiles(user_id),  -- nullable
  gmail_message_id TEXT UNIQUE,  -- Gmail's message ID (deduplication)
  gmail_thread_id TEXT,  -- for conversation threading
  direction TEXT NOT NULL,  -- 'inbound' | 'outbound'
  from_email TEXT NOT NULL,
  to_email TEXT[] NOT NULL,
  cc_email TEXT[],
  bcc_email TEXT[],
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  -- attachments: [{ name, size, mime_type, gmail_attachment_id }]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (direction IN ('inbound', 'outbound'))
);

CREATE INDEX idx_communications_matter_id ON communications(matter_id);
CREATE INDEX idx_communications_client_id ON communications(client_id);
CREATE INDEX idx_communications_gmail_message_id ON communications(gmail_message_id);
CREATE INDEX idx_communications_sent_at ON communications(sent_at DESC);
```

### Sync Strategy

**Outbound (MatterFlow → Gmail):**
1. User composes email in MatterFlow
2. Send via Gmail API (`gmail.users.messages.send`)
3. Automatically appears in Gmail Sent folder
4. Auto-tag with `MatterFlow` and matter-specific labels
5. Store in `communications` table with `direction='outbound'`

**Inbound (Gmail → MatterFlow):**
- **Phase 1 (MVP):** Polling
  - Cron job every 5 minutes
  - Query: `label:MatterFlow newer_than:5m`
  - Import new tagged messages
  - Check `gmail_message_id` for deduplication

- **Phase 2 (Future):** Gmail Push Notifications
  - Subscribe to webhook for label changes
  - Real-time sync when user tags email
  - More efficient, instant updates

### Deduplication Logic

```typescript
async function importGmailMessage(gmailMessage: GmailMessage) {
  // 1. Check if already imported
  const exists = await db.query(
    'SELECT 1 FROM communications WHERE gmail_message_id = $1',
    [gmailMessage.id]
  );

  if (exists) {
    return; // Skip duplicate
  }

  // 2. Parse message
  // 3. Extract matter/client from labels
  // 4. Insert into communications table
}
```

### Gmail API Scopes Summary

```typescript
GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',   // Read emails
  'https://www.googleapis.com/auth/gmail.send',       // Send emails
  'https://www.googleapis.com/auth/gmail.modify',     // Add/remove labels
]
```

**Combined Google Scopes (Drive + Gmail):**
```typescript
GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
]
```

---

## Implementation Notes

### Google OAuth Configuration

**Google Cloud Console Setup:**
1. Enable APIs: Google Drive API, Gmail API
2. Configure OAuth Consent Screen (External)
3. Add scopes (Drive + Gmail)
4. Create OAuth Client ID (Web Application)
5. Add authorized redirect URI: `http://localhost:3010/api/auth/google/callback`

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"
GOOGLE_REDIRECT_URI="http://localhost:3010/api/auth/google/callback"
```

### Security Considerations

**Invite Codes:**
- Generate cryptographically random codes
- Hash codes in database? No - they're already random and single-use
- Rate limit validation endpoint (10 attempts per IP per minute)
- Log failed validation attempts

**OAuth Tokens:**
- Store refresh tokens encrypted in database
- Never expose tokens to client
- Use server-side API routes for all Google API calls
- Rotate tokens on schedule (Google handles automatically)

**Gmail Sync:**
- Only sync messages with MatterFlow label (user consent)
- Never read entire inbox
- Respect user's Gmail settings (don't modify unrelated emails)

### Migration Path

For existing users (already have accounts):
- Add `/settings/services` page to connect Gmail
- Skip invite code requirement
- Same OAuth flow as onboarding wizard
- Optionally: Admin can generate "upgrade codes" for existing users

---

## Success Metrics

**Signup Completion Rate:**
- Track: Invite code entered → Account created → Wizard completed
- Goal: >80% completion rate

**Service Connection Rate:**
- Track: % users who connect Drive, Gmail, Square
- Goal: 100% Drive + Gmail (required), 60%+ Square (optional)

**Time to First Matter:**
- Track: Account created → First matter created
- Goal: <5 minutes (indicates smooth onboarding)

---

## Future Enhancements

**Phase 2:**
- Gmail push notifications (webhook) for real-time sync
- Email templates for common communications
- Email tracking (read receipts)
- Bulk email tagging tool (tag historical emails)

**Phase 3:**
- Multi-user practices (invite team members)
- Client portal (clients can view communications)
- Email threading UI (conversation view)
- AI-powered email categorization

---

## Open Questions

1. Should invite codes be case-sensitive? **Decision: No, normalize to uppercase**
2. Should we allow password reset before onboarding completes? **Decision: Yes, standard flow**
3. What happens if OAuth fails mid-wizard? **Decision: Show error, allow retry**
4. Can users disconnect services after setup? **Decision: Yes, from Settings page**

---

## Appendix: File Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── auth/
│   │   ├── signup/
│   │   │   └── page.tsx                  # Signup form
│   ├── onboarding/
│   │   └── page.tsx                      # Wizard
│   └── api/
│       └── auth/
│           └── google/
│               ├── route.ts              # OAuth initiate
│               └── callback/
│                   └── route.ts          # OAuth callback
├── lib/
│   ├── invite-codes/
│   │   ├── actions.ts                    # validateInviteCode, signupWithInviteCode
│   │   └── types.ts
│   ├── gmail/
│   │   ├── client.ts                     # Gmail API client
│   │   ├── sync.ts                       # Import/export logic
│   │   └── labels.ts                     # Label management
│   └── validation/
│       └── schemas.ts                    # signupSchema, inviteCodeSchema
├── components/
│   ├── landing/
│   │   ├── hero-section.tsx
│   │   └── features-section.tsx
│   ├── onboarding/
│   │   ├── wizard-progress.tsx
│   │   ├── connect-drive-step.tsx
│   │   ├── connect-gmail-step.tsx
│   │   └── connect-square-step.tsx
scripts/
└── generate-invite-code.ts               # CLI tool
```
