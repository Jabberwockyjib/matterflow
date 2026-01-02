# MatterFlow Setup Guide

Complete step-by-step instructions to get MatterFlow up and running.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Supabase Setup](#supabase-setup)
4. [Email Setup (Resend)](#email-setup-resend)
5. [Google Drive Setup](#google-drive-setup)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup](#database-setup)
8. [Running the Application](#running-the-application)
9. [First-Time User Setup](#first-time-user-setup)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- [ ] **Node.js 18+** installed ([download](https://nodejs.org))
- [ ] **pnpm** installed (run `npm install -g pnpm`)
- [ ] **Git** installed ([download](https://git-scm.com))
- [ ] **Supabase CLI** installed (run `npm install -g supabase`)
- [ ] A **Gmail account** (for email sending and Google Drive)
- [ ] A **credit card** (for Google Cloud - won't be charged unless you exceed free tier)

---

## Installation

### 1. Clone or Download the Repository

```bash
git clone <repository-url>
cd therapy
```

Or download and extract the ZIP file.

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages (~5 minutes).

---

## Supabase Setup

Supabase is your database and authentication system.

### Option A: Use Supabase Cloud (Recommended)

#### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email

#### 2. Create a New Project

1. Click "New Project"
2. **Organization**: Create a new organization (e.g., "MatterFlow")
3. **Name**: "MatterFlow Production"
4. **Database Password**: Generate a strong password (save it!)
5. **Region**: Choose closest to you
6. **Pricing Plan**: Free (sufficient for MVP)
7. Click "Create new project"

⏱️ Project creation takes ~2 minutes.

#### 3. Get Your API Keys

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ Keep this secret!)

### Option B: Use Local Supabase with Traefik (Recommended for Development)

This project uses a Traefik-based development infrastructure that provides zero-port-collision workflow with hostname-based routing.

#### Prerequisites

1. **Docker Desktop** running
2. **Traefik** running on `traefik_net` network (see infrastructure docs)
3. **Hostnames** in `/etc/hosts`:
   ```
   127.0.0.1 matterflow.local api.matterflow.local studio.matterflow.local mail.matterflow.local
   ```

#### Start the Stack

```bash
# Start all Supabase services
docker compose --env-file docker/.env up -d

# Apply database migrations
for f in supabase/migrations/*.sql; do
  docker exec -i matterflow-db psql -U postgres -d postgres < "$f"
done

# Apply seed data (optional)
docker exec -i matterflow-db psql -U postgres -d postgres < supabase/seed.sql
```

#### Access Points

| Service | URL |
|---------|-----|
| Next.js App | http://matterflow.local |
| Supabase API | http://api.matterflow.local |
| Supabase Studio | http://studio.matterflow.local |
| Mailpit (email) | http://mail.matterflow.local |

#### Stop the Stack

```bash
docker compose down
```

#### Using supabase CLI (Alternative)

If you prefer the standard Supabase CLI:
```bash
supabase start
```

Note: This exposes services on localhost ports instead of Traefik hostnames.

---

## Email Setup (Resend)

Resend sends transactional emails (invoices, notifications, reminders).

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click "Get Started"
3. Sign up with email or GitHub

### 2. Verify Your Domain (Option 1: Recommended)

To send emails from your domain (e.g., `noreply@yourdomain.com`):

1. In Resend dashboard, click **Domains** → **Add Domain**
2. Enter your domain (e.g., `yourdomain.com`)
3. Copy the DNS records shown
4. Add DNS records to your domain provider (GoDaddy, Namecheap, etc.):
   - **Type**: TXT, MX, CNAME (as shown)
   - **Host**: As shown in Resend
   - **Value**: As shown in Resend
5. Click "Verify Domain" in Resend (may take 5-30 minutes)

**DNS Providers Quick Links**:
- [GoDaddy DNS Setup](https://www.godaddy.com/help/manage-dns-records-680)
- [Namecheap DNS Setup](https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-mx-records-required-for-mail-service/)
- [Cloudflare DNS Setup](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)

### 2. OR Use Resend Test Domain (Option 2: For Testing)

Skip domain verification and use `onboarding@resend.dev` for testing.

**Limitations**:
- Can only send to your verified email
- "via resend.dev" in from address
- OK for development, not for production

### 3. Get API Key

1. In Resend dashboard, click **API Keys** → **Create API Key**
2. **Name**: "MatterFlow Production"
3. **Permission**: Full Access
4. Click "Add"
5. **⚠️ Copy the API key immediately** (you can't see it again!)

Format: `re_abc123xyz...`

---

## Google Drive Setup

Google Drive stores and organizes all client documents.

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Sign in with your Google account
3. Click **Select a project** → **New Project**
4. **Project Name**: "MatterFlow"
5. Click "Create"

### 2. Enable Google Drive API

1. In Cloud Console, select your "MatterFlow" project
2. Click **☰ Menu** → **APIs & Services** → **Library**
3. Search for "**Google Drive API**"
4. Click on it → Click "**Enable**"

⏱️ Takes ~30 seconds to enable.

### 3. Create OAuth 2.0 Credentials

#### Configure OAuth Consent Screen (One-time)

1. Click **☰ Menu** → **APIs & Services** → **OAuth consent screen**
2. **User Type**:
   - Select "**Internal**" if you have a Google Workspace (only your organization can use it)
   - Select "**External**" if using personal Gmail (anyone can use it)
3. Click "Create"
4. Fill out the form:
   - **App name**: "MatterFlow"
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Search and add: `https://www.googleapis.com/auth/drive.file`
   - Search and add: `https://www.googleapis.com/auth/drive.appdata`
7. Click "Save and Continue"
8. **Test users** (if External): Add your email address
9. Click "Save and Continue" → "Back to Dashboard"

#### Create OAuth Client ID

1. Click **☰ Menu** → **APIs & Services** → **Credentials**
2. Click "**+ Create Credentials**" → "**OAuth client ID**"
3. **Application type**: "Web application"
4. **Name**: "MatterFlow Web Client"
5. **Authorized JavaScript origins**:
   - Add: `http://matterflow.local`
   - Add: `https://yourdomain.com` (your production domain)
6. **Authorized redirect URIs**:
   - Add: `http://localhost:54322/auth/v1/callback` (Google OAuth login - local dev)
   - Add: `http://matterflow.local/api/auth/google/callback` (Drive integration)
   - Add: `https://yourdomain.com/auth/v1/callback` (Google OAuth login - production)
   - Add: `https://yourdomain.com/api/auth/google/callback` (Drive integration - production)

   **Note:** Google OAuth requires `localhost` for login callbacks (not `.local` domains). Port 54322 is used for MatterFlow to avoid conflicts with other projects using the standard Supabase port (54321).
7. Click "Create"
8. **⚠️ SAVE THESE**:
   - **Client ID** (looks like `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (looks like `GOCSPX-abc123...`)

---

## Square Payment Setup

Square processes client payments for invoices.

### 1. Create Square Account

1. Go to [squareup.com](https://squareup.com)
2. Click "Get Started"
3. Sign up with email
4. Complete business verification

**Cost**: Free to sign up. Square charges 2.9% + $0.30 per transaction.

### 2. Get API Credentials

#### Access Developer Dashboard

1. Log into [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Click **"+ Create App"**
3. **App Name**: "MatterFlow"
4. Click **"Save"**

#### Get Production Credentials

1. In your app, go to **"Credentials"** tab
2. Copy these values:
   - **Production Access Token** (starts with `EAAA...`)
   - **Production Application ID**

#### Get Location ID

1. In your app, go to **"Locations"** tab
2. Copy your **Location ID** (starts with `L...`)

#### For Testing (Optional - Sandbox Mode)

1. In the **"Credentials"** tab, toggle to **"Sandbox"**
2. Copy **Sandbox Access Token**
3. Use this for testing without real charges

### 3. Set Up Webhook

Square needs to notify MatterFlow when payments are made.

1. In your app, go to **"Webhooks"** tab
2. Click **"+ Add Endpoint"**
3. **Webhook URL**:
   - For testing locally: Use [ngrok](https://ngrok.com) (see note below)
   - For production: `https://yourapp.com/api/webhooks/square`
4. **API Version**: Select latest (e.g., `2024-12-18`)
5. **Event Types**: Select these events:
   - `invoice.published`
   - `invoice.paid`
   - `invoice.payment_made`
   - `invoice.canceled`
   - `invoice.updated`
6. Click **"Save"**
7. **⚠️ Copy the Signature Key** shown (you'll need it for environment variables)

**Testing Locally with ngrok**:
```bash
# Install ngrok (one-time)
npm install -g ngrok

# Start ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL + /api/webhooks/square in Square webhook settings
```

---

## Environment Configuration

### 1. Create Environment File

In the project root, copy the example file:

```bash
cp .env.example .env.local
```

### 2. Fill in Your Credentials

Open `.env.local` in a text editor and fill in the values:

```bash
# ============================================
# SUPABASE (from Step 3 above)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-supabase

# ============================================
# APPLICATION
# ============================================
NEXT_PUBLIC_APP_URL=http://matterflow.local

# ============================================
# EMAIL (RESEND) (from Step 4 above)
# ============================================
RESEND_API_KEY=re_your_api_key_from_resend

# If you verified a domain, use your domain:
RESEND_FROM_EMAIL=MatterFlow <noreply@yourdomain.com>

# If using test domain:
# RESEND_FROM_EMAIL=MatterFlow <onboarding@resend.dev>

# ============================================
# GOOGLE DRIVE (from Step 5 above)
# ============================================
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=http://matterflow.local/api/auth/google/callback

# ============================================
# SQUARE PAYMENTS (from Step 6 above)
# ============================================
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=sandbox  # Change to "production" for live payments
SQUARE_LOCATION_ID=your-square-location-id
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key

# ============================================
# CRON SECURITY (generate random 32+ char string)
# ============================================
CRON_SECRET=your-random-secret-key-min-32-chars

# You can generate a random secret with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Generate CRON_SECRET

In your terminal, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `CRON_SECRET` value.

---

## Database Setup

### 1. Run Migrations

If using **Supabase Cloud**:

```bash
# Link your project (one-time)
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Find your project ref in Supabase dashboard → Settings → General → Reference ID.

If using **Local Supabase**:

```bash
# Already linked when you ran `supabase start`
supabase db push
```

This creates all tables and policies.

### 2. Verify Database

1. Go to Supabase dashboard → **Table Editor**
2. You should see these tables:
   - `profiles`
   - `matters`
   - `tasks`
   - `time_entries`
   - `invoices`
   - `documents`
   - `matter_folders`
   - `audit_logs`
   - `packages`
   - `intake_responses`

---

## Running the Application

### 1. Start Development Server

```bash
pnpm dev
```

You should see:
```
▲ Next.js 16.1.0
- Local:        http://localhost:3001
- Ready in 2.3s
```

Note: The dev script is configured to use port 3001 to avoid conflicts with other projects.

### 2. Open in Browser

Go to: **http://matterflow.local**

The Next.js dev server runs internally on port 3001, but is accessed through Traefik at the hostname. Port 3001 is used to avoid conflicts with other projects that may default to 3000.

---

## First-Time User Setup

### 1. Create Your Account

1. Navigate to http://matterflow.local
2. You'll be redirected to the sign-in page
3. Click **"Sign Up"** (or go to `/auth/sign-in`)
4. Enter your **email** and **password**
5. Click "Sign Up"
6. Check your email for verification link (if required)

### 2. Update Your Profile

After signing in, your profile is automatically created with role "client" by default.

**To make yourself an admin**, you need to update the database:

1. Go to Supabase dashboard → **Table Editor** → **profiles**
2. Find your profile row
3. Click on the **role** field
4. Change from `client` to `admin`
5. Click the checkmark to save

Now refresh the MatterFlow app - you'll have full access!

### 3. Connect Google Drive

1. In MatterFlow, navigate to **Documents** (sidebar)
2. Click "**Connect Google Drive**"
3. You'll be redirected to Google
4. Click "**Allow**" to grant permissions
5. You'll be redirected back to MatterFlow
6. You should see "Google Drive Connected ✓"

### 4. Test Email Sending (Optional)

To test emails are working:

1. Create a test matter with a client
2. Mark an invoice as "sent"
3. Check your Resend dashboard → **Emails**
4. You should see the email listed

**Note**: In development, Resend catches emails and shows them in the dashboard. They won't actually be delivered unless you're in production mode.

### 5. Set Up Cron Job for Email Reminders (Production Only)

Email reminders (intake, activity, invoice) run on a schedule. For production:

**Option 1: Vercel Cron (if deploying to Vercel)**

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

Add `CRON_SECRET` to your Vercel environment variables.

**Option 2: GitHub Actions**

Create `.github/workflows/cron-emails.yml`:

```yaml
name: Email Automations
on:
  schedule:
    - cron: '0 9 * * *'

jobs:
  send-emails:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger automations
        run: |
          curl -X GET ${{ secrets.APP_URL }}/api/cron/email-automations \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Option 3: External Cron Service**

Use [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or similar:

- URL: `https://yourapp.com/api/cron/email-automations`
- Method: GET
- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Daily at 9 AM

---

## Troubleshooting

### "Database error" or "Cannot connect to Supabase"

**Check**:
1. Is `NEXT_PUBLIC_SUPABASE_URL` correct in `.env.local`?
2. Is `NEXT_PUBLIC_SUPABASE_ANON_KEY` correct?
3. Is your Supabase project running? (Check Supabase dashboard)

**Fix**:
- Verify URL starts with `https://` and ends with `.supabase.co`
- Ensure no extra spaces in `.env.local`
- Restart dev server: `Ctrl+C` then `pnpm dev`

### "Email not sending" or "Resend error"

**Check**:
1. Is `RESEND_API_KEY` correct?
2. Is domain verified in Resend? (or using test domain)
3. Is `RESEND_FROM_EMAIL` using verified domain?

**Fix**:
- Log into Resend dashboard → API Keys → verify key is active
- Check Resend dashboard → Emails for error messages
- If using custom domain, ensure DNS records are verified

### "Google Drive not connected" or OAuth error

**Check**:
1. Are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` correct?
2. Is redirect URI in Google Cloud Console exactly: `http://matterflow.local/api/auth/google/callback`?
3. Is Google Drive API enabled?

**Fix**:
- Go to Google Cloud Console → APIs & Services → Credentials
- Check redirect URIs match exactly (no trailing slash!)
- Verify API is enabled: APIs & Services → Library → Search "Drive"

### "Unauthorized" when accessing pages

**Check**:
1. Are you signed in?
2. Is your profile role set to `admin` or `staff` in database?

**Fix**:
- Go to Supabase → Table Editor → profiles
- Find your user and change `role` to `admin`
- Sign out and sign back in

### Port 3001 already in use

**Fix**:
```bash
# Kill process on port 3001 (Mac/Linux)
lsof -ti:3001 | xargs kill -9
```

### "Module not found" errors

**Fix**:
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm dev
```

### Database tables missing after migration

**Fix**:
```bash
# Check migration status
supabase migration list

# Re-run migrations
supabase db reset
supabase db push
```

---

## Next Steps

### ✅ Your app is running! Now:

1. **Create your first matter**:
   - Go to "Matters" → "Create Matter"
   - Fill in client info, matter type, billing model
   - Click "Create"

2. **Initialize Google Drive folders**:
   - Open a matter
   - Call the initialize folders function (or add a button in UI)
   - Check your Google Drive - you'll see the folder structure!

3. **Upload a document**:
   - Use the DocumentUpload component
   - Select folder type (e.g., "01 Source Docs")
   - Upload a file
   - Check Google Drive and Supabase documents table

4. **Test email sending**:
   - Create an invoice
   - Mark it as "sent"
   - Check Resend dashboard for the email

5. **Invite team members** (if using Supabase Auth):
   - Have them sign up at your app URL
   - Update their role in Supabase profiles table

---

## Production Deployment

### Before deploying to production:

1. **Update environment variables**:
   - Change `NEXT_PUBLIC_APP_URL` to your domain
   - Change `GOOGLE_REDIRECT_URI` to production callback URL
   - Update Google Cloud Console redirect URIs

2. **Set up production database**:
   - Use Supabase Cloud (not local)
   - Run migrations: `supabase db push`

3. **Configure email scheduling**:
   - Set up Vercel Cron or GitHub Actions
   - Add `CRON_SECRET` to production environment

4. **Enable production OAuth**:
   - In Google Cloud Console, publish OAuth consent screen
   - Remove "Testing" status if applicable

5. **Test everything**:
   - Create test matter
   - Upload test document
   - Send test email
   - Verify cron job runs

---

## Getting Help

- **Technical issues**: Check `CLAUDE.md` for architecture details
- **Email setup**: See `EMAIL_INTEGRATION.md`
- **Google Drive**: See `GOOGLE_DRIVE_INTEGRATION.md`
- **Database schema**: Check `supabase/migrations/` files

---

## Quick Reference

### Useful Commands

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Check TypeScript
pnpm typecheck

# Lint code
pnpm lint

# Preview email templates
pnpm email

# Docker Compose commands (Traefik workflow)
docker compose --env-file docker/.env up -d    # Start Supabase stack
docker compose down                             # Stop Supabase stack
docker compose logs -f                          # View logs

# Supabase CLI commands (alternative)
supabase start          # Start local Supabase
supabase stop           # Stop local Supabase
supabase db push        # Run migrations
supabase db reset       # Reset database
```

### Important URLs (Traefik Development)

| Service | URL |
|---------|-----|
| MatterFlow App | http://matterflow.local |
| Supabase API | http://api.matterflow.local |
| Supabase Studio | http://studio.matterflow.local |
| Mailpit Email | http://mail.matterflow.local |

### External Services

- **Supabase Cloud**: https://supabase.com
- **Resend**: https://resend.com
- **Google Cloud**: https://console.cloud.google.com
- **Square**: https://developer.squareup.com

---

**🎉 Congratulations!** Your MatterFlow installation is complete and ready to use.
