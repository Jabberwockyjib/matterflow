# UI Review & Completion Plan

**Date:** 2026-01-07
**Status:** In Progress
**Purpose:** Comprehensive review to ensure UI is fully up to date with design documentation

---

## 1. Executive Summary

Based on review of project documentation (project.md, UI-UX.md, ui-gaps plans), the MatterFlow MVP is approximately **95% complete**. The core workflow is fully functional. This plan identifies the remaining gaps and recommended priorities.

### Verified as Complete ✅

| Feature | Location | Status |
|---------|----------|--------|
| Dashboard with pipeline board | `/dashboard` | ✅ Complete |
| Matter management (CRUD) | `/matters`, `/matters/[id]` | ✅ Complete |
| Matter detail with tabs | `/matters/[id]` | ✅ Complete (Overview, Docs, Tasks, Time) |
| Time tracking page | `/time` | ✅ Complete |
| Add Time Entry Modal | `add-time-entry-modal.tsx` | ✅ Complete |
| Add Task Modal | `add-task-modal.tsx` | ✅ Complete |
| Billing & Invoices | `/billing` | ✅ Complete |
| Invoice Detail | `/billing/[invoiceId]` | ✅ Complete |
| Documents page | `/documents` | ✅ Complete |
| Settings (Profile/Practice/Integrations) | `/settings` | ✅ Complete |
| Admin - Users | `/admin/users` | ✅ Complete |
| Admin - Intake Review | `/admin/intake` | ✅ Complete |
| Admin - Templates | `/admin/templates` | ✅ Complete |
| Client Intake Forms | `/intake/[matterId]` | ✅ Complete |
| Client Invitation Flow | `/intake/invite/[code]` | ✅ Complete |
| Client Portal | `/my-matters` | ✅ Complete |
| VSCode-style Sidebar | `sidebar.tsx` | ✅ Complete |
| Authentication | `/auth/*` | ✅ Complete |
| Breadcrumbs | `breadcrumbs.tsx` | ✅ Complete |

### Gaps Identified 🔴

| Feature | PRD Section | Priority | Status |
|---------|-------------|----------|--------|
| Reports Page | 5.10 | Medium | ❌ Not Implemented |
| Package/Pricing Templates | 5.6 | Low | ❌ Not Implemented |
| Conflict Check AI Agent | 5.3 | Low (Post-MVP) | ❌ Stage exists, no automation |
| AI Agents (Intake, Copilot) | 6 | Low (Post-MVP) | ❌ Not Implemented |

### Minor Issues ⚠️

| Issue | Location | Priority |
|-------|----------|----------|
| Header timer component (disabled) | `app-shell.tsx` | Medium |
| TypeScript errors in test files | Various | Low |
| `/client` route vs `/my-matters` | URL naming | Low |

---

## 2. Feature Verification Checklist

### 2.1 Dashboard (PRD 5.10)

**Requirements from PRD:**
- Tasks due today
- Waiting on Client
- Waiting on Lawyer
- Unpaid invoices
- New leads aging

**To Verify:**
- [ ] Pipeline board shows matters by stage
- [ ] "Needs Attention" section with overdue items
- [ ] "Waiting on Client" items visible
- [ ] Filters work (stage, type, responsible party, search)
- [ ] Quick stats cards present
- [ ] Links to matter detail pages work

### 2.2 Matter Management (PRD 5.2)

**Requirements:**
- Create matter with required fields
- Matter view shows: Stage, Next Action, Responsible Party, Tasks, Documents, Time Entries, Invoices

**To Verify:**
- [ ] Create matter modal/form works
- [ ] Matter detail page has tabs (Overview, Documents, Tasks, Time, Billing)
- [ ] Stage change works
- [ ] Next action and due date displayed
- [ ] Responsible party visible
- [ ] Edit matter functionality

### 2.3 Time Tracking (PRD 5.5)

**Requirements:**
- Timer-based tracking (< 2 clicks to start)
- Manual entry
- Entries link to matter/task
- Approval workflow before billing

**To Verify:**
- [ ] Header timer works and persists across navigation
- [ ] Quick add time entry works
- [ ] Time page lists all entries
- [ ] Time entries on matter detail page
- [ ] Approval toggle for admin
- [ ] Timer modal with matter select

### 2.4 Billing (PRD 5.7)

**Requirements:**
- Invoice creation from time entries
- Status: Draft, Sent, Paid, Partial, Overdue
- Square sync on approval
- Payment link generation

**To Verify:**
- [ ] Invoice list page displays invoices
- [ ] Create invoice from time entries
- [ ] Invoice detail page shows line items
- [ ] Status badges correct
- [ ] Mark paid action works
- [ ] Resend email action
- [ ] Square payment link displayed

### 2.5 Document Management (PRD 5.4)

**Requirements:**
- Auto-created folder structure per matter
- Upload to Google Drive
- Metadata in Supabase
- AI classification (future)

**To Verify:**
- [ ] Documents page shows connection status
- [ ] Document upload component exists
- [ ] Matter detail - Documents tab functional
- [ ] Folder structure visible
- [ ] Google Drive connect flow

### 2.6 Intake System (PRD 5.3)

**Requirements:**
- Dynamic forms per matter type
- File upload support
- Draft saving
- Admin review and approval

**To Verify:**
- [ ] Client intake form renders correctly
- [ ] All 13 field types work
- [ ] Draft auto-save works
- [ ] File upload in forms works
- [ ] Thank you page after submission
- [ ] Admin review page lists submissions
- [ ] One-click approval works
- [ ] Intake responses visible in matter detail

### 2.7 Tasks (PRD 5.8)

**Requirements:**
- Tasks linked to matters
- Due date, responsible party
- Every matter has ≥1 task unless Completed

**To Verify:**
- [ ] Task list page works
- [ ] Create task modal works
- [ ] Task status toggle
- [ ] Tasks visible on matter detail
- [ ] Overdue highlighting

### 2.8 Client Portal

**Requirements:**
- Clients see only their matters
- View assigned matters
- Respond to requests
- Pay invoices

**To Verify:**
- [ ] /my-matters or /client route exists
- [ ] Client-only view shows restricted matters
- [ ] Invoice visibility for clients

### 2.9 Settings

**Requirements from frontend-completion-design:**
- Profile settings (all users)
- Practice settings (admin only)
- Integrations status

**To Verify:**
- [ ] Settings page has tabs
- [ ] Profile form saves correctly
- [ ] Practice settings (admin) works
- [ ] Integrations panel shows Google Drive/Square/Resend status

### 2.10 Admin Features

**Requirements:**
- User management
- Intake review
- Template admin (new)

**To Verify:**
- [ ] /admin/users page lists users
- [ ] Invite user modal works
- [ ] /admin/intake shows submissions
- [ ] /admin/templates shows document templates
- [ ] Upload template with AI parsing

---

## 3. UI Components Verification

### 3.1 Navigation

- [ ] Sidebar shows all main nav items
- [ ] Admin section only visible to admin/staff
- [ ] Sidebar collapse/expand works
- [ ] Active route highlighted
- [ ] Mobile hamburger menu works

### 3.2 Breadcrumbs

- [ ] Present on detail pages
- [ ] Links work correctly

### 3.3 Modals

- [ ] Add Task Modal
- [ ] Add Time Entry Modal
- [ ] Create Matter Modal/Form
- [ ] Invite Client Modal
- [ ] Timer Modal

### 3.4 Status Indicators

- [ ] Stage badges (Lead Created through Archived)
- [ ] Status badges (draft, sent, paid, etc.)
- [ ] Responsibility icons (lawyer, client, staff)
- [ ] Overdue highlighting

---

## 4. Integration Points

### 4.1 Google Drive

- [ ] OAuth flow works
- [ ] Folder initialization per matter
- [ ] File upload to Drive
- [ ] Document listing from Drive

### 4.2 Square

- [ ] Invoice sync to Square
- [ ] Payment URL generation
- [ ] Webhook endpoint for payment updates

### 4.3 Email (Resend)

- [ ] Matter created → client email
- [ ] Invoice sent → client email
- [ ] Intake reminders
- [ ] Task assignment notifications

---

## 5. Known Issues from SESSION_NOTES.md

1. **User Display Issue** - After sign-in, name shows "Guest" until hard refresh
2. **TypeScript Errors** - 101 remaining (mostly in test files for timer)
3. **External Services** - Resend, Google Drive, Square need configuration

---

## 6. Potential Gaps to Address

Based on PRD vs Implementation:

### 6.1 Possibly Missing Features

| Feature | PRD Section | Status |
|---------|-------------|--------|
| Conflict Check workflow | 5.3 | ⚠️ Verify |
| Package templates (pricing) | 5.6 | ⚠️ Verify |
| Automation pause per matter | 5.9 | ⚠️ Verify |
| Reports (Billable vs non-billable) | 5.10 | ⚠️ Verify |

### 6.2 UI Polish Items

- Loading states on all forms
- Confirmation dialogs for destructive actions
- Empty states for all lists
- Error handling pages (404, etc.)

---

## 7. Implementation Priority

### High Priority (Core Flow)
1. Verify matter creation → intake → review → billing flow works end-to-end
2. Ensure time tracking < 2 clicks requirement met
3. Confirm invoice detail page fully functional

### Medium Priority (Admin Features)
4. Verify template admin UI works with AI parsing
5. Confirm settings pages save correctly
6. Check user management works

### Low Priority (Polish)
7. Fix TypeScript errors
8. Add missing loading states
9. Mobile responsiveness

---

## 8. Testing Plan

### 8.1 Manual Flow Test

Complete this flow to verify core MVP:

1. Sign in as admin
2. Create a new matter with client
3. Navigate to matter detail
4. Add tasks and time entries
5. Upload document
6. Create invoice
7. View invoice detail
8. Test client intake flow (separate browser/incognito)

### 8.2 UI Verification

For each page, verify:
- Renders without console errors
- Data loads correctly
- Actions work (buttons, forms)
- Navigation links work
- Mobile responsive

---

## 9. Recommended Implementation Plan

Based on the review, here are the prioritized items to complete:

### Phase 1: Reports Page (High Priority - MVP)

**Why:** PRD 5.10 explicitly requires reports for:
- Billable vs non-billable time
- Revenue by matter type
- Invoice aging

**Implementation:**
```
/reports                    → Reports dashboard
  - Time report (billable vs non-billable)
  - Revenue by matter type chart
  - Invoice aging table
```

**Estimated effort:** 4-6 hours

### Phase 2: Header Timer Re-enable (Medium Priority)

**Why:** SESSION_NOTES.md indicates timer components are disabled. PRD requires "< 2 clicks to start/stop timer".

**Tasks:**
1. Implement missing timer functions in `timer-context.tsx`
2. Re-enable `HeaderTimerDisplay` in app shell
3. Fix related TypeScript errors

**Estimated effort:** 2-4 hours

### Phase 3: Package Templates (Low Priority - Post-MVP)

**Why:** PRD 5.6 describes package templates (e.g., "Standard Will Package – $750"). This is a nice-to-have for initial launch.

**Implementation:**
```
/admin/packages             → Package template management
  - Create package with flat/hybrid pricing
  - Auto-generate tasks from package
```

**Estimated effort:** 6-8 hours

### Phase 4: AI Agents (Post-MVP)

**Why:** PRD Section 6 describes AI agents but notes "No AI action auto-executes without human approval." These are enhancement features.

**Agents to implement:**
1. Conflict Triage Agent
2. Intake Classifier Agent
3. Matter Copilot

**Estimated effort:** 20+ hours (separate project)

---

## 10. Immediate Action Items

For the next coding session, implement in this order:

1. **Create `/reports` page** with basic time and revenue reports
2. **Re-enable header timer** functionality
3. **Fix TypeScript errors** in test files

These three items will bring the MVP to 100% completion for the core PRD requirements.

---

## 11. Files Reviewed

### App Routes Verified
- `/src/app/dashboard/page.tsx` ✅
- `/src/app/matters/page.tsx` ✅
- `/src/app/matters/[id]/page.tsx` ✅
- `/src/app/time/page.tsx` ✅
- `/src/app/billing/page.tsx` ✅
- `/src/app/billing/[invoiceId]/page.tsx` ✅
- `/src/app/settings/page.tsx` ✅
- `/src/app/admin/templates/page.tsx` ✅
- `/src/app/my-matters/page.tsx` ✅

### Components Verified
- `/src/components/sidebar.tsx` ✅
- `/src/components/matters/add-task-modal.tsx` ✅
- `/src/components/matters/add-time-entry-modal.tsx` ✅
- `/src/components/forms/MatterForm.tsx` ✅

---

**Review completed:** 2026-01-07
**Reviewer:** Claude
**Next action:** Implement Reports page to achieve MVP completion
