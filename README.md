# MatterFlow™

**Workflow-first legal practice management system for solo and small-firm lawyers.**

MatterFlow is a comprehensive matter management platform that eliminates the need to juggle multiple tools (email, case management, billing, documents). Built with Next.js, Supabase, and integrated with Google Drive and email automation.

---

## 🚀 Quick Start

**New to MatterFlow?** Follow the complete setup guide:

### **[📖 Full Setup Instructions →](SETUP.md)**

The setup guide walks you through:
- Installing prerequisites
- Configuring Supabase, Resend, and Google Drive
- Setting up environment variables
- Running your first matter

**Estimated setup time**: 30-45 minutes

---

## ✨ Features

### Core Functionality ✅
- **Matter Pipeline Management**: Track matters through 11 defined stages (Lead Created → Completed)
- **Time Tracking**: Effortless timer-based and manual time entry
- **Task Management**: Assign tasks to clients or staff with due dates
- **Billing & Invoicing**: Create and manage invoices (Square integration coming soon)
- **Dashboard**: Clear visibility of what's stuck and who's responsible

### Email Integration ✅ (NEW)
- **Transactional Emails**: Automatic emails when matters are created, invoices sent, tasks assigned
- **Automated Reminders**:
  - Intake reminders (24h)
  - Client activity reminders (3 days idle)
  - Lawyer activity reminders (7 days idle)
  - Invoice reminders (3, 7, 14 days overdue)
- **Beautiful Templates**: 5 professional React Email templates
- **Cron Scheduling**: Daily automated email runs

### Google Drive Integration ✅ (NEW)
- **Automatic Folder Structure**: `/Client Name/Matter Name/00 Intake, 01 Source Docs, 02 Work Product, etc.`
- **Document Upload**: Direct upload to organized Google Drive folders
- **Version Control**: Automatic file versioning
- **Client Sharing**: Share documents securely via email
- **Metadata Storage**: Track all documents in Supabase

### Security & Access Control ✅
- **Row-Level Security (RLS)**: Enforced across all tables
- **Role-Based Access**: Admin, Staff, and Client roles
- **Audit Logging**: All mutations tracked
- **OAuth 2.0**: Secure Google Drive authentication

---

## 📊 MVP Status

| Feature | Status | Documentation |
|---------|--------|---------------|
| Matter Management | ✅ Complete | `CLAUDE.md` |
| Time Tracking | ✅ Complete | `CLAUDE.md` |
| Task Management | ✅ Complete | `CLAUDE.md` |
| Basic Invoicing | ✅ Complete | `CLAUDE.md` |
| Email Integration | ✅ Complete | `EMAIL_INTEGRATION.md` |
| Google Drive | ✅ Complete | `GOOGLE_DRIVE_INTEGRATION.md` |
| Square Payments | ✅ Complete | `SQUARE_INTEGRATION.md` |
| Intake Forms | ✅ Complete | `INTAKE_FORMS.md` |
| Conflict Checking | ⏳ Planned | `project.md` |

**Current MVP Completion**: ~95%

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 3
- **Backend**: Supabase (Postgres + RLS + Auth)
- **Email**: Resend + React Email
- **Documents**: Google Drive API
- **Payments**: Square Invoices API
- **UI Components**: shadcn/ui style components
- **Testing**: Vitest + React Testing Library
- **Package Manager**: pnpm

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js routes (matters, tasks, time, billing, documents)
├── components/             # React components
│   ├── ui/                 # shadcn-style primitives (Button, Card, etc.)
│   ├── forms/              # Form components
│   └── ...                 # Feature-specific components
├── lib/
│   ├── auth/               # Authentication utilities
│   ├── data/               # Server actions and queries
│   ├── email/              # Email client, templates, automations
│   ├── google-drive/       # Google Drive client and operations
│   ├── supabase/           # Supabase clients
│   └── utils.ts            # Shared utilities
├── contexts/               # React contexts (timer, etc.)
└── types/                  # TypeScript type definitions

supabase/
├── migrations/             # Database migrations
└── seed.sql                # Seed data

tests/                      # Vitest tests
```

---

## 🚀 Development

### Prerequisites

- Node.js 18+
- pnpm
- Supabase CLI

### Install

```bash
pnpm install
```

### Configure

1. Copy environment template:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your credentials (see [SETUP.md](SETUP.md) for detailed instructions)

### Run

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Preview email templates
pnpm email
```

### Database

```bash
# Start local Supabase
supabase start

# Run migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.types.ts
```

---

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide for new users
- **[CLAUDE.md](CLAUDE.md)** - Developer guide and architecture overview
- **[project.md](project.md)** - Full PRD and product requirements
- **[AGENTS.md](AGENTS.md)** - Contribution guidelines

### Integration Guides

- **[EMAIL_INTEGRATION.md](EMAIL_INTEGRATION.md)** - Email system setup and API reference
- **[GOOGLE_DRIVE_INTEGRATION.md](GOOGLE_DRIVE_INTEGRATION.md)** - Google Drive setup and usage
- **[SQUARE_INTEGRATION.md](SQUARE_INTEGRATION.md)** - Square payment processing and webhooks
- **[INTAKE_FORMS.md](INTAKE_FORMS.md)** - Dynamic intake forms and client onboarding

### Summaries

- **[EMAIL_INTEGRATION_SUMMARY.md](EMAIL_INTEGRATION_SUMMARY.md)** - Quick email reference
- **[GOOGLE_DRIVE_SUMMARY.md](GOOGLE_DRIVE_SUMMARY.md)** - Quick Drive reference
- **[SQUARE_INTEGRATION_SUMMARY.md](SQUARE_INTEGRATION_SUMMARY.md)** - Quick Square reference

---

## 🔐 Environment Variables

Required environment variables (see [SETUP.md](SETUP.md) for how to get these):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Google Drive
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Square Payments
SQUARE_ACCESS_TOKEN=
SQUARE_ENVIRONMENT=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=

# Application
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

Current test files:
- `tests/actions.test.ts` - Server action tests
- `tests/utils.test.ts` - Utility function tests
- `tests/validation/schemas.test.ts` - Validation tests
- Component tests for dashboard, forms, etc.

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Supabase

- Use Supabase Cloud (not local)
- Run migrations: `supabase db push`

### Email Cron (Production)

Add `vercel.json`:

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

See [EMAIL_INTEGRATION.md](EMAIL_INTEGRATION.md) for alternative cron setups.

---

## 🗺 Roadmap

### Completed ✅
- [x] Matter pipeline management
- [x] Time tracking (timer + manual)
- [x] Task management
- [x] Basic invoicing
- [x] Email integration (Resend)
- [x] Email automations (reminders)
- [x] Google Drive integration
- [x] Automatic folder structure
- [x] Document upload/management
- [x] OAuth 2.0 authentication
- [x] Square payment integration
- [x] Automatic invoice syncing to Square
- [x] Payment link generation
- [x] Webhook payment status updates
- [x] Intake form system (dynamic forms per matter type)
- [x] Form validation and draft saving
- [x] Intake form UI components (client submission + admin review)
- [x] Comprehensive documentation

### In Progress 🚧
- [ ] Invoice auto-generation from time entries
- [ ] Conflict checking workflow

### Planned 📋
- [ ] AI document classification
- [ ] Gmail send/receive integration
- [ ] Communications timeline UI
- [ ] Package/pricing templates
- [ ] Advanced reporting
- [ ] Mobile responsive optimization
- [ ] Client portal views

---

## 🤝 Contributing

See [AGENTS.md](AGENTS.md) for contribution guidelines.

Key points:
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`)
- Keep PRs focused and small
- Include tests for new features
- Reference PRD sections in PRs

---

## 📄 License

[Add your license here]

---

## 🆘 Support

### Documentation
- [SETUP.md](SETUP.md) - Setup and configuration
- [CLAUDE.md](CLAUDE.md) - Architecture and development guide
- [EMAIL_INTEGRATION.md](EMAIL_INTEGRATION.md) - Email system
- [GOOGLE_DRIVE_INTEGRATION.md](GOOGLE_DRIVE_INTEGRATION.md) - Document management

### Troubleshooting

See the "Troubleshooting" section in [SETUP.md](SETUP.md) for common issues.

---

## 🎯 Project Goals

MatterFlow aims to be:
- **Focused**: Built specifically for solo and small-firm lawyers, not a generic Clio competitor
- **Workflow-First**: Clear visibility of matter status and responsibility
- **Integrated**: One system instead of juggling multiple tools
- **Efficient**: Reduce administrative time and eliminate duplicate work
- **Future SaaS Ready**: Clean foundation for commercial launch

---

**Built with ❤️ for legal professionals who want to focus on law, not administrative overhead.**
