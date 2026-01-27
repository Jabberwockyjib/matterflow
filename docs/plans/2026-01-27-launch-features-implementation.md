# Launch Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 features required for launch: Gmail sync, Automation config UI, AI document summary.

**Architecture:** Each feature is independent and can be built in parallel. All follow existing patterns: server actions in `src/lib/data/actions.ts`, queries in `queries.ts`, UI in `src/app/admin/`. AI features use OpenAI API.

**Tech Stack:** Next.js 15, Supabase, Google APIs (Gmail), OpenAI API, React, Tailwind, shadcn/ui.

---

## Feature 1: Gmail Incoming Email Sync

### Task 1.1: Database Schema for Email Sync

**Files:**
- Create: `supabase/migrations/20260127000001_gmail_sync.sql`

**Step 1: Write migration file**

```sql
-- Gmail email sync storage
-- Stores email metadata linked to matters for communication timeline

CREATE TABLE matter_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
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

-- Indexes for efficient queries
CREATE INDEX idx_matter_emails_matter ON matter_emails(matter_id);
CREATE INDEX idx_matter_emails_gmail_date ON matter_emails(gmail_date DESC);
CREATE INDEX idx_matter_emails_direction ON matter_emails(direction);

-- RLS policies
ALTER TABLE matter_emails ENABLE ROW LEVEL SECURITY;

-- Staff and admin can see all emails
CREATE POLICY "Staff and admin can view all matter emails"
  ON matter_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Clients can see emails for their own matters
CREATE POLICY "Clients can view their matter emails"
  ON matter_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matters
      WHERE matters.id = matter_emails.matter_id
      AND matters.client_id = auth.uid()
    )
  );

-- Only service role can insert/update (via server actions)
CREATE POLICY "Service role can manage matter emails"
  ON matter_emails FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add gmail sync settings to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_sync_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_last_sync TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_history_id TEXT;
```

**Step 2: Apply migration locally**

Run:
```bash
docker exec -i matterflow-db psql -U postgres -d postgres < supabase/migrations/20260127000001_gmail_sync.sql
```

Expected: No errors

**Step 3: Regenerate types**

Run:
```bash
pnpm supabase gen types typescript --local > src/types/database.types.ts
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260127000001_gmail_sync.sql src/types/database.types.ts
git commit -m "feat: add matter_emails table for Gmail sync"
```

---

### Task 1.2: Gmail API Client for Reading Emails

**Files:**
- Modify: `src/lib/email/gmail-client.ts`

**Step 1: Add email fetching functions**

Add to `src/lib/email/gmail-client.ts`:

```typescript
/**
 * Fetch emails matching a query
 */
export async function fetchGmailEmails({
  refreshToken,
  query,
  maxResults = 50,
}: {
  refreshToken: string
  query: string
  maxResults?: number
}): Promise<{
  ok: boolean
  emails?: GmailEmail[]
  error?: string
}> {
  try {
    const oauth2Client = getOAuth2Client(refreshToken)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Search for messages
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    })

    if (!listResponse.data.messages) {
      return { ok: true, emails: [] }
    }

    // Fetch full message details
    const emails: GmailEmail[] = []
    for (const msg of listResponse.data.messages) {
      if (!msg.id) continue

      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      })

      const headers = msgResponse.data.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

      emails.push({
        id: msg.id,
        threadId: msgResponse.data.threadId || undefined,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        snippet: msgResponse.data.snippet || '',
        internalDate: msgResponse.data.internalDate || '',
      })
    }

    return { ok: true, emails }
  } catch (error) {
    console.error('Gmail fetch error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch emails',
    }
  }
}

export interface GmailEmail {
  id: string
  threadId?: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  internalDate: string
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
export function extractEmailAddress(fullAddress: string): string {
  const match = fullAddress.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase() : fullAddress.toLowerCase().trim()
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/email/gmail-client.ts
git commit -m "feat: add Gmail email fetching functions"
```

---

### Task 1.3: AI Summary Function for Emails

**Files:**
- Create: `src/lib/ai/email-summary.ts`

**Step 1: Write the email summary function**

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EmailSummaryResult {
  summary: string
  actionNeeded: boolean
}

/**
 * Generate AI summary of email content
 */
export async function summarizeEmail({
  subject,
  snippet,
  direction,
}: {
  subject: string
  snippet: string
  direction: 'sent' | 'received'
}): Promise<EmailSummaryResult> {
  try {
    const prompt = `Summarize this ${direction} email in 1-2 sentences. Also indicate if action is needed.

Subject: ${subject}
Preview: ${snippet}

Respond in JSON format:
{
  "summary": "Brief summary of what this email is about",
  "actionNeeded": true/false (does the recipient need to respond or take action?)
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 150,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { summary: snippet.slice(0, 100), actionNeeded: false }
    }

    const parsed = JSON.parse(content)
    return {
      summary: parsed.summary || snippet.slice(0, 100),
      actionNeeded: Boolean(parsed.actionNeeded),
    }
  } catch (error) {
    console.error('Email summary error:', error)
    // Fallback to snippet if AI fails
    return { summary: snippet.slice(0, 100), actionNeeded: false }
  }
}
```

**Step 2: Add OpenAI to dependencies (if not present)**

Run: `pnpm add openai`

**Step 3: Add OPENAI_API_KEY to .env.example**

Add line to `.env.example`:
```
OPENAI_API_KEY=your_openai_api_key
```

**Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add src/lib/ai/email-summary.ts .env.example package.json pnpm-lock.yaml
git commit -m "feat: add AI email summary function"
```

---

### Task 1.4: Gmail Sync Server Action

**Files:**
- Modify: `src/lib/data/actions.ts`

**Step 1: Add syncGmailForMatter action**

Add to `src/lib/data/actions.ts`:

```typescript
import { fetchGmailEmails, extractEmailAddress } from '@/lib/email/gmail-client'
import { summarizeEmail } from '@/lib/ai/email-summary'

/**
 * Sync Gmail emails for a specific matter
 */
export async function syncGmailForMatter(matterId: string): Promise<ActionResult> {
  const roleCheck = await ensureStaffOrAdmin()
  if ('error' in roleCheck) return roleCheck

  const supabase = ensureSupabase()

  // Get matter with client info
  const { data: matter, error: matterError } = await supabase
    .from('matters')
    .select('id, client_id')
    .eq('id', matterId)
    .single()

  if (matterError || !matter) {
    return { error: 'Matter not found' }
  }

  if (!matter.client_id) {
    return { error: 'Matter has no client assigned' }
  }

  // Get client email
  const { data: { user: clientUser } } = await supabase.auth.admin.getUserById(matter.client_id)
  if (!clientUser?.email) {
    return { error: 'Client email not found' }
  }

  // Get lawyer's refresh token
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('user_id', roleCheck.session.user.id)
    .single()

  if (!profile?.google_refresh_token) {
    return { error: 'Google account not connected. Please connect in Settings.' }
  }

  const clientEmail = clientUser.email.toLowerCase()

  // Fetch emails to/from client
  const query = `from:${clientEmail} OR to:${clientEmail}`
  const result = await fetchGmailEmails({
    refreshToken: profile.google_refresh_token,
    query,
    maxResults: 100,
  })

  if (!result.ok || !result.emails) {
    return { error: result.error || 'Failed to fetch emails' }
  }

  let synced = 0
  let skipped = 0

  for (const email of result.emails) {
    // Check if already synced
    const { data: existing } = await supabase
      .from('matter_emails')
      .select('id')
      .eq('gmail_message_id', email.id)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // Determine direction
    const fromEmail = extractEmailAddress(email.from)
    const direction = fromEmail === clientEmail ? 'received' : 'sent'

    // Generate AI summary
    const { summary, actionNeeded } = await summarizeEmail({
      subject: email.subject,
      snippet: email.snippet,
      direction,
    })

    // Insert into database
    const { error: insertError } = await supabase.from('matter_emails').insert({
      matter_id: matterId,
      gmail_message_id: email.id,
      thread_id: email.threadId,
      direction,
      from_email: email.from,
      to_email: email.to,
      subject: email.subject,
      snippet: email.snippet,
      ai_summary: summary,
      action_needed: actionNeeded,
      gmail_date: new Date(parseInt(email.internalDate)).toISOString(),
      gmail_link: `https://mail.google.com/mail/u/0/#inbox/${email.id}`,
    })

    if (!insertError) {
      synced++
    }
  }

  await logAudit({
    supabase,
    actorId: roleCheck.session.user.id,
    eventType: 'gmail_sync',
    entityType: 'matter',
    entityId: matterId,
    metadata: { synced, skipped },
  })

  revalidatePath(`/matters/${matterId}`)
  return { ok: true, data: { synced, skipped } }
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data/actions.ts
git commit -m "feat: add syncGmailForMatter server action"
```

---

### Task 1.5: Query for Matter Emails

**Files:**
- Modify: `src/lib/data/queries.ts`

**Step 1: Add getMatterEmails query**

Add to `src/lib/data/queries.ts`:

```typescript
export type MatterEmail = {
  id: string
  gmailMessageId: string
  direction: 'sent' | 'received'
  fromEmail: string
  toEmail: string
  subject: string | null
  snippet: string | null
  aiSummary: string | null
  actionNeeded: boolean
  gmailDate: string
  gmailLink: string | null
}

export async function getMatterEmails(matterId: string): Promise<MatterEmail[]> {
  if (!supabaseEnvReady()) return []

  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('matter_emails')
    .select('*')
    .eq('matter_id', matterId)
    .order('gmail_date', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    gmailMessageId: row.gmail_message_id,
    direction: row.direction as 'sent' | 'received',
    fromEmail: row.from_email,
    toEmail: row.to_email,
    subject: row.subject,
    snippet: row.snippet,
    aiSummary: row.ai_summary,
    actionNeeded: row.action_needed ?? false,
    gmailDate: row.gmail_date,
    gmailLink: row.gmail_link,
  }))
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/data/queries.ts
git commit -m "feat: add getMatterEmails query"
```

---

### Task 1.6: Communications Tab UI Component

**Files:**
- Create: `src/components/matter/communications-tab.tsx`

**Step 1: Write the component**

```tsx
'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Mail, Send, Inbox, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { syncGmailForMatter } from '@/lib/data/actions'
import type { MatterEmail } from '@/lib/data/queries'

interface CommunicationsTabProps {
  matterId: string
  emails: MatterEmail[]
}

export function CommunicationsTab({ matterId, emails: initialEmails }: CommunicationsTabProps) {
  const [emails, setEmails] = useState(initialEmails)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      const result = await syncGmailForMatter(matterId)
      if ('error' in result && result.error) {
        setError(result.error)
      } else {
        // Refresh the page to get updated emails
        window.location.reload()
      }
    } catch (err) {
      setError('Failed to sync emails')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Email Communications</h3>
        <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Emails'}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {emails.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Mail className="mx-auto mb-2 h-8 w-8" />
            <p>No emails synced yet.</p>
            <p className="text-sm">Click "Sync Emails" to import communications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card key={email.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {email.direction === 'received' ? (
                      <Inbox className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Send className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(email.gmailDate), { addSuffix: true })}
                      </span>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {email.direction === 'received' ? `From: ${email.fromEmail}` : `To: ${email.toEmail}`}
                      </span>
                      {email.actionNeeded && (
                        <Badge variant="destructive" className="ml-auto">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Action Needed
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium mb-1">{email.subject || '(No subject)'}</p>
                    <p className="text-sm text-muted-foreground">{email.aiSummary || email.snippet}</p>
                    {email.gmailLink && (
                      <a
                        href={email.gmailLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                      >
                        Open in Gmail
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/matter/communications-tab.tsx
git commit -m "feat: add CommunicationsTab component for email display"
```

---

### Task 1.7: Add Communications Tab to Matter Page

**Files:**
- Modify: `src/app/matters/[id]/page.tsx` (add tab)

**Step 1: Import and add CommunicationsTab**

In the matter detail page, add a new tab for Communications. Add import:

```typescript
import { CommunicationsTab } from '@/components/matter/communications-tab'
import { getMatterEmails } from '@/lib/data/queries'
```

Fetch emails in the page component:

```typescript
const emails = await getMatterEmails(params.id)
```

Add tab to the tabs list and render CommunicationsTab in the tab content.

**Step 2: Verify app runs**

Run: `pnpm dev`
Navigate to a matter page, verify Communications tab appears.

**Step 3: Commit**

```bash
git add src/app/matters/[id]/page.tsx
git commit -m "feat: add Communications tab to matter detail page"
```

---

## Feature 2: Automation Configuration UI

### Task 2.1: Add Automation Settings Keys

**Files:**
- Modify: `src/types/firm-settings.ts`

**Step 1: Add automation setting keys**

Add to `FIRM_SETTING_KEYS` array:

```typescript
export const FIRM_SETTING_KEYS = [
  // ... existing keys
  'automation_intake_reminder_enabled',
  'automation_intake_reminder_hours',
  'automation_client_idle_enabled',
  'automation_client_idle_days',
  'automation_lawyer_idle_enabled',
  'automation_lawyer_idle_days',
  'automation_invoice_reminder_enabled',
  'automation_invoice_reminder_days',
] as const
```

Add to `DEFAULT_FIRM_SETTINGS`:

```typescript
export const DEFAULT_FIRM_SETTINGS: FirmSettings = {
  // ... existing defaults
  automation_intake_reminder_enabled: 'true',
  automation_intake_reminder_hours: '24',
  automation_client_idle_enabled: 'true',
  automation_client_idle_days: '3',
  automation_lawyer_idle_enabled: 'true',
  automation_lawyer_idle_days: '7',
  automation_invoice_reminder_enabled: 'true',
  automation_invoice_reminder_days: '3,7,14',
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/firm-settings.ts
git commit -m "feat: add automation setting keys to firm settings"
```

---

### Task 2.2: Create Automations Settings Page

**Files:**
- Create: `src/app/admin/settings/automations/page.tsx`

**Step 1: Write the page component**

```tsx
import { Metadata } from 'next'
import { getFirmSettings } from '@/lib/data/queries'
import { AutomationsForm } from './automations-form'

export const metadata: Metadata = {
  title: 'Automation Settings | MatterFlow',
}

export default async function AutomationsSettingsPage() {
  const settings = await getFirmSettings()

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Email Automations</h1>
        <p className="text-muted-foreground">
          Configure automatic email reminders for intake, activity, and invoices.
        </p>
      </div>
      <AutomationsForm settings={settings} />
    </div>
  )
}
```

**Step 2: Create the form component**

Create `src/app/admin/settings/automations/automations-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateFirmSettings } from '@/lib/data/actions'
import type { FirmSettings } from '@/types/firm-settings'

interface AutomationsFormProps {
  settings: FirmSettings
}

export function AutomationsForm({ settings }: AutomationsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [intakeEnabled, setIntakeEnabled] = useState(settings.automation_intake_reminder_enabled === 'true')
  const [intakeHours, setIntakeHours] = useState(settings.automation_intake_reminder_hours || '24')
  const [clientIdleEnabled, setClientIdleEnabled] = useState(settings.automation_client_idle_enabled === 'true')
  const [clientIdleDays, setClientIdleDays] = useState(settings.automation_client_idle_days || '3')
  const [lawyerIdleEnabled, setLawyerIdleEnabled] = useState(settings.automation_lawyer_idle_enabled === 'true')
  const [lawyerIdleDays, setLawyerIdleDays] = useState(settings.automation_lawyer_idle_days || '7')
  const [invoiceEnabled, setInvoiceEnabled] = useState(settings.automation_invoice_reminder_enabled === 'true')
  const [invoiceDays, setInvoiceDays] = useState(settings.automation_invoice_reminder_days || '3,7,14')

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const updates: Partial<FirmSettings> = {
      automation_intake_reminder_enabled: String(intakeEnabled),
      automation_intake_reminder_hours: intakeHours,
      automation_client_idle_enabled: String(clientIdleEnabled),
      automation_client_idle_days: clientIdleDays,
      automation_lawyer_idle_enabled: String(lawyerIdleEnabled),
      automation_lawyer_idle_days: lawyerIdleDays,
      automation_invoice_reminder_enabled: String(invoiceEnabled),
      automation_invoice_reminder_days: invoiceDays,
    }

    const result = await updateFirmSettings(updates)

    if ('error' in result && result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully' })
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Intake Reminders</CardTitle>
              <CardDescription>Remind clients to complete intake forms</CardDescription>
            </div>
            <Switch checked={intakeEnabled} onCheckedChange={setIntakeEnabled} />
          </div>
        </CardHeader>
        {intakeEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send reminder after</Label>
              <Input
                type="number"
                value={intakeHours}
                onChange={(e) => setIntakeHours(e.target.value)}
                className="w-20"
                min={1}
              />
              <span>hours</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Inactivity Reminders</CardTitle>
              <CardDescription>Nudge clients when matters are waiting on them</CardDescription>
            </div>
            <Switch checked={clientIdleEnabled} onCheckedChange={setClientIdleEnabled} />
          </div>
        </CardHeader>
        {clientIdleEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send reminder after</Label>
              <Input
                type="number"
                value={clientIdleDays}
                onChange={(e) => setClientIdleDays(e.target.value)}
                className="w-20"
                min={1}
              />
              <span>days of inactivity</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lawyer Inactivity Alerts</CardTitle>
              <CardDescription>Alert yourself when you have idle matters</CardDescription>
            </div>
            <Switch checked={lawyerIdleEnabled} onCheckedChange={setLawyerIdleEnabled} />
          </div>
        </CardHeader>
        {lawyerIdleEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send alert after</Label>
              <Input
                type="number"
                value={lawyerIdleDays}
                onChange={(e) => setLawyerIdleDays(e.target.value)}
                className="w-20"
                min={1}
              />
              <span>days of inactivity</span>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice Reminders</CardTitle>
              <CardDescription>Remind clients about unpaid invoices</CardDescription>
            </div>
            <Switch checked={invoiceEnabled} onCheckedChange={setInvoiceEnabled} />
          </div>
        </CardHeader>
        {invoiceEnabled && (
          <CardContent>
            <div className="flex items-center gap-2">
              <Label>Send reminders at days overdue:</Label>
              <Input
                type="text"
                value={invoiceDays}
                onChange={(e) => setInvoiceDays(e.target.value)}
                className="w-32"
                placeholder="3,7,14"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Comma-separated list of days (e.g., 3,7,14)
            </p>
          </CardContent>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  )
}
```

**Step 3: Verify app runs**

Run: `pnpm dev`
Navigate to `/admin/settings/automations`, verify page renders.

**Step 4: Commit**

```bash
git add src/app/admin/settings/automations/
git commit -m "feat: add automation settings admin page"
```

---

### Task 2.3: Update Automations to Use Settings

**Files:**
- Modify: `src/lib/email/automations.ts`

**Step 1: Import and use settings**

Update the automations file to read from `firm_settings`:

```typescript
import { getFirmSettings } from '@/lib/data/queries'

export async function sendIntakeReminders(): Promise<AutomationResult> {
  const result: AutomationResult = { sent: 0, failed: 0, errors: [] }

  try {
    const settings = await getFirmSettings()

    // Check if enabled
    if (settings.automation_intake_reminder_enabled !== 'true') {
      return result
    }

    const hoursThreshold = parseInt(settings.automation_intake_reminder_hours || '24', 10)
    const supabase = supabaseAdmin()
    const thresholdDate = new Date()
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold)

    // Find matters in "Intake Sent" stage that haven't been updated
    const { data: matters, error } = await supabase
      .from('matters')
      .select('id, title, client_id, updated_at')
      .eq('stage', 'Intake Sent')
      .lt('updated_at', thresholdDate.toISOString())

    // ... rest of function
  }
}
```

Apply similar changes to `sendActivityReminders()` and `sendInvoiceReminders()`.

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/email/automations.ts
git commit -m "feat: use firm settings for automation timing"
```

---

## Feature 3: AI Document Summary

### Task 3.1: Add AI Summary Fields to Documents

**Files:**
- Create: `supabase/migrations/20260127000002_document_ai_summary.sql`

**Step 1: Write migration**

```sql
-- Add AI summary fields to matter_documents table

ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_document_type TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_suggested_folder TEXT;
ALTER TABLE matter_documents ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;
```

**Step 2: Apply migration**

Run:
```bash
docker exec -i matterflow-db psql -U postgres -d postgres < supabase/migrations/20260127000002_document_ai_summary.sql
```

**Step 3: Regenerate types**

Run: `pnpm supabase gen types typescript --local > src/types/database.types.ts`

**Step 4: Commit**

```bash
git add supabase/migrations/20260127000002_document_ai_summary.sql src/types/database.types.ts
git commit -m "feat: add AI summary fields to documents table"
```

---

### Task 3.2: Create Document AI Summary Function

**Files:**
- Create: `src/lib/ai/document-summary.ts`

**Step 1: Write the function**

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface DocumentSummaryResult {
  documentType: string
  summary: string
  suggestedFolder: string
}

const DOCUMENT_TYPES = [
  'Contract',
  'Employment Agreement',
  'Employee Handbook',
  'Policy Document',
  'Insurance Form',
  'Correspondence',
  'Invoice',
  'Legal Filing',
  'Other',
] as const

const FOLDER_MAPPING: Record<string, string> = {
  'Contract': '01 Source Docs',
  'Employment Agreement': '01 Source Docs',
  'Employee Handbook': '01 Source Docs',
  'Policy Document': '01 Source Docs',
  'Insurance Form': '01 Source Docs',
  'Correspondence': '01 Source Docs',
  'Invoice': '04 Billing & Engagement',
  'Legal Filing': '02 Work Product',
  'Other': '01 Source Docs',
}

/**
 * Generate AI summary of document content
 */
export async function summarizeDocument({
  filename,
  textContent,
}: {
  filename: string
  textContent: string
}): Promise<DocumentSummaryResult> {
  try {
    // Truncate content to avoid token limits
    const truncatedContent = textContent.slice(0, 4000)

    const prompt = `Analyze this document and provide a summary.

Filename: ${filename}

Content preview:
${truncatedContent}

Respond in JSON format:
{
  "documentType": "One of: ${DOCUMENT_TYPES.join(', ')}",
  "summary": "2-3 sentence summary of what this document contains, key parties, and notable terms"
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return getDefaultResult(filename)
    }

    const parsed = JSON.parse(content)
    const documentType = DOCUMENT_TYPES.includes(parsed.documentType)
      ? parsed.documentType
      : 'Other'

    return {
      documentType,
      summary: parsed.summary || `Document: ${filename}`,
      suggestedFolder: FOLDER_MAPPING[documentType] || '01 Source Docs',
    }
  } catch (error) {
    console.error('Document summary error:', error)
    return getDefaultResult(filename)
  }
}

function getDefaultResult(filename: string): DocumentSummaryResult {
  return {
    documentType: 'Other',
    summary: `Uploaded document: ${filename}`,
    suggestedFolder: '01 Source Docs',
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/document-summary.ts
git commit -m "feat: add AI document summary function"
```

---

### Task 3.3: Integrate AI Summary into Document Upload

**Files:**
- Modify: `src/lib/data/actions.ts` (document upload action)

**Step 1: Add AI processing after upload**

In the document upload action, after successful Google Drive upload, add:

```typescript
import { summarizeDocument } from '@/lib/ai/document-summary'
import pdf from 'pdf-parse'

// After uploading to Drive, extract text and summarize
let aiResult = null
try {
  // Extract text based on file type
  let textContent = ''
  if (file.type === 'application/pdf') {
    const pdfData = await pdf(Buffer.from(await file.arrayBuffer()))
    textContent = pdfData.text
  } else if (file.type.includes('text')) {
    textContent = await file.text()
  }

  if (textContent) {
    aiResult = await summarizeDocument({
      filename: file.name,
      textContent,
    })
  }
} catch (err) {
  console.error('AI summary failed:', err)
}

// Update document record with AI summary
if (aiResult) {
  await supabase
    .from('matter_documents')
    .update({
      ai_document_type: aiResult.documentType,
      ai_summary: aiResult.summary,
      ai_suggested_folder: aiResult.suggestedFolder,
      ai_processed_at: new Date().toISOString(),
    })
    .eq('id', documentId)
}
```

**Step 2: Add pdf-parse dependency**

Run: `pnpm add pdf-parse && pnpm add -D @types/pdf-parse`

**Step 3: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/data/actions.ts package.json pnpm-lock.yaml
git commit -m "feat: integrate AI summary into document upload"
```

---

### Task 3.4: Update Documents UI to Show AI Summary

**Files:**
- Modify: Document list component (find in codebase)

**Step 1: Display AI summary in document cards**

Add to document list rendering:

```tsx
{document.ai_summary && (
  <div className="mt-2">
    <Badge variant="outline">{document.ai_document_type}</Badge>
    <p className="text-sm text-muted-foreground mt-1">{document.ai_summary}</p>
  </div>
)}
```

**Step 2: Verify UI renders**

Run: `pnpm dev`
Upload a document, verify AI summary appears.

**Step 3: Commit**

```bash
git add src/app/documents/ src/components/documents/
git commit -m "feat: display AI summary in document list"
```

---

## Final Steps

### Task F.1: Run Full Test Suite

Run: `pnpm test`
Expected: All tests pass (except known auth failures)

### Task F.2: Manual E2E Test

1. Create a new matter with client
2. Sync Gmail emails for the matter
3. Verify emails appear with AI summaries
4. Upload a document
5. Verify AI document summary appears
6. Go to `/admin/settings/automations`
7. Toggle and adjust automation settings
8. Verify changes save

### Task F.3: Final Commit

```bash
git push origin main
```

---

## Dependencies Summary

**New packages needed:**
- `openai` - AI summaries
- `pdf-parse` + `@types/pdf-parse` - PDF text extraction

**Environment variables needed:**
- `OPENAI_API_KEY` - For AI summaries

**Database migrations:**
- `20260127000001_gmail_sync.sql` - Email sync table
- `20260127000002_document_ai_summary.sql` - AI fields on documents
