# Google Drive Integration Guide

Complete Google Drive integration for MatterFlow document management.

## Overview

The Google Drive integration provides:

1. **OAuth 2.0 Authentication** - Secure user authorization
2. **Automatic Folder Structure** - Organized by client and matter
3. **Document Upload** - Direct upload to Google Drive with metadata storage
4. **Version Control** - Automatic file versioning
5. **Client Sharing** - Secure document sharing with clients
6. **Metadata Storage** - Document tracking in Supabase

## Folder Structure

When a matter folder is initialized, the following structure is automatically created in Google Drive:

```
/Client Name/
  /Matter Name/
    /00 Intake/
    /01 Source Docs/
    /02 Work Product/
    /03 Client Deliverables/
    /04 Billing & Engagement/
    /99 Archive/
```

This structure follows the PRD requirements for document organization.

## Quick Start

### 1. Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Drive API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "MatterFlow"
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (development)
     - `https://yourapp.com/api/auth/google/callback` (production)
   - Click "Create"
   - Copy Client ID and Client Secret

5. Configure OAuth Consent Screen:
   - Go to "OAuth consent screen"
   - User Type: "Internal" (for testing) or "External" (for production)
   - App name: "MatterFlow"
   - User support email: your email
   - Scopes:
     - `/auth/drive.file` - Create and access files created by app
     - `/auth/drive.appdata` - App-specific data
   - Save and continue

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# For production, update GOOGLE_REDIRECT_URI
# GOOGLE_REDIRECT_URI=https://yourapp.com/api/auth/google/callback
```

### 3. Run Database Migration

Apply the Google Drive integration migration:

```bash
supabase migration up
# Or if using local Supabase:
supabase db push
```

This adds:
- `google_refresh_token` column to `profiles`
- `google_connected_at` timestamp
- `matter_folders` table for folder metadata
- RLS policies for folder access

### 4. Connect Google Drive

1. Start the dev server: `pnpm dev`
2. Navigate to `/documents`
3. Click "Connect Google Drive"
4. Authorize the app in Google OAuth consent screen
5. You'll be redirected back with connection confirmed

## Using the Integration

### Connect User's Google Drive

```typescript
// Users connect via UI button or programmatically
window.location.href = "/api/auth/google?returnUrl=/documents";
```

### Initialize Matter Folders

```typescript
import { initializeMatterFolders } from "@/lib/google-drive/actions";

const result = await initializeMatterFolders(matterId);

if (result.ok) {
  console.log("Folders created:", result.data);
} else {
  console.error("Error:", result.error);
}
```

### Upload Document

```typescript
import { uploadDocument } from "@/lib/google-drive/actions";

const formData = new FormData();
formData.append("file", file); // File object
formData.append("matterId", "matter-id");
formData.append("folderType", "01 Source Docs");
formData.append("description", "Optional description");

const result = await uploadDocument(formData);

if (result.ok) {
  console.log("Uploaded:", result.data);
}
```

### Get Matter Documents

```typescript
import { getMatterDocuments } from "@/lib/google-drive/actions";

const { data, error } = await getMatterDocuments(matterId);

if (data) {
  data.forEach((doc) => {
    console.log(doc.title, doc.folderPath, doc.webViewLink);
  });
}
```

### Share Document with Client

```typescript
import { shareDocumentWithClient } from "@/lib/google-drive/actions";

const result = await shareDocumentWithClient(
  documentId,
  "client@example.com"
);
```

## Architecture

### File Structure

```
src/lib/google-drive/
├── client.ts          # OAuth client and Drive API setup
├── types.ts           # TypeScript interfaces
├── folders.ts         # Folder creation and management
├── documents.ts       # Document upload/download/share
├── actions.ts         # Server actions (Supabase integration)
└── index.ts           # Public exports

src/app/api/auth/google/
├── route.ts           # Initiate OAuth flow
└── callback/
    └── route.ts       # Handle OAuth callback

src/components/
├── google-drive-connect.tsx   # Connection UI
└── document-upload.tsx        # Upload component

supabase/migrations/
└── 0002_google_drive_integration.sql
```

### Data Flow

```
User uploads file
  ↓
uploadDocument action (actions.ts)
  ↓
Get user's refresh token from Supabase
  ↓
uploadFileToDrive (documents.ts)
  ↓
Google Drive API (googleapis)
  ↓
Store metadata in Supabase (documents table)
  ↓
Revalidate paths
```

### Token Management

- **Refresh Token**: Stored encrypted in `profiles.google_refresh_token`
- **Access Token**: Generated on-demand from refresh token
- **Expiry**: Access tokens auto-refresh using googleapis library
- **Security**: Tokens never exposed to client, server-only operations

## API Reference

### OAuth Functions

#### `getAuthUrl(state?: string): string`

Generate OAuth consent screen URL.

```typescript
const authUrl = getAuthUrl("return-url-data");
// Redirect user to authUrl
```

#### `getTokensFromCode(code: string): Promise<Credentials>`

Exchange authorization code for tokens.

```typescript
const tokens = await getTokensFromCode(code);
// tokens.refresh_token, tokens.access_token
```

#### `refreshAccessToken(refreshToken: string): Promise<string>`

Get new access token from refresh token.

```typescript
const accessToken = await refreshAccessToken(refreshToken);
```

### Folder Management

#### `createMatterFolders(refreshToken, clientName, matterTitle): Promise<MatterFolderStructure>`

Create complete folder structure for a matter.

```typescript
const folders = await createMatterFolders(
  refreshToken,
  "Jane Doe",
  "Estate Planning"
);

// folders.clientFolder.id
// folders.matterFolder.id
// folders.subfolders["00 Intake"].id
```

#### `getMatterFolders(refreshToken, clientName, matterTitle): Promise<MatterFolderStructure | null>`

Get existing folder structure (doesn't create).

```typescript
const folders = await getMatterFolders(refreshToken, "Jane Doe", "Estate Planning");
```

#### `listFilesInFolder(refreshToken, folderId): Promise<Array<File>>`

List all files in a specific folder.

```typescript
const files = await listFilesInFolder(refreshToken, folderId);
files.forEach((file) => console.log(file.name, file.size));
```

### Document Operations

#### `uploadFileToDrive(refreshToken, file, folderId, description?): Promise<DriveUploadResult>`

Upload file to specific folder.

```typescript
const result = await uploadFileToDrive(
  refreshToken,
  {
    name: "contract.pdf",
    mimeType: "application/pdf",
    buffer: fileBuffer,
  },
  folderId,
  "Client contract"
);

if (result.success) {
  console.log("File ID:", result.fileId);
  console.log("View link:", result.webViewLink);
}
```

#### `deleteFileFromDrive(refreshToken, fileId): Promise<Result>`

Delete file from Drive.

```typescript
const result = await deleteFileFromDrive(refreshToken, fileId);
```

#### `createFileVersion(refreshToken, originalFileId, newFile): Promise<DriveUploadResult>`

Upload new version of existing file.

```typescript
const result = await createFileVersion(refreshToken, fileId, {
  buffer: newBuffer,
  mimeType: "application/pdf",
});
```

#### `shareFileWithEmail(refreshToken, fileId, email, role?): Promise<Result>`

Share file with specific email address.

```typescript
await shareFileWithEmail(refreshToken, fileId, "client@example.com", "reader");
```

### Server Actions (Supabase Integrated)

#### `initializeMatterFolders(matterId): Promise<ActionResult>`

Create folders for a matter (requires authenticated user).

#### `uploadDocument(formData): Promise<ActionResult>`

Upload document and store metadata.

#### `getMatterDocuments(matterId): Promise<{ data?, error? }>`

Get all documents for a matter.

#### `deleteDocument(documentId): Promise<ActionResult>`

Delete document from Drive and database.

#### `shareDocumentWithClient(documentId, clientEmail): Promise<ActionResult>`

Share document with client via email.

## UI Components

### GoogleDriveConnect

Connection status and authentication button.

```tsx
import { GoogleDriveConnect } from "@/components/google-drive-connect";

<GoogleDriveConnect
  isConnected={Boolean(user.googleRefreshToken)}
  connectedAt={user.googleConnectedAt}
  returnUrl="/matters/123"
/>
```

**Props**:
- `isConnected?: boolean` - Whether user has connected Drive
- `connectedAt?: string` - ISO timestamp of connection
- `returnUrl?: string` - URL to redirect after OAuth (default: "/")

### DocumentUpload

File upload component for matter folders.

```tsx
import { DocumentUpload } from "@/components/document-upload";

<DocumentUpload
  matterId="matter-123"
  folderType="01 Source Docs"
  onUploadComplete={() => console.log("Done!")}
/>
```

**Props**:
- `matterId: string` - Matter ID
- `folderType: FolderType` - Destination folder
- `onUploadComplete?: () => void` - Callback after successful upload

## Database Schema

### profiles Table Updates

```sql
ALTER TABLE profiles
ADD COLUMN google_refresh_token TEXT,
ADD COLUMN google_connected_at TIMESTAMPTZ;
```

### matter_folders Table

```sql
CREATE TABLE matter_folders (
  id UUID PRIMARY KEY,
  matter_id UUID REFERENCES matters(id),
  client_folder_id TEXT NOT NULL,
  matter_folder_id TEXT NOT NULL,
  folder_structure JSONB NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**folder_structure** JSON format:
```json
{
  "00 Intake": { "id": "drive-folder-id", "name": "00 Intake", "path": "00 Intake" },
  "01 Source Docs": { "id": "...", "name": "...", "path": "..." },
  ...
}
```

### documents Table Updates

```sql
ALTER TABLE documents
ADD COLUMN mime_type TEXT,
ADD COLUMN file_size BIGINT,
ADD COLUMN web_view_link TEXT;
```

## Security

### OAuth Scopes

The integration requests minimal scopes:
- `https://www.googleapis.com/auth/drive.file` - Only files created by the app
- `https://www.googleapis.com/auth/drive.appdata` - App-specific data

**Does NOT request**:
- Full Drive access
- Ability to read user's existing files
- Ability to delete files not created by app

### Token Storage

- **Refresh tokens**: Stored encrypted in Supabase (server-side only)
- **Access tokens**: Never stored, generated on-demand
- **RLS**: Row-level security ensures users only access their own tokens

### File Permissions

- Files created in user's Drive
- User maintains ownership
- App can only access files it created
- Client sharing requires explicit action

## Troubleshooting

### "Google Drive not connected" Error

**Cause**: User hasn't authorized the app or refresh token missing.

**Fix**:
1. Navigate to `/documents`
2. Click "Connect Google Drive"
3. Complete OAuth flow

### "No refresh token received" Error

**Cause**: OAuth consent screen didn't force consent.

**Fix**:
1. In `src/lib/google-drive/client.ts`, ensure `prompt: "consent"` in `getAuthUrl()`
2. Disconnect app from Google account settings
3. Reconnect to force consent

### "Failed to create folders" Error

**Cause**: API not enabled or invalid credentials.

**Fix**:
1. Check Google Drive API is enabled in Google Cloud Console
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
3. Check user has refresh token in database

### Upload Fails Silently

**Cause**: File too large or network error.

**Fix**:
1. Check file size (Drive has limits)
2. Check network connection
3. Review server logs for errors
4. Ensure Drive API quota not exceeded

### OAuth Redirect Mismatch

**Cause**: Redirect URI not configured in Google Cloud Console.

**Fix**:
1. Go to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add exact redirect URI: `http://localhost:3000/api/auth/google/callback`
4. For production, add: `https://yourdomain.com/api/auth/google/callback`

## Rate Limits & Quotas

Google Drive API has quotas:
- **Queries per day**: 1,000,000,000
- **Queries per 100 seconds per user**: 1,000
- **Queries per 100 seconds**: 10,000

For most legal practices, these limits are sufficient. Monitor usage in Google Cloud Console.

## Best Practices

1. **Initialize folders on matter creation**: Automate folder setup when matter is created
2. **Validate file types**: Check MIME types before upload to prevent malicious files
3. **Show upload progress**: Use client-side progress indicators for UX
4. **Handle errors gracefully**: Don't fail matter creation if folder creation fails
5. **Store metadata**: Always store document metadata in Supabase for search/filtering
6. **Version carefully**: Use `createFileVersion` to maintain history
7. **Clean up orphans**: Periodically check for orphaned Drive files

## Future Enhancements

- [ ] **AI Classification**: Auto-classify documents by content
- [ ] **OCR**: Extract text from scanned documents
- [ ] **Full-text search**: Search document contents
- [ ] **Bulk upload**: Upload multiple files at once
- [ ] **Drag & drop**: Drag files into browser for upload
- [ ] **Preview**: Show document previews in-app
- [ ] **Download**: Download documents directly from app
- [ ] **Folder templates**: Custom folder structures per matter type

## Testing

### Manual Testing

1. **Connect Drive**:
   ```bash
   pnpm dev
   # Navigate to /documents
   # Click "Connect Google Drive"
   # Verify redirect and callback work
   ```

2. **Create Folders**:
   ```bash
   # Use initializeMatterFolders action
   # Check folders created in Google Drive
   ```

3. **Upload Document**:
   ```bash
   # Upload file via UI
   # Verify file appears in Drive
   # Verify metadata in Supabase
   ```

### Automated Testing

Create test script:

```typescript
// scripts/test-drive.ts
import { createMatterFolders } from "@/lib/google-drive/folders";

const refreshToken = process.env.TEST_REFRESH_TOKEN!;

const folders = await createMatterFolders(
  refreshToken,
  "Test Client",
  "Test Matter"
);

console.log("Folders created:", folders);
```

Run:
```bash
tsx scripts/test-drive.ts
```

## Support Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

## Next Steps

1. ✅ Set up Google Cloud project
2. ✅ Configure OAuth credentials
3. ✅ Add environment variables
4. ✅ Run database migration
5. ✅ Connect Google Drive in app
6. ✅ Initialize folders for a test matter
7. ✅ Upload a test document
8. [ ] Implement AI classification (future)
9. [ ] Build document preview (future)
10. [ ] Add bulk upload (future)
