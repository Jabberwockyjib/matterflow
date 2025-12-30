# Google Drive Setup Guide

**Quick Start**: Get Google Drive connected to MatterFlow in ~10 minutes

---

## Prerequisites

- Gmail account (personal or workspace)
- MatterFlow running locally (`pnpm dev`)
- Admin access to sign in

---

## Step 1: Create Google Cloud Project (5 minutes)

### 1.1 Go to Google Cloud Console
Visit: https://console.cloud.google.com

### 1.2 Create New Project
1. Click dropdown next to "Google Cloud" logo (top left)
2. Click **"New Project"**
3. Project name: `MatterFlow` (or your preferred name)
4. Location: Keep default
5. Click **"Create"**
6. Wait ~30 seconds for project creation

### 1.3 Select Your Project
- Make sure the new project is selected in the dropdown

---

## Step 2: Enable Google Drive API (2 minutes)

### 2.1 Navigate to APIs
1. Click hamburger menu (☰) → **"APIs & Services"** → **"Library"**
2. Or use direct link: https://console.cloud.google.com/apis/library

### 2.2 Enable Drive API
1. Search for: **"Google Drive API"**
2. Click the "Google Drive API" card
3. Click **"Enable"** button
4. Wait for confirmation (~10 seconds)

---

## Step 3: Create OAuth Credentials (3 minutes)

### 3.1 Configure OAuth Consent Screen

1. Go to: **"APIs & Services"** → **"OAuth consent screen"**
   - Or: https://console.cloud.google.com/apis/credentials/consent

2. User Type:
   - Select **"External"** (allows any Gmail account)
   - Click **"Create"**

3. App Information:
   - App name: `MatterFlow`
   - User support email: **your Gmail address**
   - App logo: (optional, skip for now)
   - Application home page: `http://localhost:3000` (for now)
   - Application privacy policy: (optional, skip for now)
   - Application terms of service: (optional, skip for now)
   - Authorized domains: (leave empty for testing)
   - Developer contact: **your Gmail address**
   - Click **"Save and Continue"**

4. Scopes:
   - Click **"Add or Remove Scopes"**
   - Filter for: `drive`
   - Select:
     - ✅ `.../auth/drive.file` - See, edit, create, and delete only the specific Google Drive files you use with this app
   - Click **"Update"**
   - Click **"Save and Continue"**

5. Test Users:
   - Click **"Add Users"**
   - Enter **your Gmail address**
   - Click **"Add"**
   - Click **"Save and Continue"**

6. Summary:
   - Review and click **"Back to Dashboard"**

### 3.2 Create OAuth Client ID

1. Go to: **"APIs & Services"** → **"Credentials"**
   - Or: https://console.cloud.google.com/apis/credentials

2. Click **"Create Credentials"** → **"OAuth client ID"**

3. Configure:
   - Application type: **"Web application"**
   - Name: `MatterFlow Local Dev`
   - Authorized JavaScript origins:
     - Click **"Add URI"**
     - Enter: `http://localhost:3000`
   - Authorized redirect URIs:
     - Click **"Add URI"**
     - Enter: `http://localhost:3000/api/auth/google/callback`
   - Click **"Create"**

4. Copy Credentials:
   - **Client ID**: Copy to clipboard (looks like: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret**: Copy to clipboard (looks like: `GOCSPX-xxxxx`)
   - Click **"OK"**

---

## Step 4: Configure Environment Variables (1 minute)

### 4.1 Update `.env.local`

Open `/Users/brian/therapy/.env.local` and add these lines:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

**Replace**:
- `your-client-id-here.apps.googleusercontent.com` with your actual Client ID
- `your-client-secret-here` with your actual Client Secret

### 4.2 Restart Dev Server

```bash
# Kill current server (Ctrl+C)
# Restart
pnpm dev
```

---

## Step 5: Connect Google Drive (1 minute)

### 5.1 Sign In to MatterFlow
1. Go to: `http://localhost:3000/auth/sign-in`
2. Sign in as admin:
   - Email: `admin@matterflow.local`
   - Password: `password123`

### 5.2 Navigate to Settings
1. Click **"Settings"** in the sidebar
2. Click **"Integrations"** tab

### 5.3 Connect Google Drive
1. You should see "Google Drive Not Connected" card
2. Click **"Connect Google Drive"** button
3. You'll be redirected to Google OAuth
4. Sign in with **your Gmail account**
5. Click **"Allow"** to grant permissions
6. You'll be redirected back to Settings
7. Should see **"Google Drive Connected"** ✅

---

## Verification

### ✅ Success Checklist:

- [ ] Google Cloud project created
- [ ] Drive API enabled
- [ ] OAuth credentials configured
- [ ] Environment variables set
- [ ] Dev server restarted
- [ ] Connected successfully in UI
- [ ] "Google Drive Connected" shows in Settings

### Expected Result:

```
Settings → Integrations Tab:

┌─────────────────────────────────────┐
│ Google Drive                        │
│                                     │
│ ✓ Google Drive Connected            │
│   Connected Dec 29, 2025            │
│                                     │
│ Features:                           │
│ • Automatic folder structure        │
│ • Document versioning               │
│ • Secure client file sharing        │
└─────────────────────────────────────┘
```

---

## Troubleshooting

### Error: "Invalid redirect URI"
**Fix**: Make sure redirect URI in Google Cloud exactly matches:
```
http://localhost:3000/api/auth/google/callback
```
(no trailing slash, exact match)

### Error: "Access blocked: Authorization Error"
**Fix**:
1. Make sure you added your Gmail as a test user
2. OAuth consent screen is configured
3. Correct scopes are selected (`drive.file`)

### Error: "No refresh token received"
**Fix**:
1. Disconnect Google Drive in your Google Account settings:
   - https://myaccount.google.com/connections
2. Find "MatterFlow" and revoke access
3. Try connecting again (first connection should provide refresh token)

### Still having issues?
Check dev server logs for detailed error messages:
```bash
# Look for errors in terminal running pnpm dev
```

---

## What's Next?

Once connected, you can:

1. **Create a matter** with a client
2. **Initialize matter folders** - Auto-creates folder structure in your Google Drive
3. **Upload documents** - Files stored in Google Drive with metadata in Supabase
4. **Share with clients** - Secure file sharing via Google Drive permissions

---

## Security Notes

- **Refresh tokens** are stored encrypted in Supabase
- **Access tokens** are never stored (regenerated from refresh token)
- App only accesses files **it creates** (due to `drive.file` scope)
- Cannot read your existing Google Drive files
- Revoke access anytime: https://myaccount.google.com/connections

---

*Setup time: ~10 minutes*
*Last updated: 2025-12-29*
