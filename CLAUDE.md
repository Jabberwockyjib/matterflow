# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MatterFlow™** is a workflow-first legal practice management system for solo and small-firm lawyers. The MVP focuses on matter pipeline management, time tracking, billing (with Square integration), and document organization (with Google Drive integration). See `project.md` for the full PRD.

**Stack**: Next.js 15+ (App Router), Supabase (Postgres + RLS + Auth), Tailwind CSS 3, shadcn/ui components, pnpm.

## Available MCP Servers

This project has several MCP (Model Context Protocol) servers configured that provide extended capabilities:

### GitHub MCP
**Purpose**: GitHub repository operations, PR management, issue tracking

**Key Capabilities**:
- Create repositories (`create_repository`)
- Create/update files (`create_or_update_file`)
- Create pull requests (`create_pull_request`)
- Manage issues (`issue_read`, `issue_write`)
- Search code, repos, users (`search_code`, `search_repositories`, `search_users`)
- Get file contents (`get_file_contents`)
- List commits, branches, releases (`list_commits`, `list_branches`, `list_releases`)

**When to Use**:
- Creating/pushing to GitHub repositories
- Managing pull requests and code reviews
- Searching for code examples across GitHub
- Issue and project management

### Context7 MCP
**Purpose**: Fetch up-to-date library documentation

**Key Capabilities**:
- `resolve-library-id` - Find the correct Context7 library ID for a package
- `get-library-docs` - Fetch comprehensive documentation for a library

**When to Use**:
- Looking up API documentation for npm packages, frameworks, or libraries
- Understanding how to use specific library features
- Finding code examples for third-party dependencies
- Always call `resolve-library-id` first, then use the returned ID with `get-library-docs`

**Example Flow**:
```typescript
// 1. Resolve library ID
resolve-library-id({ libraryName: "next.js" })
// Returns: { id: "/vercel/next.js/v14.x", ... }

// 2. Get documentation
get-library-docs({
  context7CompatibleLibraryID: "/vercel/next.js/v14.x",
  topic: "server actions"
})
```

### Playwright MCP (Browser Automation)
**Purpose**: Web browser automation and testing

**Key Capabilities**:
- Navigate to URLs (`browser_navigate`)
- Take screenshots (`browser_take_screenshot`)
- Click elements (`browser_click`)
- Fill forms (`browser_fill_form`, `browser_type`)
- Capture page snapshots (`browser_snapshot`)
- Run Playwright code (`browser_run_code`)
- Handle dialogs, file uploads, drag and drop

**When to Use**:
- Testing web application flows
- Debugging UI issues
- Generating screenshots for documentation
- Automating browser-based tasks
- Visual regression testing

**Important**: Always use `browser_snapshot` (accessibility tree) instead of screenshots for interacting with pages. Screenshots are for visual reference only.

## Essential Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start Next.js dev server (http://localhost:3000)
pnpm build                # Production build
pnpm start                # Run production server

# Quality checks
pnpm lint                 # ESLint (Next.js config)
pnpm typecheck            # TypeScript validation (no emit)
pnpm test                 # Run all Vitest tests
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Generate coverage report

# Email development
pnpm email                # Preview email templates locally (React Email dev server)

# Supabase local development
supabase start            # Start local Supabase stack
supabase migration up     # Apply migrations
supabase gen types typescript --local > src/types/database.types.ts
```

## Architecture & Key Patterns

### Data Layer Architecture

**Two-tier data access pattern**:

1. **Server Actions** (`src/lib/data/actions.ts`):
   - All mutations (create, update, delete)
   - Marked with `"use server"`
   - Use `supabaseAdmin()` for service-role access
   - Enforce role-based authorization via `ensureStaffOrAdmin()`
   - Log all mutations to `audit_logs` table
   - Revalidate Next.js paths after mutations

2. **Query Functions** (`src/lib/data/queries.ts`):
   - Read-only data fetching
   - Graceful degradation: returns mock data if Supabase env vars missing
   - Used in Server Components and `layout.tsx`

**Critical**: Never use Supabase client-side for mutations. Always use server actions.

### Authentication & Authorization

- **Supabase Auth** with email/password (magic link optional, anonymous disabled)
- **Middleware** (`src/middleware.ts`):
  - Redirects unauthenticated users to `/auth/sign-in`
  - Decodes role from JWT `sb-access-token` cookie
  - Blocks mutation requests (POST/PUT/PATCH/DELETE) from `client` role
- **RLS Policies** (`supabase/migrations/0001_init.sql`):
  - Three roles: `admin`, `staff`, `client`
  - Clients can only see their own matters
  - Staff/admin have broader access
  - All policies enforce role checks via `current_user_role()` helper

### Database Schema (Core Tables)

- **profiles**: User metadata with `role` enum (admin/staff/client)
- **matters**: Central entity with pipeline stages, next_action, responsible_party
- **tasks**: Linked to matters, have due_date and responsible_party
- **time_entries**: Timer-based or manual, link to matter/task, require approval before billing
- **invoices**: Single source of truth for billing, sync to Square via `square_invoice_id`
- **documents**: Metadata for files stored in Google Drive
- **audit_logs**: System-wide audit trail for mutations and AI actions

**Important**: Every matter MUST have `next_action` and `next_action_due_date` (validated in actions). The `responsible_party` field drives dashboard views.

### Client-Side State Management

- **TimerProvider** (`src/contexts/timer-context.tsx`): React Context for time tracking state
- **AuthListener** (`src/components/auth-listener.tsx`): Handles client-side auth state changes
- Server state is fetched in `layout.tsx` and passed as props (matters, profile, session)

### Component Structure

- **App Router** routes in `src/app/*` (dashboard, matters, tasks, time, billing)
- **UI primitives** in `src/components/ui/*` (shadcn-style components using CVA + Tailwind)
- **AppShell** (`src/components/app-shell.tsx`): Main navigation shell with role-aware UI

### Testing Strategy

- **Vitest** with React Testing Library
- Tests mirror `src/` structure in `tests/`
- Mock Supabase calls; use fixtures for external APIs (Square, Google)
- Target ≥80% coverage once CI is wired

## Critical Constraints from PRD

1. **Matter Pipeline**: Fixed stages (Lead Created → Intake Sent → ... → Completed → Archived). Every matter must have exactly one "Next Action" with due date.

2. **Billing Model**: Invoices created in MatterFlow only, synced to Square. Never create invoices directly in Square.

3. **Time Tracking**: < 2 clicks to start/stop. Entries must be approved before billing. Timer state persists across page navigation.

4. **RBAC**: Clients are read-only. Staff can manage data. Admins can approve invoices and access audit logs.

5. **Audit Logging**: All mutations (matter changes, time entries, invoices) logged to `audit_logs`. AI actions must also be logged when implemented.

## File Naming & Style Conventions

- **Files**: `kebab-case.tsx` / `kebab-case.ts`
- **Components**: `PascalCase` (e.g., `AppShell`, `AuthWidget`)
- **Functions/variables**: `camelCase`
- **Server Actions**: Must be in files with `"use server"` directive at top
- **Formatting**: 2-space indent, Prettier + ESLint (Next.js + Tailwind plugins)

## Environment Variables

Copy `.env.example` to `.env.local` and populate:

- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` (for client-side auth)
- `RESEND_API_KEY` - Email service API key (get from resend.com)
- `RESEND_FROM_EMAIL` - From email address (must be verified domain)
- `CRON_SECRET` - Secret key for securing automation endpoints
- `NEXT_PUBLIC_APP_URL` - App URL for email links
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (from Google Cloud Console)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL (http://localhost:3000/api/auth/google/callback)
- `SQUARE_ACCESS_TOKEN` - Square API access token (from Square Developer Dashboard)
- `SQUARE_ENVIRONMENT` - "sandbox" or "production"
- `SQUARE_LOCATION_ID` - Square location ID
- `SQUARE_WEBHOOK_SIGNATURE_KEY` - Square webhook signature key for verification

**Never commit secrets**. Use `.env.local` for local development.

## Email System

**Transactional emails** are automatically sent for:
- Matter created → Client receives welcome email
- Invoice marked as "sent" → Client receives invoice email with payment link
- Task assigned to client → Client receives task notification

**Email automations** run via cron:
- Intake reminders (24h after matter created in "Intake Sent" stage)
- Client activity reminders (3 days idle)
- Lawyer activity reminders (7 days idle)
- Invoice reminders (3, 7, 14 days overdue)

**Email stack**: Resend for transactional emails, React Email for templates. See `EMAIL_INTEGRATION.md` for full documentation.

**Cron endpoint**: `/api/cron/email-automations` - Call daily via Vercel Cron, GitHub Actions, or external cron service.

## Google Drive Integration

**Document management** via Google Drive API:
- OAuth 2.0 authentication for secure access
- Automatic folder structure: `/Client Name/Matter Name/00 Intake, 01 Source Docs, 02 Work Product, 03 Client Deliverables, 04 Billing & Engagement, 99 Archive`
- Document upload with metadata storage in Supabase
- File versioning and client sharing
- Refresh tokens stored encrypted in profiles table

**OAuth Flow**: `/api/auth/google` → User consent → `/api/auth/google/callback` → Store refresh token

**Key Actions**:
- `initializeMatterFolders(matterId)` - Create folder structure
- `uploadDocument(formData)` - Upload file to Drive + store metadata
- `getMatterDocuments(matterId)` - Fetch all documents for matter
- `shareDocumentWithClient(documentId, email)` - Share with client

**Google Cloud Setup Required**:
1. Enable Google Drive API
2. Create OAuth 2.0 credentials
3. Add redirect URIs to authorized list
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env.local`

See `GOOGLE_DRIVE_INTEGRATION.md` for complete setup guide.

## Square Payment Integration

**Payment processing** via Square Invoices API:
- Automatic invoice syncing when status changes to "sent"
- Payment link generation for client payments
- Webhook-based payment status updates
- No duplicate invoicing (single source of truth in MatterFlow)
- Secure HMAC SHA-256 signature verification

**Invoice Sync Flow**: Invoice marked "sent" → `syncInvoiceToSquare()` → Square creates invoice → Payment link in email → Client pays → Webhook updates status

**Key Actions**:
- `syncInvoiceToSquare(invoiceId)` - Sync MatterFlow invoice to Square
- `getSquarePaymentUrl(invoiceId)` - Get payment link
- `syncSquarePaymentStatus(squareInvoiceId)` - Update from webhook
- Webhook endpoint: `/api/webhooks/square` - Receives payment events

**Status Mapping**:
- Square PAID → MatterFlow "paid"
- Square PARTIALLY_PAID → MatterFlow "partial"
- Square UNPAID/SCHEDULED/PAYMENT_PENDING → MatterFlow "sent"
- Square DRAFT/CANCELED/REFUNDED/FAILED → MatterFlow "draft"

**Square Setup Required**:
1. Create Square account at squareup.com
2. Get access token from Square Developer Dashboard
3. Set up webhook endpoint in Square (use ngrok for local dev)
4. Set `SQUARE_ACCESS_TOKEN`, `SQUARE_ENVIRONMENT`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SIGNATURE_KEY` in `.env.local`

**Important**: Invoice sync happens automatically in `updateInvoiceStatus()` action when status changes to "sent". Errors are logged but don't block invoice email sending.

See `SQUARE_INTEGRATION.md` for complete setup guide and API reference.

## Intake Form System

**Dynamic client intake forms** per matter type:
- Pre-built templates for Contract Review, Employment Agreements, Policy Review
- Flexible field types: text, email, phone, select, multiselect, file uploads, conditional fields
- Built-in validation (required fields, email format, phone format, file size/type)
- Draft saving for client convenience
- Admin review and approval workflow
- Email notifications when forms submitted

**Form Submission Flow**: Client fills form → Save draft (optional) → Submit → Validate → Update matter stage to "Intake Received" → Email lawyer → Lawyer reviews → Approve → Matter stage to "Under Review"

**UI Components**:
- `/intake/[matterId]` - Client form submission page with real-time validation
- `/admin/intake` - Admin dashboard listing all intake responses with status
- `/admin/intake/[intakeId]` - Detailed review page with one-click approval
- `DynamicFormRenderer` - Reusable component supporting all 13 field types

**Key Actions**:
- `getIntakeForm(matterId)` - Get template and existing response
- `saveIntakeFormDraft(matterId, formType, responses)` - Save partial responses
- `submitIntakeForm(matterId, formType, responses)` - Submit with validation
- `approveIntakeForm(intakeResponseId)` - Admin approval
- `getAllIntakeResponses()` - Get all submissions (admin view)

**Templates**: Each matter type can have custom intake forms with:
- Multiple sections with field grouping
- Required/optional fields
- File uploads (integrated with Google Drive)
- Conditional display logic (show fields based on other responses)
- Custom validation rules

**Database**: `intake_responses` table stores:
- `form_type` - Template name
- `responses` - JSONB flexible schema
- `status` - draft | submitted | approved
- `submitted_at` - Timestamp

**Important**: Form validation happens server-side before submission. File uploads integrated with Google Drive automatically.

See `INTAKE_FORMS.md` for complete template creation guide and API reference.

### Intake Automation Flow

**Automatic intake workflow** for solo practitioners:

1. **Matter Creation** → Auto-sets stage to "Intake Sent" when client specified
2. **Client Email** → Automatic email with intake form link
3. **Form Submission** → Auto-advances to "Intake Received", notifies lawyer
4. **Dashboard** → "Needs Review" section shows pending intakes
5. **Approval** → One-click advance to "Under Review"

**Key Features:**
- Auto-save every 30 seconds (prevent data loss)
- Thank you page after submission
- Stage badges with color coding
- Responsibility indicators (client vs lawyer)
- Overdue tracking and alerts

**Important:** Matter creation with client automatically triggers intake flow. To skip intake, create matter without clientId or manually change stage.

## Common Pitfalls

1. **Don't bypass RLS**: Always use authenticated Supabase client or service-role client with proper auth checks.
2. **Don't skip Next Action validation**: Matter creation/updates require `next_action` and `next_action_due_date`.
3. **Don't mutate from client**: All writes go through server actions in `actions.ts`.
4. **Don't forget revalidation**: After mutations, call `revalidatePath()` to update cached pages.
5. **Don't skip audit logs**: All significant mutations should log to `audit_logs` table.
6. **Don't fail on email errors**: Email sending is wrapped in try/catch; primary operations should succeed even if email fails.

## Contribution Workflow (from AGENTS.md)

- Follow **Conventional Commits** (`feat:`, `fix:`, `chore:`)
- PRs should reference PRD section, include test commands, and have screenshots for UI changes
- Keep PRs narrow (one module/feature slice)
- Ensure tests and lint pass before requesting review
