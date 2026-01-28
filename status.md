# Project Status

**Last Updated:** 2026-01-28

## Current State

MatterFlow is deployed to production at `matter.develotype.com` on a Hetzner VPS. The full client onboarding flow is now working: invite client → client signs up → client fills intake form (with file uploads) → admin reviews and approves. Gmail is used for all email sending (no longer using Resend). Auto-deploy is configured via git polling script on VPS.

**What's Working:**
- Matter pipeline, time tracking, invoicing, Square payments
- Client portal (view, upload, intake forms, pay)
- Email sending via Gmail API (practice-wide OAuth)
- Google Drive document organization with auto-folder creation
- Gmail incoming email sync with AI summaries
- Automatic Gmail sync via cron (`/api/cron/gmail-sync`)
- Automation configuration UI at `/admin/settings/automations`
- AI document summary on upload
- Client invitation flow with email + link copying
- Intake form submission with file uploads to Google Drive
- Intake review with approve/decline/request info actions
- Invitation management (view, resend, cancel, extend)

**Production URL:** https://matter.develotype.com
**Build Status:** `pnpm build` passes

## Recent Changes (2026-01-28)

### Production Deployment Fixes
- `src/app/api/auth/google/callback/route.ts` - Fixed OAuth redirect to use `NEXT_PUBLIC_APP_URL`
- `src/app/settings/integrations-panel.tsx` - Removed Resend, added Google Workspace with Drive+Gmail status

### Gmail Integration Improvements
- `src/app/api/cron/gmail-sync/route.ts` - New cron endpoint for automatic Gmail sync
- `src/lib/data/actions.ts` - Updated `syncGmailForMatter` to use practice-wide Google token
- `src/lib/data/actions.ts` - Added `disconnectGoogle` action
- `src/components/google-drive-connect.tsx` - Added disconnect/reconnect buttons

### AI JSON Parsing Fix
- `src/lib/ai/document-summary.ts` - Added `stripMarkdownCodeBlock` helper
- `src/lib/ai/email-summary.ts` - Added `stripMarkdownCodeBlock` helper
- `src/lib/document-templates/parsing.ts` - Added `stripMarkdownCodeBlock` helper

### Client Onboarding Flow Fixes
- `src/app/intake/invite/[code]/page.tsx` - Fixed redirect after signup to continue intake flow
- `src/app/settings/practice-settings-form.tsx` - Made contact email required with helper text
- `src/components/matters/resend-intake-button.tsx` - New component for resend + copy link
- `src/app/matters/[id]/page.tsx` - Added yellow banner for "Intake Sent" stage with resend options

### Intake Review Workflow Fixes
- `src/lib/data/queries.ts` - Updated `fetchIntakesByReviewStatus` to fetch client email from auth
- `src/lib/data/queries.ts` - Added `clientEmail` and `clientName` to `IntakeReview` type
- `src/components/clients/pipeline-card.tsx` - Enabled Review Intake button, linked to admin page
- `src/app/api/intake/upload/route.ts` - New API route for file uploads with auto-folder creation
- `src/lib/intake/client-actions.ts` - Client helper to call upload API
- `src/app/intake/[matterId]/intake-form-client.tsx` - Updated to upload files before form submission
- `src/lib/intake/templates.ts` - Added `generalIntakeTemplate` for "General" matter type
- `src/app/admin/intake/[intakeId]/page.tsx` - Added null check for matter relation

### Invitation Management
- `src/app/admin/invitations/[id]/page.tsx` - New invitation detail page
- `src/app/admin/invitations/[id]/invitation-actions.tsx` - Actions component
- `src/lib/data/actions.ts` - Added `resendInvitationEmail`, `cancelInvitation`, `extendInvitation`
- `src/components/clients/pipeline-card.tsx` - Enabled View and Copy buttons

## VPS Deployment

**Auto-deploy script:** `/home/deploy/auto-deploy.sh` (polls git every 5 minutes via cron)

**Cron jobs on VPS:**
```
*/5 * * * * /home/deploy/auto-deploy.sh >> /home/deploy/auto-deploy.log 2>&1
0 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://matter.develotype.com/api/cron/gmail-sync
0 6 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://matter.develotype.com/api/cron/email-automations
```

## Known Issues

- Intake form file upload requires Google Drive to be connected (shows error if not)
- Files uploaded before Google Drive folders existed won't retroactively appear (manual fix: re-upload)

## Architecture Notes

### Email Flow
- All emails now sent via Gmail API using practice-wide OAuth token stored in `practice_settings.google_refresh_token`
- No longer using Resend - removed from integrations panel
- Contact email must be set in Settings > Practice for emails to send

### Intake File Uploads
- Files uploaded via `/api/intake/upload` API route (FormData)
- Auto-creates Google Drive folders if they don't exist
- Files stored in "00 Intake" folder under the matter
- Document metadata stored in `documents` table

### Invitation Flow
- Invitations created in `client_invitations` table with unique `invite_code`
- Client clicks link → redirected to signup → redirected back to `/intake/invite/[code]`
- Matter auto-created with "Intake Sent" stage
- Client fills intake form → stage changes to "Intake Received"
- Admin reviews at `/admin/intake/[intakeId]`

## Verification Commands

```bash
pnpm build        # Production build (passes)
pnpm typecheck    # TypeScript validation
pnpm test --run   # Run all tests
pnpm dev          # Start dev server on port 3001
```
