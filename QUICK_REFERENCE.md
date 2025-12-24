# MatterFlow Quick Reference Card

## 🚀 Getting Started

**First time setup?** → Read [SETUP.md](SETUP.md) (30-45 mins)

**Already set up?** → Run `pnpm dev` and go to http://localhost:3000

---

## 📋 Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Supabase account created
- [ ] Resend account created
- [ ] Google Cloud project created
- [ ] `.env.local` file configured

---

## 🔑 Required Services

| Service | Purpose | Get It From | Cost |
|---------|---------|-------------|------|
| **Supabase** | Database + Auth | [supabase.com](https://supabase.com) | Free tier available |
| **Resend** | Email sending | [resend.com](https://resend.com) | Free: 100 emails/day |
| **Google Cloud** | Drive API | [console.cloud.google.com](https://console.cloud.google.com) | Free tier available |
| **Square** | Payment processing | [squareup.com](https://squareup.com) | 2.9% + $0.30/transaction |

---

## ⚡ Quick Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm start                  # Run production

# Quality
pnpm lint                   # Check code quality
pnpm typecheck              # Check TypeScript
pnpm test                   # Run tests
pnpm test:watch             # Watch mode

# Email
pnpm email                  # Preview email templates

# Database
supabase start              # Start local Supabase
supabase db push            # Run migrations
supabase migration new      # Create new migration
```

---

## 🔐 Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase (from dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Resend (from dashboard → API Keys)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=MatterFlow <noreply@yourdomain.com>

# Google (from Cloud Console → Credentials)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Square (from Square Dashboard → Credentials)
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_ENVIRONMENT=sandbox
SQUARE_LOCATION_ID=L...
SQUARE_WEBHOOK_SIGNATURE_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=<random-32-char-string>
```

**Generate CRON_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📊 Feature Status

| Feature | Status | Docs |
|---------|--------|------|
| Matter Management | ✅ Live | `CLAUDE.md` |
| Time Tracking | ✅ Live | `CLAUDE.md` |
| Tasks | ✅ Live | `CLAUDE.md` |
| Invoicing | ✅ Live | `CLAUDE.md` |
| Email (Resend) | ✅ Live | `EMAIL_INTEGRATION.md` |
| Google Drive | ✅ Live | `GOOGLE_DRIVE_INTEGRATION.md` |
| Square Payments | ✅ Live | `SQUARE_INTEGRATION.md` |
| Intake Forms | ✅ Live | `INTAKE_FORMS.md` |

---

## 🗂 Key File Locations

### Configuration
- `.env.local` - Environment variables (⚠️ never commit!)
- `next.config.ts` - Next.js config
- `tailwind.config.ts` - Tailwind config
- `tsconfig.json` - TypeScript config

### Database
- `supabase/migrations/` - Database schema changes
- `supabase/seed.sql` - Sample data

### Code
- `src/app/` - Pages and routes
- `src/components/` - React components
- `src/lib/` - Business logic
  - `data/actions.ts` - Server actions (mutations)
  - `data/queries.ts` - Data fetching
  - `email/` - Email system
  - `google-drive/` - Document management

### Documentation
- `README.md` - Project overview
- `SETUP.md` - **Setup instructions** ⭐
- `CLAUDE.md` - Developer guide
- `project.md` - Full PRD

---

## 🛠 Common Tasks

### Create a Matter
1. Go to `/matters`
2. Click "Create Matter"
3. Fill in client, type, billing model
4. Add next action + due date
5. Submit

### Upload a Document
1. Connect Google Drive first (`/documents`)
2. Initialize matter folders (call `initializeMatterFolders()`)
3. Use `DocumentUpload` component
4. Select folder type (e.g., "01 Source Docs")
5. Choose file and upload

### Send an Email
Emails send automatically when:
- Matter created with client → Welcome email
- Invoice marked "sent" → Invoice email
- Task assigned to client → Task notification

Manual send:
```typescript
import { sendMatterCreatedEmail } from "@/lib/email/actions";
await sendMatterCreatedEmail({ ... });
```

### Set Up Cron (Production)
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/email-automations",
    "schedule": "0 9 * * *"
  }]
}
```

---

## 🚨 Troubleshooting

### "Cannot connect to Supabase"
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify project is running in Supabase dashboard
- Restart dev server

### "Email not sending"
- Check `RESEND_API_KEY` is valid
- Verify domain in Resend dashboard
- Check Resend dashboard → Emails for errors

### "Google Drive not connected"
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check redirect URI in Google Cloud Console exactly matches
- Ensure Drive API is enabled

### "Port 3000 in use"
```bash
lsof -ti:3000 | xargs kill -9
# Or use different port: pnpm dev -p 3001
```

### "Module not found"
```bash
rm -rf node_modules .next
pnpm install
pnpm dev
```

---

## 📚 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [README.md](README.md) | Project overview | Everyone |
| [SETUP.md](SETUP.md) | **Step-by-step setup** | **New users** ⭐ |
| [CLAUDE.md](CLAUDE.md) | Architecture guide | Developers |
| [project.md](project.md) | Full PRD | Product team |
| [EMAIL_INTEGRATION.md](EMAIL_INTEGRATION.md) | Email system details | Developers |
| [GOOGLE_DRIVE_INTEGRATION.md](GOOGLE_DRIVE_INTEGRATION.md) | Drive integration | Developers |
| [AGENTS.md](AGENTS.md) | Contribution guide | Contributors |

---

## 🔗 Important URLs

### Development
- **Local App**: http://localhost:3000
- **Email Preview**: `pnpm email` → http://localhost:3000

### Services
- **Supabase**: https://supabase.com/dashboard
- **Resend**: https://resend.com/emails
- **Google Cloud**: https://console.cloud.google.com

### API Endpoints
- `/api/auth/google` - Initiate Google OAuth
- `/api/auth/google/callback` - OAuth callback
- `/api/cron/email-automations` - Email reminders (GET)

---

## 💡 Pro Tips

1. **Use local Supabase for development**: Faster, no network latency
2. **Preview emails before sending**: Use `pnpm email` to test templates
3. **Test OAuth locally**: Use `http://localhost:3000` in redirect URIs
4. **Keep secrets safe**: Never commit `.env.local` to git
5. **Check logs**: Use Supabase dashboard to view database logs
6. **Monitor emails**: Resend dashboard shows all sent emails
7. **Use TypeScript**: Run `pnpm typecheck` before committing

---

## ⏱ Estimated Times

- **Initial setup**: 30-45 minutes
- **Create Supabase project**: 2-5 minutes
- **Configure Google Cloud**: 10-15 minutes
- **Set up Resend**: 5-10 minutes (or 30 mins with domain)
- **First matter**: < 1 minute
- **First document upload**: < 30 seconds

---

## 🎯 Next Steps After Setup

1. ✅ Create your admin account
2. ✅ Connect Google Drive
3. ✅ Create a test matter
4. ✅ Initialize matter folders
5. ✅ Upload a test document
6. ✅ Send a test email
7. ✅ Test time tracking
8. ✅ Create an invoice

---

## 📞 Getting Help

**Issue?** Check troubleshooting in [SETUP.md](SETUP.md)

**Architecture question?** Read [CLAUDE.md](CLAUDE.md)

**Email not working?** See [EMAIL_INTEGRATION.md](EMAIL_INTEGRATION.md)

**Drive issue?** See [GOOGLE_DRIVE_INTEGRATION.md](GOOGLE_DRIVE_INTEGRATION.md)

---

**Last Updated**: December 2024
**Version**: MVP v0.7
**Status**: ~70% Complete
