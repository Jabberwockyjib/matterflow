# Gmail + OAuth Setup Guide

MatterFlow now uses Gmail + OAuth to send transactional emails instead of Resend. This uses your existing Google account and requires the same OAuth credentials as the Google Drive integration.

## Prerequisites

- Google Cloud Project (same one used for Google Drive)
- Gmail API enabled
- OAuth 2.0 credentials configured

## Setup Steps

### 1. Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if you haven't already)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Gmail API"
5. Click **Enable**

### 2. Configure OAuth Consent Screen (if not already done)

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for testing) or **Internal** (for Google Workspace)
3. Fill in:
   - App name: **MatterFlow**
   - User support email: Your email
   - Developer contact email: Your email
4. Click **Save and Continue**
5. Add scopes:
   - Click **Add or Remove Scopes**
   - Search for and add:
     - `https://www.googleapis.com/auth/gmail.send` (Send email on your behalf)
     - `https://www.googleapis.com/auth/drive.file` (For Google Drive integration)
   - Click **Update** and **Save and Continue**
6. Add test users (if using External):
   - Add your Gmail address
   - Click **Save and Continue**
7. Review and go back to dashboard

### 3. Create OAuth 2.0 Credentials (if not already done)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: **MatterFlow Local Dev**
5. Authorized redirect URIs:
   - Add `http://localhost:3000/api/auth/google/callback`
   - For production, add your production URL
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

Add to your `.env.local`:

```bash
# Google OAuth (same credentials for Gmail and Drive)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### 5. Connect Google Account in MatterFlow

1. Start your dev server: `pnpm dev`
2. Sign in to MatterFlow as admin
3. Go to **Settings** → **Practice Settings**
4. Scroll to **Google Integration** section
5. Click **Connect Google Account**
6. Authorize MatterFlow to:
   - Send emails on your behalf
   - Access Google Drive
7. Once connected, configure your **Contact Email** (the email address emails will be sent FROM)

### 6. Test Email Sending

1. Go to **Clients** page
2. Click **Invite Client**
3. Fill in client details
4. Click **Send Invitation**
5. Check:
   - Console logs for "Invitation sent successfully"
   - Your Gmail **Sent** folder for the email
   - Test client's inbox for the invitation

## How It Works

### Email Flow

1. **Lawyer invites client** → MatterFlow creates invitation
2. **Fetch practice settings** → Get Google refresh token + contact email
3. **Send via Gmail API** → Uses OAuth to send email as you
4. **Client receives email** → From your configured contact email
5. **Client clicks link** → Redirected to intake form

### OAuth Refresh Tokens

- Stored in `practice_settings.google_refresh_token` (encrypted at rest)
- Automatically refreshed by Google OAuth client
- Used for both Gmail sending and Google Drive access
- Revocable at any time from Google Account settings

## Troubleshooting

### "Gmail not connected" warning in logs

**Cause:** Google account not connected yet
**Fix:** Go to Settings → Practice Settings → Connect Google Account

### "Contact email not configured" warning

**Cause:** No contact email set in practice settings
**Fix:** Go to Settings → Practice Settings → Set Contact Email field

### "Invalid grant" error

**Cause:** Refresh token expired or revoked
**Fix:** Disconnect and reconnect Google account in Settings

### Email not sending (no error)

1. Check Gmail API is enabled in Google Cloud Console
2. Check OAuth scopes include `https://www.googleapis.com/auth/gmail.send`
3. Check refresh token exists: `docker exec supabase_db_therapy psql -U postgres -c "SELECT google_refresh_token IS NOT NULL FROM practice_settings"`
4. Check contact_email is set: `docker exec supabase_db_therapy psql -U postgres -c "SELECT contact_email FROM practice_settings"`

### Email goes to spam

**Causes:**
- Sending from personal Gmail (not a custom domain)
- No SPF/DKIM configured (only for custom domains)
- HTML-only email (our templates are HTML)

**Fixes:**
- Use a Google Workspace account with custom domain
- Configure SPF and DKIM records
- Add plain text fallback to email templates
- For MVP: Accept that some emails may go to spam with personal Gmail

## Comparison with Resend

| Feature | Gmail + OAuth | Resend |
|---------|---------------|--------|
| **Cost** | Free (up to 2000/day for Workspace, 500/day for personal Gmail) | $10/month for 50k emails |
| **Setup** | OAuth configuration required | API key only |
| **From Address** | Your actual email | Any verified domain |
| **Deliverability** | Good (if using Workspace + custom domain) | Excellent (dedicated IPs) |
| **Limits** | 500-2000 emails/day | 50,000+ emails/month |
| **Spam Risk** | Higher with personal Gmail | Lower (transactional service) |
| **Best For** | Solo practitioners, low volume | Growing firms, high volume |

## Reverting to Resend

If you need to switch back to Resend:

1. Install Resend: `pnpm add resend`
2. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=Your Name <you@yourdomain.com>
   ```
3. In `actions.ts`, change:
   ```typescript
   const { sendInvitationEmail } = await import('@/lib/email/client')  // Resend
   // instead of:
   const { sendInvitationEmail } = await import('@/lib/email/gmail-client')  // Gmail
   ```

## Security Notes

- Refresh tokens are stored encrypted in Supabase
- Gmail API uses OAuth 2.0 (no password storage)
- Tokens can be revoked at any time from Google Account
- MatterFlow only requests minimum required scopes
- All email sending is logged in audit_logs table
