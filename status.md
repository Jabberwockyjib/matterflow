# Project Status

**Last Updated:** 2026-01-27

## Current State

MatterFlow launch scope finalized with client. Core features are built; 3 remaining features required before launch.

**What's Ready:**
- Matter pipeline, time tracking, invoicing, Square payments
- Client portal (view, upload, intake forms, pay)
- Email sending (all notifications + branding)
- Google Drive document organization

**What Needs to be Built (Launch Blockers):**
1. Gmail incoming email sync with AI summaries
2. Automation configuration UI
3. AI document summary on upload

**Design Document:** `docs/plans/2026-01-27-launch-scope-design.md`

**Build Status:** `pnpm typecheck` passes, `pnpm test` passes (1109/1112 tests, 3 pre-existing auth test failures)

**Git Status:** Uncommitted changes for email branding feature (22 modified, 3 new files)

## Recent Changes (2026-01-27)

### Launch Scope Finalized
- Completed brainstorming session with client
- Defined 3 features required for launch
- Cut 8 features from original PRD (staff roles, AI agents, reports)
- Created design document: `docs/plans/2026-01-27-launch-scope-design.md`

## Recent Changes (Previous Session)

### Email Branding System
- **New:** `supabase/migrations/20260113000001_firm_settings.sql` - Database table for settings
- **New:** `src/types/firm-settings.ts` - TypeScript types and defaults
- **New:** `src/app/admin/settings/page.tsx` + `settings-form.tsx` - Admin UI with live preview
- **Modified:** `src/types/database.types.ts` - Added firm_settings table definition
- **Modified:** `src/lib/data/queries.ts` - Added `getFirmSettings()` with 5-min cache
- **Modified:** `src/lib/data/actions.ts` - Added `updateFirmSettings()`, `ensureAdmin()`
- **Modified:** `src/lib/email/templates/base-layout.tsx` - Accepts settings for branding
- **Modified:** All 11 email templates - Accept and pass `settings` prop
- **Modified:** `src/lib/email/actions.ts` - All 12 functions fetch and pass settings

### Tests Added
- `tests/lib/email/payment-received.test.ts` - 9 tests
- `tests/lib/email/intake-declined.test.ts` - 11 tests

## Email Coverage (Complete)

| Trigger | Recipient | Template |
|---------|-----------|----------|
| Matter created | Client | matter-created |
| Intake submitted | Lawyer | intake-submitted |
| Intake declined | Client | intake-declined |
| Info request created | Client | info-request |
| Info response submitted | Lawyer | info-response-received |
| Task assigned | Client | task-assigned |
| Invoice sent | Client | invoice-sent |
| Payment received | Client + Lawyer | payment-received |
| Cron: Intake reminder | Client | intake-reminder |
| Cron: Activity reminder | Client/Lawyer | activity-reminder |

## Known Issues

- 3 pre-existing auth test failures (unrelated to email work)
- Docker must be running to apply migrations

## Architecture Notes

- Firm settings stored as key-value pairs in `firm_settings` table
- Settings cached in-memory for 5 minutes to reduce DB calls
- `ensureAdmin()` helper restricts settings updates to admin role only
- Email templates use optional `settings` prop with fallback to defaults
- Admin settings page includes real-time preview of email appearance
- Color picker component for brand color selection

## Verification Commands

```bash
pnpm typecheck     # TypeScript validation
pnpm test --run    # Run all tests
pnpm dev           # Start dev server on port 3001
```

## To Commit Changes

```bash
git add -A
git commit -m "feat: add email branding configuration with admin settings page"
git push
```
