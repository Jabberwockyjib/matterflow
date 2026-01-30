# Collapsible Forms + Sortable Lists Design

## Overview

Update the Matters and Tasks pages to:
1. Hide create forms behind an "Add" button (collapsed by default)
2. Add client-side sorting controls for lists

## Collapsible Form Pattern

- Forms hidden by default behind primary "Add Matter" / "Add Task" button
- Clicking opens a Collapsible panel with smooth animation
- Form includes "Cancel" button to close without submitting
- Auto-closes after successful submission

## Sorting

Client-side sorting (instant, no page reload).

### Matters Sort Options
- Due date (soonest first) — **default**
- Due date (latest first)
- Responsible party
- Stage (pipeline order)
- Last updated
- Client name (alphabetical)

### Tasks Sort Options
- Due date (soonest first) — **default**
- Due date (latest first)
- Responsible party
- Status (open → in_progress → completed)
- Last updated

## UI Layout

```
┌─────────────────────────────────────────────────┐
│  Matters                     [Sort ▼] [+ Add Matter] │
│  12 matters                                          │
└─────────────────────────────────────────────────┘
[Collapsible form - hidden by default]
[Sorted list of matter cards]
```

## New Components

| Component | Purpose |
|-----------|---------|
| `CollapsibleFormSection` | Reusable wrapper with trigger button and animated panel |
| `SortDropdown` | Generic dropdown for sort selection |
| `MattersListClient` | Client component with sort state, renders MatterCards |
| `TasksListClient` | Client component with sort state, renders task cards |

## Files to Modify

| File | Change |
|------|--------|
| `src/app/matters/page.tsx` | Simplify to server fetch, delegate to client components |
| `src/app/tasks/page.tsx` | Same pattern |
| `src/components/ui/collapsible-form-section.tsx` | New |
| `src/components/ui/sort-dropdown.tsx` | New |
| `src/components/matters/matters-list-client.tsx` | New |
| `src/components/tasks/tasks-list-client.tsx` | New |

## Data Flow

```
Server Component (fetch data)
  → Client wrapper (sort state + form state)
    → Collapsible form
    → Sorted list of cards
```

## Behavior Notes

- Default sort: Due date (soonest first) - urgent items at top
- Existing MatterCard and task card components unchanged
- Server actions for create/update unchanged
- Form validation and draft persistence unchanged
- Forms reset and close after successful submission
