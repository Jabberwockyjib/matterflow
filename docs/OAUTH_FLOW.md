# OAuth Flow - How Users Connect Google Accounts

## Overview

This document explains how end users connect their Google accounts to DealPulse **without needing backend access**.

## Key Concept

**You create ONE set of credentials. ALL users authenticate through YOUR app using THEIR Google accounts.**

---

## The Flow

### 1. Initial Setup (You - One Time)

```
┌─────────────────────────────────────────────────────────┐
│ Google Cloud Console (You)                              │
│                                                          │
│ 1. Create OAuth Client ID                              │
│ 2. Configure Redirect URIs                             │
│ 3. Get Client ID + Client Secret                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Your Backend (.env)                                     │
│                                                          │
│ GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com     │
│ GOOGLE_CLIENT_SECRET=GOCSPX-xyz...                     │
└─────────────────────────────────────────────────────────┘
```

### 2. User Connects Account (Each User)

```
┌─────────────┐
│ User clicks │
│ "Connect    │
│  Google"    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Your Backend                                         │
│ GET /api/oauth/google/init                          │
│                                                      │
│ Creates OAuth URL using YOUR credentials:           │
│ https://accounts.google.com/o/oauth2/v2/auth?       │
│   client_id=YOUR_CLIENT_ID                          │
│   redirect_uri=YOUR_APP/callback                    │
│   scope=drive.readonly,gmail.readonly               │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Google Login Page                                    │
│                                                      │
│ User sees: "DealPulse wants to access your:"        │
│   • Read your Gmail messages                        │
│   • Read your Google Drive files                    │
│                                                      │
│ User logs in with THEIR Google account              │
│ User clicks "Allow"                                  │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Google redirects to:                                 │
│ YOUR_APP/api/oauth/google/callback?code=abc123      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Your Backend                                         │
│ GET /api/oauth/google/callback                      │
│                                                      │
│ 1. Receives authorization code                      │
│ 2. Exchanges code for tokens (using YOUR creds)     │
│ 3. Gets USER's access_token + refresh_token         │
│ 4. Encrypts tokens                                   │
│ 5. Stores in database:                               │
│    user_oauth_connections table                      │
└──────┬──────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ Database (user_oauth_connections)                   │
│                                                      │
│ user_id: user-123                                    │
│ provider: google                                     │
│ provider_user_id: google-user-456                   │
│ email: user@company.com                             │
│ encrypted_access_token: [encrypted]                 │
│ encrypted_refresh_token: [encrypted]                │
│ scopes: drive.readonly,gmail.readonly               │
└─────────────────────────────────────────────────────┘
```

### 3. Using Connected Account (Ongoing)

```
┌─────────────────────────────────────────────────────┐
│ Background Worker                                    │
│                                                      │
│ 1. Fetches user's encrypted tokens from DB          │
│ 2. Decrypts tokens                                   │
│ 3. Uses access_token to call Gmail/Drive API        │
│ 4. If token expired, uses refresh_token              │
│ 5. Updates encrypted tokens in DB                    │
└─────────────────────────────────────────────────────┘
```

---

## Important Points

### ✅ What Users Need

- A Google account
- A web browser
- 2 minutes to click "Connect Google" and authorize

### ❌ What Users DON'T Need

- Backend access
- API keys
- Technical knowledge
- Any configuration

### 🔒 Security

**User tokens are encrypted** before storage:
- Encrypted with `TOKEN_ENCRYPTION_KEY` (AES-256)
- Only your backend can decrypt
- Never exposed to client-side code
- Never logged

---

## Production Checklist

When deploying to production, update these:

### 1. Google Cloud Console

**Authorized Redirect URIs** must include:
```
https://yourdomain.com/api/oauth/google/callback
```

### 2. Environment Variables

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

This is **critical** - it determines the redirect URI.

### 3. OAuth Consent Screen

- Move from "Testing" to "Published"
- Add privacy policy URL
- Add terms of service URL
- May need Google verification for Gmail/Drive scopes (4-6 weeks)

**For beta/MVP**: Keep in Testing mode and manually add beta users as "Test Users"

---

## Testing the Flow Locally

### 1. Set Up Google OAuth

If you haven't already:

1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 Client ID
3. Add redirect URI:
   ```
   http://localhost:3000/api/oauth/google/callback
   ```
4. Copy Client ID and Client Secret

### 2. Update .env

```bash
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Restart App

```bash
docker compose restart app
```

### 4. Test Connection

1. Open http://localhost:3005
2. Log in to DealPulse
3. Go to Settings → Connected Sources
4. Click "Connect Google"
5. You should see Google's consent screen
6. After approving, you should be redirected back with "Connected" status

### 5. Verify in Database

```bash
docker exec mna-db psql -U postgres -d postgres -c "SELECT provider, email, scopes FROM user_oauth_connections;"
```

You should see your connection with encrypted tokens.

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem**: The redirect URI in your request doesn't match what's configured in Google Cloud Console.

**Fix**:
1. Check `NEXT_PUBLIC_APP_URL` in `.env`
2. Ensure redirect URI in Google Console is:
   ```
   http://localhost:3000/api/oauth/google/callback  (for local)
   https://yourdomain.com/api/oauth/google/callback  (for prod)
   ```

### Error: "Access blocked: This app's request is invalid"

**Problem**: OAuth consent screen not configured or app not published.

**Fix**:
1. Complete OAuth consent screen setup
2. Add yourself as a test user (if in Testing mode)
3. Or publish the app (if ready for production)

### Error: "The OAuth client was not found"

**Problem**: Client ID or Client Secret is wrong.

**Fix**:
1. Double-check credentials in `.env`
2. Ensure no extra spaces or quotes
3. Restart app after changes

### User sees "Access denied"

**Problem**: User declined authorization or app needs additional permissions.

**Fix**:
1. Ask user to try again
2. Check that required scopes are enabled in Google Console
3. Verify APIs are enabled (Gmail API, Drive API)

---

## FAQs

**Q: Do I need separate OAuth credentials for each environment?**

A: No, you can use the same credentials and just add multiple redirect URIs:
```
http://localhost:3000/api/oauth/google/callback
https://staging.yourdomain.com/api/oauth/google/callback
https://yourdomain.com/api/oauth/google/callback
```

**Q: How many users can connect their Google accounts?**

A: Unlimited. Your OAuth credentials identify YOUR app, but each user authenticates with their own Google account.

**Q: What if a user changes their Google password?**

A: Their access token may be revoked. The app will try to refresh using the refresh_token. If that fails, they'll need to reconnect.

**Q: Can users revoke access?**

A: Yes, in two ways:
1. In their Google Account settings: https://myaccount.google.com/permissions
2. In DealPulse settings: "Disconnect Google"

**Q: Do tokens expire?**

A: Access tokens expire after 1 hour. Refresh tokens generally don't expire (unless revoked or unused for 6 months). The app automatically refreshes tokens as needed.

---

## Summary

```
YOU → Set up OAuth credentials (once)
        ↓
USERS → Connect their Google accounts (self-service)
        ↓
APP → Stores encrypted tokens per user
        ↓
WORKERS → Use tokens to access each user's data
```

**No backend access needed for users. It's all self-service through the standard OAuth flow.**
