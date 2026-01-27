# TODO

## In Progress
- (none)

## Next Up (Pre-Launch)
- [ ] Apply database migrations when Docker is running
- [ ] Push all commits to origin: `git push`
- [ ] Add OPENAI_API_KEY to environment
- [ ] Manual E2E test: Full matter lifecycle with Gmail sync
- [ ] Test Square webhook with ngrok for payment confirmation emails
- [ ] Production environment setup (Supabase, Google OAuth, Square, Resend, OpenAI)
- [ ] CaseFox data migration

## Backlog
- [ ] Invoice PDF generation
- [ ] Document template variable extraction
- [ ] SSO beyond Google
- [ ] Call scheduling with calendar invites
- [ ] Email delivery status tracking (Resend webhooks for bounces/opens)
- [ ] Unsubscribe preferences for non-essential emails

## Completed (Previous Sessions)
### 2026-01-21
- [x] Implemented email template branding/configuration system
  - Created `firm_settings` database table with migration
  - Added `FirmSettings` type definition (`src/types/firm-settings.ts`)
  - Added `getFirmSettings()` query with 5-minute in-memory caching
  - Added `updateFirmSettings()` admin-only server action
  - Added `ensureAdmin()` authorization helper
  - Updated `base-layout.tsx` to accept and use settings
  - Updated all 11 email templates to accept `settings` prop
  - Updated all 12 email action functions to fetch and pass settings
  - Built admin settings page at `/admin/settings` with live preview
- [x] Added email template tests for payment-received and intake-declined
- [x] Applied migration to local database
### 2026-01-13
- [x] Reviewed and committed email system changes (`3a76b48`)
- [x] Committed session handoff files, plans, and document templates

### 2026-01-07
- [x] Fixed intake form validation - number fields now parse strings
- [x] Added info request/response email notifications
- [x] Created `payment-received.tsx` and `intake-declined.tsx` templates
- [x] Added email audit logging to `audit_logs` table
