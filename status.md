# Project Status

**Last Updated:** 2026-02-07

## Current State

MatterFlow is deployed to production at `matter.develotype.com` (Docker on VPS at 178.156.188.33). The full client onboarding flow now supports **anonymous intake** — clients can fill and submit intake forms without creating an account first. Matters are auto-created when the lawyer sends an invitation. Clients are prompted to create accounts on the thank-you page and via email after intake approval. The existing signup-first flow still works.

**What's Working:**
- Matter pipeline, time tracking, invoicing, Square payments
- **Anonymous intake forms** — clients receive invite link, fill form without account, prompted to create account after
- **Auto-created matters on invite** — matter immediately created when lawyer invites client
- **Account linking on signup** — if client creates account later, existing matter is automatically linked
- Firm logo upload — auto-resized via sharp, renders in all email templates
- Configurable payment reminders — 3-phase schedule
- Email Template Editor (admin only)
- Client portal (view, upload, intake forms, pay)
- Email sending via Gmail API (practice-wide OAuth)
- Google Drive document organization with auto-folder creation
- Gmail incoming email sync with AI summaries
- Client invitation flow with email + link copying

**All working pages are navigable from the sidebar** — verified 2026-02-06.

**Production URL:** https://matter.develotype.com
**Build Status:** `pnpm build` passes (not yet deployed with anonymous intake changes)

## Recent Changes (2026-02-07)

### Anonymous Intake Forms with Deferred Account Creation

**Flow:** Lawyer invites client → matter auto-created → client clicks invite link → intake form shown (no account needed) → client submits → thank-you page with "Create Account" option → admin approves → account creation email sent → client signs up → matter linked

**14 files modified/created:**

| File | Change |
|------|--------|
| `supabase/migrations/20260207000001_anonymous_intake.sql` | NEW — `matter_id` on invitations, `invitation_id`/`client_name`/`client_email` on matters |
| `src/types/database.types.ts` | Updated types for new columns |
| `src/middleware.ts` | Removed `/intake` from protected routes |
| `src/lib/data/actions.ts` | `inviteClient()` auto-creates matter |
| `src/app/intake/invite/[code]/page.tsx` | REWRITTEN — no auth, uses `matter_id` lookup |
| `src/app/intake/[matterId]/page.tsx` | Accepts `?code=` for anonymous access |
| `src/app/intake/[matterId]/intake-form-client.tsx` | Passes `inviteCode` to renderer and redirect |
| `src/components/intake/dynamic-form-renderer.tsx` | Passes `inviteCode` to upload API |
| `src/lib/intake/client-actions.ts` | Sends `inviteCode` in FormData |
| `src/app/api/intake/upload/route.ts` | Accepts invite code as anonymous auth |
| `src/lib/intake/actions.ts` | Fixed null `client_id` crash, marks invitation completed, sends account creation email on approval |
| `src/app/intake/[matterId]/thank-you/page.tsx` | "Create Account" section for anonymous users |
| `src/lib/email/templates/account-creation-email.tsx` | NEW — post-approval email |
| `src/lib/email/actions.ts` | `sendAccountCreationEmail()` |
| `src/lib/email/types.ts` | Added `account_creation` to `EmailType` |
| `src/lib/auth/signup-actions.ts` | Links matter to user on signup (password + OAuth) |

**Tests updated:** `middleware-intake.test.ts`, `intake-upload-auth.test.ts`, `client-actions.test.ts`, `fixtures.ts`

**Migration:** Applied to production via Supabase MCP.

## Known Issues

- Code changes not yet deployed to production (need `git push && ssh deploy`)
- Existing uploads before Google fix: Files are in different Google account. User needs to reconnect with correct account
- `tests/lib/email/client.test.ts` is broken - imports `sendInvitationEmail` which isn't exported (pre-existing)
- Test file `tests/hooks/useKeyboardShortcut.test.ts` has TypeScript errors with vitest mocks (pre-existing)
- `tests/integration/tasks.test.tsx` fails on `instructions` field, `tests/validation/schemas.test.ts` on task status enum (pre-existing)
- Email template editor preview shows body-only (no BaseLayout header/footer) — by design

## Architecture Notes

### Anonymous Intake Flow
- **Authorization:** Invite code (`?code=` query param) verified against `client_invitations.matter_id` ↔ `matters.invitation_id`
- **Middleware:** `/intake` routes are NOT protected — each page handles its own auth (code verification or session check)
- **File uploads:** Anonymous uploads authorized by verifying invite code in `POST /api/intake/upload`
- **Matter creation:** Happens in `inviteClient()` at invitation time, not when client visits the link
- **Legacy support:** Old invitations without `matter_id` trigger matter creation on first visit to invite link
- **Account linking:** `signUpWithInviteCode()` and `linkUserToInvitation()` both set `matters.client_id` when user creates account
- **Invitation lifecycle:** `pending` → `completed` (set by `submitIntakeForm` on anonymous submit, or by signup actions)

### Firm Logo Upload
- **Storage:** Supabase Storage `firm-assets` bucket, files at `logos/firm-logo-{timestamp}.{ext}`
- **Setting:** `firm_settings.logo_url` stores the public URL
- **Resize:** sharp (server-side) to max 400x200px PNG; SVGs pass through as-is

### Payment Reminder System
- **Settings source:** `firm_settings` table (not `practice_settings`)
- **Automation:** `sendInvoiceReminders()` runs via `/api/cron/email-automations`
- **Duplicate prevention:** `invoices.last_reminder_sent_at` checked against frequency

### Email Template System
- **Database:** `email_templates` + `email_template_versions` (history)
- **Rendering:** `renderEmailWithPlaceholders(template, data)` replaces `{{token}}` with values

## Verification Commands

```bash
pnpm build        # Production build (passes)
pnpm typecheck    # TypeScript validation (passes, ignoring pre-existing test file errors)
pnpm test --run   # Run all tests (3 pre-existing failures, 85 files pass)
pnpm dev          # Start dev server on port 3001

# Production deployment (VPS via Docker)
git push origin main && ssh deploy@178.156.188.33 "cd ~/matterflow && git pull && docker compose -f docker-compose.prod.yml build --no-cache && docker compose -f docker-compose.prod.yml up -d"

# Verify production health
ssh deploy@178.156.188.33 "curl -s http://localhost:3002/api/health"
```
