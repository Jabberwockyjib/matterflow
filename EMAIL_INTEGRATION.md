# Email Integration Guide

Complete email integration for MatterFlow using Resend for transactional emails and Gmail API for full email management.

## Overview

The email system consists of three main components:

1. **Transactional Emails** - Automated notifications (invoices, matter updates, task assignments)
2. **Reminder Automations** - Scheduled reminders for intake, activity, and invoice follow-ups
3. **Gmail Integration** - Full email send/receive capability (coming soon)

## Quick Start

### 1. Install Dependencies

Already installed:
```bash
pnpm add resend react-email @react-email/components googleapis
```

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Resend API Key (get from https://resend.com/api-keys)
RESEND_API_KEY=re_your_api_key

# From email address (must be verified domain in Resend)
RESEND_FROM_EMAIL=MatterFlow <noreply@yourdomain.com>

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron secret for automation endpoint security
CRON_SECRET=your-random-secret-key-min-32-chars
```

### 3. Verify Domain in Resend

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Copy your API key to `.env.local`

## Transactional Emails

### Available Email Types

The system automatically sends emails for:

- **Matter Created** - When a new matter is created with a client
- **Invoice Sent** - When an invoice status is changed to "sent"
- **Task Assigned** - When a task is assigned to a client

### Sending Emails Manually

```typescript
import { sendMatterCreatedEmail } from "@/lib/email/actions";

await sendMatterCreatedEmail({
  to: "client@example.com",
  clientName: "Jane Doe",
  matterTitle: "Estate Planning",
  matterId: "matter-id",
  matterType: "Will",
  lawyerName: "Attorney Smith",
  nextAction: "Complete intake form",
  matterLink: "https://yourapp.com/matters/matter-id",
});
```

### Available Email Functions

All in `src/lib/email/actions.ts`:

- `sendMatterCreatedEmail()` - Welcome email when matter is created
- `sendInvoiceEmail()` - Invoice notification with payment link
- `sendTaskAssignedEmail()` - Task assignment notification
- `sendIntakeReminderEmail()` - Reminder to complete intake form
- `sendActivityReminderEmail()` - Reminder when matter is idle
- `sendInvoiceReminderEmail()` - Payment reminder for overdue invoices

## Email Templates

### Creating New Templates

Templates use [React Email](https://react.email) for beautiful, responsive emails.

1. Create template in `src/lib/email/templates/your-template.tsx`:

```typescript
import { Button, Text } from "@react-email/components";
import { BaseLayout } from "./base-layout";

export const YourTemplate = ({ name, link }) => (
  <BaseLayout preview="Subject line" heading="Email Heading">
    <Text style={paragraph}>Hi {name},</Text>
    <Text style={paragraph}>Your message here.</Text>
    <Button href={link} style={button}>
      Call to Action
    </Button>
  </BaseLayout>
);
```

2. Add email action in `src/lib/email/actions.ts`:

```typescript
export async function sendYourEmail(params) {
  const template = YourTemplate({ ...params });
  return sendTemplateEmail(
    params.to,
    "Email Subject",
    template,
    { type: "your_email_type", matterId: params.matterId }
  );
}
```

### Preview Templates Locally

```bash
# Start React Email dev server
pnpm email dev

# Opens http://localhost:3000 with live template previews
```

## Email Automations

### Automated Reminder Schedule

| Reminder Type | Trigger | Schedule |
|---------------|---------|----------|
| Intake Reminder | Matter in "Intake Sent" stage | 24 hours after last update |
| Client Activity | Matter waiting on client | 3 days idle |
| Lawyer Activity | Matter waiting on lawyer | 7 days idle |
| Invoice Reminder | Overdue invoice | 3, 7, and 14 days overdue |

### Running Automations

#### Via Cron Endpoint

The system provides `/api/cron/email-automations` for scheduled execution:

```bash
# Run all automations
curl -X GET http://localhost:3000/api/cron/email-automations \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Test specific automation
curl -X POST http://localhost:3000/api/cron/email-automations \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type": "intake"}'  # or "activity", "invoices", "all"
```

#### Setting Up Cron Jobs

**Option 1: Vercel Cron (Recommended for production)**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/email-automations",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Add to Vercel environment variables:
- `CRON_SECRET` - Your secret key

**Option 2: GitHub Actions**

Create `.github/workflows/cron-emails.yml`:

```yaml
name: Email Automations
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC

jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger email automations
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/email-automations \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Option 3: External Cron Service**

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Cronitor](https://cronitor.io)

Configure to call:
- URL: `https://yourapp.com/api/cron/email-automations`
- Method: `GET`
- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Daily at 9 AM

## Testing Emails

### Development Mode

Resend automatically catches emails in development and shows them in your dashboard instead of sending.

### Send Test Email

Create a test script:

```typescript
// scripts/test-email.ts
import { sendMatterCreatedEmail } from "@/lib/email/actions";

await sendMatterCreatedEmail({
  to: "your-email@example.com",
  clientName: "Test Client",
  matterTitle: "Test Matter",
  matterId: "test-123",
  matterType: "Test",
  lawyerName: "Test Lawyer",
  nextAction: "Test action",
  matterLink: "http://localhost:3000/matters/test-123",
});
```

Run with:
```bash
tsx scripts/test-email.ts
```

### Monitor Email Sends

- Check Resend dashboard: https://resend.com/emails
- View server logs for email send results
- Check audit logs in Supabase (future enhancement)

## Gmail API Integration (Future)

### Setup Steps

1. Create Google Cloud project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Implement OAuth flow for users
5. Store refresh tokens securely

### Planned Features

- Send emails through user's Gmail account
- Receive emails and attachments
- Create draft emails
- Display communications timeline in UI
- Auto-file emails to matter-specific labels

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Verify Domain**
   - Log into Resend
   - Check domain verification status
   - Ensure `RESEND_FROM_EMAIL` matches verified domain

3. **Check Logs**
   ```bash
   # Server logs will show email send attempts
   pnpm dev
   ```

4. **Test Resend Connection**
   ```typescript
   import { resend } from "@/lib/email/client";

   await resend.emails.send({
     from: "MatterFlow <noreply@yourdomain.com>",
     to: "you@example.com",
     subject: "Test",
     html: "<p>Test email</p>",
   });
   ```

### Cron Not Running

1. **Verify CRON_SECRET** is set
2. **Check cron configuration** (Vercel Cron, GitHub Actions, etc.)
3. **Test endpoint manually** with curl
4. **Check Vercel logs** (Deployments → Functions)

### Email Template Not Rendering

1. **Check React Email syntax** - must be valid React components
2. **Preview locally** with `pnpm email dev`
3. **Verify imports** - all components from `@react-email/components`

## Architecture

```
src/lib/email/
├── client.ts              # Resend client initialization
├── types.ts               # TypeScript interfaces
├── service.ts             # Core email sending logic
├── actions.ts             # High-level email functions
├── automations.ts         # Scheduled reminder logic
├── templates/
│   ├── base-layout.tsx    # Base email layout
│   ├── invoice-sent.tsx   # Invoice email template
│   ├── matter-created.tsx # Matter welcome email
│   ├── task-assigned.tsx  # Task notification email
│   ├── intake-reminder.tsx # Intake form reminder
│   └── activity-reminder.tsx # Activity reminder
└── index.ts               # Public exports

src/app/api/cron/
└── email-automations/
    └── route.ts           # Cron endpoint for automations
```

## Best Practices

1. **Always provide fallback values** for client names, matter titles, etc.
2. **Don't fail primary operations** if email fails (catch errors, log them)
3. **Include unsubscribe links** in marketing emails (not required for transactional)
4. **Test templates** in multiple email clients
5. **Monitor delivery rates** in Resend dashboard
6. **Respect email frequency** - don't spam users with reminders
7. **Log all email sends** to audit trail (future enhancement)

## Rate Limits

Resend limits by plan:
- **Free**: 100 emails/day
- **Pro**: 50,000 emails/month
- **Enterprise**: Custom limits

Monitor usage in Resend dashboard.

## Next Steps

- [ ] Add communications timeline UI to display sent emails
- [ ] Store sent emails in `communications` table for history
- [ ] Implement Gmail OAuth flow for send/receive
- [ ] Add email preferences per user (opt-out of reminders)
- [ ] Create email analytics dashboard
- [ ] Add support for email attachments
- [ ] Implement email threading for matter conversations

## Support

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
