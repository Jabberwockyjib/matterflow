# TODO

## In Progress
- (none)

## Next Up
- [ ] **Deploy anonymous intake to production** — `git push && ssh deploy` (code is ready, migration applied)
- [ ] **Token encryption at rest** — OAuth tokens in `practice_settings` stored as plaintext (low priority)
- [ ] **Leaked password protection** — Enable via Supabase dashboard (Auth → Settings)
- [ ] Manual E2E test: Anonymous intake flow (invite → click link in incognito → fill form → submit → create account)
- [ ] Manual E2E test: Existing signup-first flow still works after changes

- [ ] **Test Coverage Phase 2** - Core business logic with mocked Supabase (target 50%)
  - `lib/data/actions.ts` (47% → 70%): createMatter, createTask, createTimeEntry, startTimeEntry, stopTimeEntry
  - `lib/data/queries.ts` (34% → 60%): fetchMatters, fetchTasks, fetchTimeEntries
  - `lib/intake/actions.ts` (18% → 60%): saveIntakeFormDraft, submitIntakeForm, approveIntakeForm
- [ ] **Test Coverage Phase 3** - External API integrations (target 60%+)
  - `lib/square/*` (0%): Mock Square API responses for invoice sync, payment status
  - `lib/google-drive/*` (0%): Mock Drive API for folder creation, file upload
  - `lib/email/actions.ts` (0%): Mock Gmail API for email sending
  - `lib/document-templates/*` (0%): Mock Anthropic + mammoth for template parsing
- [ ] Test Square webhook with ngrok for payment confirmation emails
- [ ] CaseFox data migration
- [ ] Set up production monitoring/alerting

## Backlog
- [ ] Invoice PDF generation
- [ ] Document template variable extraction
- [ ] SSO beyond Google
- [ ] Call scheduling with calendar invites
- [ ] Email delivery status tracking (Gmail read receipts)
- [ ] Unsubscribe preferences for non-essential emails
- [ ] Bulk invitation import (CSV)

## Completed (This Session - 2026-02-07)
- [x] **Anonymous Intake Forms with Deferred Account Creation** — 10-phase implementation
  - **Migration:** `supabase/migrations/20260207000001_anonymous_intake.sql` — adds `matter_id` to `client_invitations`, `invitation_id`/`client_name`/`client_email` to `matters` (applied to production via MCP)
  - **Middleware:** Removed `/intake` from protected routes — intake pages handle their own auth via invite code verification
  - **Auto-create matter on invite:** `inviteClient()` in `src/lib/data/actions.ts` now creates a matter immediately when sending invitation
  - **Invite redemption rewrite:** `src/app/intake/invite/[code]/page.tsx` — no auth required, uses `matter_id` lookup, handles legacy invitations
  - **Anonymous intake access:** `src/app/intake/[matterId]/page.tsx` accepts `?code=` param, verifies invite code against matter
  - **Anonymous file uploads:** `src/app/api/intake/upload/route.ts` supports invite code as alternative to session auth
  - **Fixed submitIntakeForm crash:** `src/lib/intake/actions.ts` no longer crashes when `client_id` is null, marks invitation as completed
  - **Thank-you page enhanced:** `src/app/intake/[matterId]/thank-you/page.tsx` shows "Create Your Account" section for anonymous users
  - **Post-approval email:** New `src/lib/email/templates/account-creation-email.tsx` sent when admin approves anonymous intake
  - **Account linking:** `src/lib/auth/signup-actions.ts` links existing matter to new user on signup (both password and OAuth)
  - **Tests fixed:** Updated 3 test files (`middleware-intake`, `intake-upload-auth`, `client-actions`) and test fixtures
  - **Types updated:** `src/types/database.types.ts` and `tests/setup/mocks/fixtures.ts` for new columns

## Completed (Previous Session - 2026-02-06)
- [x] **Firm Logo Upload Feature** — Upload pipeline for firm branding in emails and settings
- [x] **Fixed orphaned navigation routes** — 3 pages only reachable by direct URL
- [x] **Configurable Payment Reminder Schedule** — Full 3-phase invoice reminder system
- [x] **Security Hardening (8 Phases)** — 34 vulnerabilities fixed, 58 new tests

## Completed (Previous Sessions)
### 2026-02-05/06
- [x] Email Template Editor Feature, Fixed CLAUDE.md Deployment Commands

### 2026-02-05
- [x] Minimum Billing Increment Feature

### 2026-02-04/05
- [x] Matter Workflow Edit UI, Interactive Task Management, Timer on Task Cards

### 2026-01-28
- [x] Fixed intake review 500, added 195 tests, Google OAuth production fix, Gmail sync cron

### 2026-01-27
- [x] Gmail incoming email sync, automation config UI, AI document summary
