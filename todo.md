# TODO

## In Progress
- (none)

## Next Up
- [ ] Manual E2E test: Complete owner + client workflow (create matter → intake → approval → invoice → payment)
- [ ] Preview email templates locally: `pnpm email`
- [ ] Test Square webhook with ngrok for payment confirmation emails
- [ ] Add tests for new email templates (payment-received, intake-declined)
- [ ] Push commits to origin: `git push`

## Backlog
- [ ] Invoice PDF generation
- [ ] Document template variable extraction
- [ ] SSO beyond Google
- [ ] Call scheduling with calendar invites
- [ ] Email delivery status tracking (Resend webhooks for bounces/opens)
- [ ] Unsubscribe preferences for non-essential emails

## Completed (This Session - 2026-01-13)
- [x] Reviewed and committed email system changes (`3a76b48`)
- [x] Committed session handoff files, plans, and document templates (`c657e65`)

## Completed (Previous Sessions)
### 2026-01-07
- [x] Fixed intake form validation - number fields now parse strings, file type checks both `mimeType` and `fileType`
- [x] Added info request/response email notifications
- [x] Added `resendInvoiceEmail()` server action
- [x] Created `payment-received.tsx` and `intake-declined.tsx` templates
- [x] Added `sendPaymentReceivedEmail()` wired to Square webhook
- [x] Added email audit logging to `audit_logs` table

### 2026-01-05
- [x] Increased server action body size limit to 10MB
- [x] Fixed file upload validation in intake form
- [x] Implemented client portal with restricted access
- [x] Completed UI gaps - task/time modals, invoice detail, template admin
