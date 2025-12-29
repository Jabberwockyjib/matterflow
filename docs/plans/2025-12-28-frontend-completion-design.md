# Frontend Completion Design

**Date:** 2025-12-28
**Status:** Approved
**Goal:** Complete MatterFlow™ MVP frontend with document UI, settings page, intake file uploads, and VSCode-style sidebar navigation

## Overview

This design addresses the remaining frontend gaps to achieve a production-ready MVP:

1. **VSCode-style sidebar navigation** - Unified side menu replacing horizontal nav
2. **Settings page** - Profile settings + practice settings + integrations
3. **Matter detail page** - Tabbed interface with documents, tasks, time entries
4. **Document UI** - File browser, upload, and management integrated with Google Drive
5. **Intake file uploads** - Wire up file upload fields in intake forms
6. **Navigation improvements** - Deep linking, breadcrumbs, and routing throughout

**Success Criteria:** Complete round-trip test flow from matter creation → client intake with files → lawyer review → document management → invoicing → payment.

---

## 1. Architecture & Routing Structure

### New Pages

| Page | Route | Purpose |
|------|-------|---------|
| Settings | `/settings/page.tsx` | Settings hub with tabs (Profile, Practice, Integrations) |
| Matter Detail | `/matters/[matterId]/page.tsx` | Matter detail with tabs (Overview, Documents, Tasks, Time) |
| Invoice Detail | `/billing/[invoiceId]/page.tsx` | Invoice detail with payment link |

### Updated Navigation

```typescript
// app-shell.tsx navigation links (will move to sidebar)
const links = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/matters", label: "Matters", icon: "folder" },
  { href: "/tasks", label: "Tasks", icon: "check-square" },
  { href: "/time", label: "Time", icon: "clock" },
  { href: "/billing", label: "Billing", icon: "credit-card" },
  { href: "/documents", label: "Documents", icon: "file-text" },
];

// Admin section (role-gated)
const adminLinks = [
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/intake", label: "Intakes", icon: "clipboard-list" },
];

// Bottom section
const bottomLinks = [
  { href: "/settings", label: "Settings", icon: "settings" },
];
```

### Complete Round-Trip Test Flow

```
1. Admin: /matters → Create matter with client
   ↓
2. System: Email sent to client with /intake/[matterId] link
   ↓
3. Client: /intake/[matterId] → Fill form + upload files → /intake/[matterId]/thank-you
   ↓
4. System: Email sent to lawyer
   ↓
5. Admin: / (dashboard) → "Needs Review" section → /admin/intake/[intakeId] → Approve
   ↓
6. Admin: /matters/[matterId] → Documents tab → View uploaded files
   ↓
7. Admin: /matters/[matterId] → Upload lawyer documents
   ↓
8. Admin: /billing → Create invoice → Mark as "sent"
   ↓
9. System: Email to client with payment link
   ↓
10. Client: Email → Square payment page → Pay
    ↓
11. System: Webhook updates invoice status
    ↓
12. Admin: /billing/[invoiceId] → See "paid" status
```

### Key Integration Points

- Matter detail page needs `matters/[matterId]` dynamic route
- Documents tab integrates existing `/lib/google-drive/` actions
- Invoice detail integrates existing `/lib/square/` payment URLs
- File uploads in intake call existing `uploadDocument` action

---

## 2. VSCode-Style Sidebar Navigation

### Layout Structure

Replace horizontal header nav with vertical sidebar + top bar:

```
┌─────────────┬──────────────────────────────┐
│   SIDEBAR   │       TOP BAR                │
│             ├──────────────────────────────┤
│ 📊 Dashboard│                              │
│ 📁 Matters  │                              │
│ ✓ Tasks     │      MAIN CONTENT            │
│ ⏱ Time      │                              │
│ 💳 Billing  │                              │
│ 📄 Documents│                              │
│             │                              │
│ --- ADMIN ---                              │
│ 👥 Users    │                              │
│ 📋 Intakes  │                              │
│             │                              │
│ ⚙️ Settings │                              │
│ 👤 Profile  │                              │
└─────────────┴──────────────────────────────┘
```

### Sidebar Features

**Width States:**
- Expanded: 240px (icon + label)
- Collapsed: 64px (icon only)
- Toggle button at bottom (⟨⟩ icon)
- State persists in localStorage

**Sections:**

1. **Primary Navigation:**
   - Dashboard (home icon)
   - Matters (folder icon)
   - Tasks (check-square icon)
   - Time (clock icon)
   - Billing (credit-card icon)
   - Documents (file-text icon)

2. **Admin Section** (visible to admin/staff only):
   - Divider line with "ADMIN" label
   - Users (users icon)
   - Intakes (clipboard-list icon)

3. **Bottom Section:**
   - Settings (settings icon)
   - User profile card (avatar + name + role)
   - Collapse/expand toggle

**Visual States:**
- Active route: blue left border (4px) + blue background (slate-100)
- Hover: light gray background (slate-50)
- Icons: Lucide React icons for consistency

**Top Bar** (simplified):
- Logo + "MatterFlow" on left
- Breadcrumbs in center (new component)
- Timer display (when re-enabled) + notifications on right
- No navigation links (moved to sidebar)

**Mobile Behavior:**
- Sidebar hidden by default on mobile (<768px)
- Hamburger menu icon in top bar
- Sidebar overlays content when open (shadcn Sheet component)
- Backdrop click to close

### Implementation Details

**Component Structure:**
```typescript
// New component: src/components/sidebar.tsx
export function Sidebar({ role, profileName, email }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  // Save to localStorage on change
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  return (
    <aside className={cn("sidebar", collapsed && "collapsed")}>
      {/* Navigation items */}
    </aside>
  );
}
```

**AppShell Updates:**
```typescript
// src/components/app-shell.tsx
export function AppShell({ children, profileName, role, email, matters = [] }: AppShellProps) {
  return (
    <div className="flex h-screen">
      <Sidebar role={role} profileName={profileName} email={email} />
      <div className="flex-1 flex flex-col">
        <TopBar matters={matters} />
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**CSS Grid:**
```css
.app-layout {
  display: grid;
  grid-template-columns: auto 1fr; /* Sidebar auto-sizes, content fills */
  height: 100vh;
}
```

---

## 3. Settings Page Design

### Page Structure

**Route:** `/settings/page.tsx`
**Layout:** Tab-based navigation with three tabs

### Tab 1: Profile Settings

**Available to:** All users

**Fields:**
- Display name (text input)
- Email (read-only, from auth)
- Current password (password input, required for changes)
- New password (password input, optional)
- Confirm new password (password input, optional)

**Email Preferences:**
- Intake notifications (checkbox, default: true)
- Invoice reminders (checkbox, default: true)
- Activity alerts (checkbox, default: true)
- Weekly summary email (checkbox, default: false)

**Actions:**
- Save button (validates password match if changing)
- Uses existing `updateProfile` action from `actions.ts`
- Success toast: "Profile updated successfully"

### Tab 2: Practice Settings

**Available to:** Admin only

**Firm Information:**
- Firm name (text input)
- Contact email (email input)
- Phone number (tel input)
- Address (textarea)

**Billing Defaults:**
- Default hourly rate (number input, currency formatted)
- Payment terms (select: 15/30/45/60 days)
- Late fee percentage (number input, 0-10%)
- Auto-reminders enabled (checkbox)

**Matter Types:**
- List of active matter types (Contract Review, Employment Agreement, etc.)
- Add/remove custom matter types
- Reorder matter types (drag handles)

**Actions:**
- Save button per section
- Uses new `updatePracticeSettings` action
- Success toast: "Practice settings updated"

### Tab 3: Integrations

**Available to:** Admin only

**Display Format:** Read-only status cards with action buttons

**Google Drive:**
- Status: Connected ✓ / Not Connected
- Connected account email
- Connected at timestamp
- Actions: Reconnect, Disconnect
- Reuses `GoogleDriveConnect` component

**Square Payments:**
- Status: Connected ✓ / Not Connected
- Environment: Sandbox / Production
- Location ID (masked)
- Actions: Reconnect (if needed), Test webhook
- Read from env vars, no OAuth needed

**Resend Email:**
- Status: Configured ✓ / Not Configured
- Sender email (from env var)
- Actions: None (configured via env vars)
- Display "Contact admin to change" message

**Future Integrations:**
- Placeholder cards for: Clio, MyCase, QuickBooks
- "Coming soon" badges

### Data Model

**New Migration Required:**

```sql
-- Migration: 0007_practice_settings.sql
CREATE TABLE practice_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL DEFAULT 'My Law Firm',
  contact_email text,
  contact_phone text,
  address text,
  default_hourly_rate numeric(10,2),
  payment_terms_days integer DEFAULT 30,
  late_fee_percentage numeric(5,2) DEFAULT 0,
  auto_reminders_enabled boolean DEFAULT true,
  matter_types jsonb DEFAULT '["Contract Review", "Employment Agreement", "Policy Review", "Litigation"]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX idx_practice_settings_singleton ON practice_settings ((true));

-- Insert default row
INSERT INTO practice_settings (firm_name) VALUES ('My Law Firm');

-- Enable RLS
ALTER TABLE practice_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read/update
CREATE POLICY "Admin can manage practice settings"
  ON practice_settings
  FOR ALL
  USING (current_user_role() = 'admin');

-- Staff/client can read
CREATE POLICY "Staff and client can read practice settings"
  ON practice_settings
  FOR SELECT
  USING (current_user_role() IN ('staff', 'client'));
```

**New Server Actions:**

```typescript
// src/lib/data/actions.ts

export async function getPracticeSettings(): Promise<PracticeSettings | null> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('practice_settings')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching practice settings:', error);
    return null;
  }
  return data;
}

export async function updatePracticeSettings(
  settings: Partial<PracticeSettings>
): Promise<ActionResult> {
  const supabase = supabaseAdmin();
  const session = await getSession();

  // Ensure admin
  const role = await ensureStaffOrAdmin();
  if (role !== 'admin') {
    return { success: false, error: 'Only admins can update practice settings' };
  }

  const { error } = await supabase
    .from('practice_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', (await getPracticeSettings())?.id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAction({
    action_type: 'update_practice_settings',
    performed_by: session.user.id,
    metadata: settings,
  });

  revalidatePath('/settings');
  return { success: true };
}
```

### UI Implementation

**Component Structure:**
```typescript
// src/app/settings/page.tsx
export default async function SettingsPage() {
  const { session, profile } = await getSessionWithProfile();
  const practiceSettings = await getPracticeSettings();

  return (
    <div className="container py-8">
      <h1>Settings</h1>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {profile.role === 'admin' && (
            <>
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettingsForm profile={profile} />
        </TabsContent>

        <TabsContent value="practice">
          <PracticeSettingsForm settings={practiceSettings} />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsPanel profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 4. Matter Detail Page with Documents

### Page Structure

**Route:** `/matters/[matterId]/page.tsx`
**Layout:** Tabbed interface with four tabs

### Tab Navigation

Use URL search params for tab state:
- `/matters/[matterId]` → defaults to overview
- `/matters/[matterId]?tab=overview`
- `/matters/[matterId]?tab=documents`
- `/matters/[matterId]?tab=tasks`
- `/matters/[matterId]?tab=time`

```typescript
const searchParams = useSearchParams();
const activeTab = searchParams.get('tab') || 'overview';
```

### Tab 1: Overview

**Content:**
- Matter header (title, client name, matter type, stage badge)
- Next action card (bold, prominent)
- Key details grid (created date, responsible party, stage, etc.)
- Recent activity timeline (last 5 actions from audit_logs)
- Quick actions: Edit matter, Change stage, Archive

### Tab 2: Documents

**Primary Focus:** File browser with Google Drive integration

**Folder Tree:**
```
📁 [Client Name] / [Matter Name]
  📁 00 Intake
  📁 01 Source Documents
  📁 02 Work Product
  📁 03 Client Deliverables
  📁 04 Billing & Engagement
  📁 99 Archive
```

**Document List (per selected folder):**

Table columns:
- Icon (file type icon)
- Name (clickable to preview in Google Drive)
- Type (PDF, DOCX, etc.)
- Size (formatted: 1.2 MB)
- Uploaded By (user name)
- Date (formatted: Dec 28, 2025)
- Actions (dropdown menu)

Actions dropdown:
- Download (opens Google Drive download link)
- Share with client (email input modal)
- Move to folder (select folder dropdown)
- Delete (confirmation dialog)

**Upload Component:**

Drag-and-drop zone:
```
┌─────────────────────────────────────┐
│  📤 Drag files here or click to     │
│      browse                         │
│                                     │
│  [Select Folder: 01 Source Documents ▼] │
└─────────────────────────────────────┘
```

Features:
- Multi-file selection
- Progress bar during upload
- Success/error toasts per file
- Auto-refresh document list after upload

**Empty States:**
- No documents in folder: "No documents in this folder. Drag & drop or click to upload."
- Google Drive not connected: "Connect Google Drive in Settings to enable document management."

**Implementation:**

```typescript
// src/app/matters/[matterId]/page.tsx
export default async function MatterDetailPage({ params }: { params: { matterId: string } }) {
  const matter = await getMatterById(params.matterId);
  const documents = await getMatterDocuments(params.matterId);
  const tasks = await getTasksByMatter(params.matterId);
  const timeEntries = await getTimeEntriesByMatter(params.matterId);

  return (
    <div className="container py-8">
      <MatterHeader matter={matter} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="time">
            Time ({timeEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentBrowser
            matterId={params.matterId}
            documents={documents}
            matter={matter}
          />
        </TabsContent>

        {/* Other tabs */}
      </Tabs>
    </div>
  );
}
```

**Document Browser Component:**

```typescript
// src/components/document-browser.tsx
export function DocumentBrowser({ matterId, documents, matter }: Props) {
  const [selectedFolder, setSelectedFolder] = useState('01 Source Documents');
  const [isUploading, setIsUploading] = useState(false);

  const foldersDocuments = documents.filter(d =>
    d.google_drive_path?.includes(`/${selectedFolder}`)
  );

  return (
    <div className="grid grid-cols-[240px_1fr] gap-6">
      {/* Folder tree */}
      <FolderTree
        selectedFolder={selectedFolder}
        onSelectFolder={setSelectedFolder}
        documentCounts={getDocumentCountsByFolder(documents)}
      />

      {/* Document list + upload */}
      <div className="space-y-4">
        <DocumentUpload
          matterId={matterId}
          targetFolder={selectedFolder}
          onUploadComplete={refreshDocuments}
        />

        <DocumentTable
          documents={foldersDocuments}
          onDelete={handleDelete}
          onShare={handleShare}
        />
      </div>
    </div>
  );
}
```

### Tab 3: Tasks

**Content:**
- Task list for this matter (filtered from tasks table)
- Add new task form (inline or modal)
- Task status toggles
- Link to full task detail (future)

### Tab 4: Time

**Content:**
- Time entries for this matter (filtered from time_entries table)
- Total time summary
- Quick time entry form
- Link to create invoice from time entries (future)

---

## 5. Document Integration with Google Drive

### Existing Backend (Already Built)

**Actions Available:**
- `initializeMatterFolders(matterId)` - Create folder structure
- `uploadDocument(formData)` - Upload file to Drive
- `getMatterDocuments(matterId)` - Fetch all documents
- `shareDocumentWithClient(documentId, email)` - Share with client
- Token refresh handled automatically

**Database Schema:**
```sql
-- documents table (already exists)
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES matters(id) ON DELETE CASCADE,
  intake_response_id uuid REFERENCES intake_responses(id),
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  google_drive_file_id text,
  google_drive_path text,
  uploaded_by uuid REFERENCES profiles(user_id),
  uploaded_at timestamptz DEFAULT now()
);
```

### Frontend Implementation

**Upload Flow:**

1. User selects files via drag-and-drop or file input
2. Validate file types and sizes client-side
3. Show progress modal "Uploading documents..."
4. Create FormData with files + metadata
5. POST to `/api/documents/upload` (new route handler)
6. Server action:
   - Uploads to Google Drive
   - Creates document records
   - Returns success/error
7. Refresh document list
8. Show success toast

**New API Route:**

```typescript
// src/app/api/documents/upload/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const matterId = formData.get('matterId') as string;
  const targetFolder = formData.get('targetFolder') as string;
  const files = formData.getAll('files') as File[];

  const results = [];
  for (const file of files) {
    const result = await uploadDocument({
      file,
      matterId,
      targetFolder,
    });
    results.push(result);
  }

  return Response.json({ results });
}
```

### Documents Overview Page Update

**Current:** `/documents/page.tsx` only shows connection status

**Updated Design:**

1. **Connection status card** (keep existing)
2. **Recent documents across all matters:**
   - Table: Name, Matter, Folder, Uploaded By, Date
   - Last 20 documents sorted by uploaded_at DESC
   - Click document → Opens Google Drive preview
   - Click matter → Navigate to `/matters/[matterId]?tab=documents`
3. **Search/filter:**
   - Search by filename
   - Filter by matter (dropdown)
   - Filter by folder (dropdown)
   - Filter by date range

---

## 6. Intake File Upload Integration

### Current State

Intake forms have `type: "file"` fields but they render as disabled inputs.

**Example field definition:**
```typescript
{
  id: "contract_upload",
  label: "Upload Contract",
  type: "file",
  required: true,
  validation: {
    allowedTypes: [".pdf", ".docx"],
    maxFileSize: 10485760, // 10MB
    maxFiles: 3
  }
}
```

### File Upload Integration

**Update DynamicFormRenderer:**

```typescript
// src/lib/intake/dynamic-form-renderer.tsx

// Add file state
const [files, setFiles] = useState<Record<string, File[]>>({});

// Render file input
if (field.type === "file") {
  return (
    <div key={field.id} className="space-y-2">
      <Label htmlFor={field.id}>
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </Label>

      <Input
        id={field.id}
        type="file"
        accept={field.validation?.allowedTypes?.join(",")}
        multiple={field.validation?.maxFiles > 1}
        onChange={(e) => handleFileChange(field.id, e.target.files)}
      />

      <p className="text-xs text-slate-500">
        Allowed types: {field.validation?.allowedTypes?.join(", ")}
        {" • "}
        Max size: {formatBytes(field.validation?.maxFileSize || 10485760)}
        {field.validation?.maxFiles > 1 && ` • Max files: ${field.validation.maxFiles}`}
      </p>

      {/* File preview list */}
      {files[field.id]?.length > 0 && (
        <FilePreviewList
          files={files[field.id]}
          onRemove={(index) => handleFileRemove(field.id, index)}
        />
      )}

      {errors[field.id] && (
        <p className="text-sm text-red-500">{errors[field.id]}</p>
      )}
    </div>
  );
}
```

**File Preview Component:**

```typescript
// src/components/forms/file-preview-list.tsx
export function FilePreviewList({ files, onRemove }: Props) {
  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div key={index} className="flex items-center gap-2 p-2 border rounded">
          <FileIcon type={file.type} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### Upload Flow

**Client-side validation:**
```typescript
function validateFile(file: File, validation: FileValidation): string | null {
  // Check file type
  const ext = `.${file.name.split('.').pop()}`;
  if (validation.allowedTypes && !validation.allowedTypes.includes(ext)) {
    return `File type ${ext} not allowed`;
  }

  // Check file size
  if (validation.maxFileSize && file.size > validation.maxFileSize) {
    return `File size exceeds ${formatBytes(validation.maxFileSize)}`;
  }

  return null;
}
```

**Submission flow:**

1. User clicks "Submit Intake Form"
2. Validate all fields including files
3. Show progress modal "Uploading documents and submitting form..."
4. Upload files to Google Drive first:
   ```typescript
   const uploadedFiles = [];
   for (const [fieldId, fileList] of Object.entries(files)) {
     for (const file of fileList) {
       const result = await uploadIntakeFile(matterId, file);
       uploadedFiles.push({
         fieldId,
         fileName: file.name,
         googleDriveFileId: result.fileId,
       });
     }
   }
   ```
5. Submit form with file references:
   ```typescript
   await submitIntakeForm(matterId, formType, {
     ...responses,
     _uploadedFiles: uploadedFiles, // Special field
   });
   ```
6. Server action creates intake_response and links documents
7. Redirect to thank-you page

**New Server Action:**

```typescript
// src/lib/data/actions.ts

export async function uploadIntakeFile(
  matterId: string,
  file: File
): Promise<{ fileId: string; path: string }> {
  const supabase = supabaseAdmin();
  const session = await getSession();

  // Upload to Google Drive (00 Intake folder)
  const result = await uploadDocument({
    file,
    matterId,
    targetFolder: '00 Intake',
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return {
    fileId: result.fileId,
    path: result.path,
  };
}
```

**Update submitIntakeForm:**

```typescript
// Extract uploaded files from responses
const uploadedFiles = responses._uploadedFiles || [];
delete responses._uploadedFiles;

// Create intake response
const { data: intakeResponse, error } = await supabase
  .from('intake_responses')
  .insert({
    matter_id: matterId,
    form_type: formType,
    responses,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  })
  .select()
  .single();

// Link documents to intake response
for (const uploadedFile of uploadedFiles) {
  await supabase
    .from('documents')
    .update({ intake_response_id: intakeResponse.id })
    .eq('google_drive_file_id', uploadedFile.googleDriveFileId);
}
```

### Admin Review Integration

**Update intake review page to show uploaded files:**

```typescript
// src/app/admin/intake/[intakeId]/page.tsx

const documents = await supabase
  .from('documents')
  .select('*')
  .eq('intake_response_id', params.intakeId)
  .order('uploaded_at', { ascending: false });

// Render in review page
<Card>
  <CardHeader>
    <CardTitle>Uploaded Documents</CardTitle>
  </CardHeader>
  <CardContent>
    {documents.length === 0 ? (
      <p className="text-sm text-slate-500">No documents uploaded</p>
    ) : (
      <DocumentTable documents={documents} />
    )}
  </CardContent>
</Card>
```

---

## 7. Navigation & Linking Improvements

### Deep Linking Throughout App

**Dashboard** (`/dashboard/page.tsx`):
- Matter cards → `<Link href={`/matters/${matter.id}`}>`
- "Needs Review" intake items → `<Link href={`/admin/intake/${intake.id}`}>`
- Overdue tasks → `<Link href={`/matters/${task.matter_id}?tab=tasks`}>`
- Client name → Filter matters by client (future)

**Matters List** (`/matters/page.tsx`):
- Matter cards → `<Link href={`/matters/${matter.id}`}>`
- "View Intake" button → `<Link href={`/admin/intake/${matter.intake_response_id}`}>`
- Client name → Filter by client

**Billing Page** (`/billing/page.tsx`):
- Invoice cards → `<Link href={`/billing/${invoice.id}`}>`
- Matter name → `<Link href={`/matters/${invoice.matter_id}`}>`
- "Send Invoice" → Show Square payment link in success toast
- "View Payment" → `<a href={squarePaymentUrl} target="_blank">`

**Admin Intake Review** (`/admin/intake/[intakeId]/page.tsx`):
- "View Matter" button → `<Link href={`/matters/${intake.matter_id}`}>`
- "View Documents" → `<Link href={`/matters/${intake.matter_id}?tab=documents`}>`
- After approval → `redirect(`/matters/${intake.matter_id}`)`

### Email Links

**Update all email templates:**

```typescript
// src/emails/matter-created.tsx
<Button href={`${process.env.NEXT_PUBLIC_APP_URL}/intake/${matterId}`}>
  Complete Intake Form
</Button>

// src/emails/intake-submitted.tsx
<Button href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/intake/${intakeId}`}>
  Review Intake
</Button>

// src/emails/invoice-sent.tsx
<Button href={squarePaymentUrl}>
  Pay Invoice
</Button>

// src/emails/task-assigned.tsx
<Button href={`${process.env.NEXT_PUBLIC_APP_URL}/matters/${matterId}?tab=tasks`}>
  View Task
</Button>
```

### Breadcrumbs Component

**New Component:** `src/components/breadcrumbs.tsx`

```typescript
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={item.href || index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-slate-600 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

**Usage in matter detail:**
```typescript
<Breadcrumbs items={[
  { label: 'Dashboard', href: '/' },
  { label: 'Matters', href: '/matters' },
  { label: matter.title },
]} />
```

### 404 & Error Handling

**New Error Components:**

```typescript
// src/app/matters/[matterId]/not-found.tsx
export default function MatterNotFound() {
  return (
    <div className="container py-16 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Matter Not Found</h1>
      <p className="text-slate-600 mt-2">
        This matter may have been deleted or you don't have access.
      </p>
      <Button asChild className="mt-4">
        <Link href="/matters">Back to Matters</Link>
      </Button>
    </div>
  );
}
```

**Update page to use notFound():**
```typescript
// src/app/matters/[matterId]/page.tsx
import { notFound } from 'next/navigation';

export default async function MatterDetailPage({ params }: Props) {
  const matter = await getMatterById(params.matterId);

  if (!matter) {
    notFound();
  }

  // ... rest of page
}
```

---

## 8. Implementation Checklist

### Phase 1: Sidebar Navigation (4 hours)

- [ ] Create `Sidebar` component with collapse state
- [ ] Create `TopBar` component with breadcrumbs
- [ ] Update `AppShell` to use sidebar layout
- [ ] Implement localStorage persistence for collapse state
- [ ] Add mobile overlay behavior (Sheet component)
- [ ] Update all navigation links to use sidebar
- [ ] Add role-based visibility for admin section
- [ ] Test on desktop and mobile

### Phase 2: Settings Page (6 hours)

- [ ] Create migration for `practice_settings` table
- [ ] Create `getPracticeSettings` action
- [ ] Create `updatePracticeSettings` action
- [ ] Create `/settings/page.tsx` with tabs
- [ ] Build Profile Settings tab and form
- [ ] Build Practice Settings tab and form (admin only)
- [ ] Build Integrations tab with status cards
- [ ] Wire up form submissions with validation
- [ ] Add success/error toasts
- [ ] Test all settings updates

### Phase 3: Matter Detail Page (8 hours)

- [ ] Create `/matters/[matterId]/page.tsx`
- [ ] Implement tab navigation with URL params
- [ ] Build Overview tab with matter details
- [ ] Build Tasks tab with task list
- [ ] Build Time tab with time entries
- [ ] Build Documents tab (see Phase 4)
- [ ] Add matter header component
- [ ] Add breadcrumbs
- [ ] Add error handling (not-found.tsx)
- [ ] Test tab switching and deep linking

### Phase 4: Document UI (10 hours)

- [ ] Create `DocumentBrowser` component
- [ ] Create `FolderTree` component
- [ ] Create `DocumentTable` component
- [ ] Create `DocumentUpload` component with drag-and-drop
- [ ] Create `FilePreviewList` component
- [ ] Create `/api/documents/upload` route handler
- [ ] Wire up upload to Google Drive actions
- [ ] Add delete document functionality
- [ ] Add share with client functionality
- [ ] Update `/documents/page.tsx` with recent documents
- [ ] Test upload, view, delete flows
- [ ] Add empty states for no Google Drive connection

### Phase 5: Intake File Uploads (6 hours)

- [ ] Update `DynamicFormRenderer` to support file inputs
- [ ] Create `FilePreviewList` component
- [ ] Add client-side file validation
- [ ] Create `uploadIntakeFile` action
- [ ] Update `submitIntakeForm` to handle file uploads
- [ ] Update intake review page to show uploaded files
- [ ] Test file upload in intake forms
- [ ] Test file linking to intake responses
- [ ] Test error handling for failed uploads

### Phase 6: Navigation & Linking (4 hours)

- [ ] Create `Breadcrumbs` component
- [ ] Add breadcrumbs to all detail pages
- [ ] Update dashboard links to matter detail
- [ ] Update matters list links
- [ ] Update billing page links
- [ ] Update admin intake review links
- [ ] Update all email templates with correct URLs
- [ ] Create Invoice detail page (`/billing/[invoiceId]`)
- [ ] Add 404 pages for all dynamic routes
- [ ] Test complete round-trip flow

### Phase 7: Polish & Testing (4 hours)

- [ ] Add loading states to all forms
- [ ] Add confirmation dialogs for destructive actions
- [ ] Test all links and navigation
- [ ] Test mobile responsive design
- [ ] Fix any TypeScript errors
- [ ] Run full round-trip test flow
- [ ] Update documentation

**Total Estimated Time:** 42 hours

---

## 9. Success Criteria

### Functional Requirements

✅ Users can navigate using VSCode-style sidebar
✅ Sidebar collapses/expands and persists state
✅ Users can update profile settings (password, preferences)
✅ Admins can update practice settings (firm info, billing defaults)
✅ Admins can view integration status
✅ Users can view matter details with tabbed interface
✅ Users can upload documents to matters via drag-and-drop
✅ Users can view documents organized by folder
✅ Users can share documents with clients
✅ Clients can upload files during intake submission
✅ Lawyers can view uploaded files in intake review
✅ All pages have breadcrumbs for navigation
✅ All links throughout app work correctly
✅ Email links point to correct pages

### Complete Round-Trip Test

1. ✅ Admin creates matter with client
2. ✅ Client receives email with intake link
3. ✅ Client fills intake form and uploads files
4. ✅ Client sees thank-you page
5. ✅ Lawyer receives email notification
6. ✅ Lawyer reviews intake from dashboard
7. ✅ Lawyer approves intake
8. ✅ Lawyer navigates to matter detail
9. ✅ Lawyer views uploaded files in Documents tab
10. ✅ Lawyer uploads additional documents
11. ✅ Lawyer creates and sends invoice
12. ✅ Client receives invoice email with payment link
13. ✅ Client pays via Square
14. ✅ Webhook updates invoice status
15. ✅ Lawyer sees payment confirmation

### Non-Functional Requirements

✅ Responsive design works on mobile/tablet/desktop
✅ File uploads show progress indicators
✅ Forms have proper validation and error messages
✅ All actions show success/error toasts
✅ Loading states prevent duplicate submissions
✅ TypeScript has no build errors
✅ No console errors in browser

---

## 10. Future Enhancements (Post-MVP)

**Document Management:**
- Version history for documents
- Document preview in-app (not just Google Drive)
- Bulk document operations (move, delete)
- Document templates library

**Settings:**
- Email template editor
- Custom field definitions for matters
- Webhook configuration UI
- API key management

**Matter Detail:**
- Activity timeline on overview tab
- Related matters section
- Client portal embed link
- Matter templates

**Navigation:**
- Global search (Cmd+K)
- Recent items menu
- Favorites/pinned matters
- Notification center

---

## Technical Notes

**Dependencies to Add:**
```bash
pnpm add lucide-react  # For sidebar icons (if not already installed)
```

**New Migrations:**
```sql
-- 0007_practice_settings.sql
-- 0008_add_intake_response_id_to_documents.sql (column may already exist)
```

**Files to Create:**
- `src/components/sidebar.tsx`
- `src/components/top-bar.tsx`
- `src/components/breadcrumbs.tsx`
- `src/components/document-browser.tsx`
- `src/components/folder-tree.tsx`
- `src/components/document-table.tsx`
- `src/components/document-upload.tsx`
- `src/components/forms/file-preview-list.tsx`
- `src/app/settings/page.tsx`
- `src/app/settings/profile-settings-form.tsx`
- `src/app/settings/practice-settings-form.tsx`
- `src/app/settings/integrations-panel.tsx`
- `src/app/matters/[matterId]/page.tsx`
- `src/app/matters/[matterId]/not-found.tsx`
- `src/app/billing/[invoiceId]/page.tsx`
- `src/app/api/documents/upload/route.ts`

**Files to Update:**
- `src/components/app-shell.tsx` - Switch to sidebar layout
- `src/lib/intake/dynamic-form-renderer.tsx` - Add file input support
- `src/lib/data/actions.ts` - Add practice settings and upload actions
- `src/lib/data/queries.ts` - Add practice settings queries
- `src/app/documents/page.tsx` - Add recent documents list
- `src/app/admin/intake/[intakeId]/page.tsx` - Show uploaded files
- All email templates in `src/emails/` - Update links

**Performance Considerations:**
- Document lists should paginate if >100 files
- Use React.lazy() for DocumentBrowser (heavy component)
- Optimize Google Drive API calls (batch requests where possible)
- Cache practice settings in layout (rarely changes)

**Security Notes:**
- Validate file types server-side (not just client-side)
- Scan uploaded files for malware (future: integrate ClamAV)
- Limit file upload size at nginx/reverse proxy level
- Rate limit document upload endpoint (max 10 files/minute per user)
- Ensure document access is RLS-protected by matter ownership

---

## Design Approved

**Date:** 2025-12-28
**Stakeholder:** User
**Next Steps:** Create implementation plan and begin development
