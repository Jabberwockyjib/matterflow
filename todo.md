# TODO

## In Progress
- (none)

## Next Up
- [ ] Manual E2E test: Full client onboarding flow (invite → signup → intake → review → approve)
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

## Completed (This Session - 2026-01-28)
- [x] Fixed Google OAuth redirect for production (use NEXT_PUBLIC_APP_URL)
- [x] Updated integrations panel - removed Resend, added Google Workspace status with Drive+Gmail indicators
- [x] Implemented automatic Gmail sync cron endpoint (`/api/cron/gmail-sync`)
- [x] Added Google disconnect/reconnect functionality in settings
- [x] Fixed AI JSON parsing when Claude returns markdown-wrapped responses (stripMarkdownCodeBlock helper)
- [x] Set up VPS auto-deploy script (polls git every 5 minutes)
- [x] Fixed client invitation email flow (contact_email was missing in practice_settings)
- [x] Fixed client signup redirect to continue intake flow after authentication
- [x] Added resend intake reminder with copy link button on matter detail page
- [x] Fixed "no email provided" on intake cards - now fetches from auth instead of form responses
- [x] Enabled "Review Intake" button - links to `/admin/intake/[intakeId]`
- [x] Added file upload support for intake forms via `/api/intake/upload`
- [x] Auto-initialize Google Drive folders when uploading intake files
- [x] Added General intake template for matters created with "General" type
- [x] Created invitation detail page at `/admin/invitations/[id]`
- [x] Added resendInvitationEmail, cancelInvitation, extendInvitation server actions
- [x] Enabled View and Copy buttons on invitation pipeline cards

## Completed (Previous Sessions)
### 2026-01-27
- [x] Implemented Gmail incoming email sync with AI summaries
- [x] Created automation configuration UI at `/admin/settings/automations`
- [x] Added AI document summary on upload

### 2026-01-21
- [x] Implemented email template branding/configuration system
- [x] Added email template tests for payment-received and intake-declined

### 2026-01-13
- [x] Reviewed and committed email system changes
- [x] Committed session handoff files, plans, and document templates
