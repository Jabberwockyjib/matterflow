# Minimum Billing Increment Feature Design

**Date:** 2026-02-04
**Status:** Approved

## Overview

Legal billing commonly uses minimum time increments (e.g., 6 minutes = 0.1 hour). This feature adds configurable billing increments that round up actual time to the nearest billing unit.

## Requirements

1. Store both actual and billable duration for each time entry
2. Practice-wide configurable minimum billing increment
3. Default to 6 minutes (0.1 hour) - industry standard
4. Show billable time immediately when timer stops via toast notification
5. Use billable duration for invoicing

## Data Model Changes

### `practice_settings` table

Add column:
```sql
billing_increment_minutes INTEGER DEFAULT 6
```

Valid values: 1, 5, 6, 10, 15 (enforced in application layer)

### `time_entries` table

Rename and add columns:
```sql
-- Rename existing column for clarity
ALTER TABLE time_entries RENAME COLUMN duration_minutes TO actual_duration_minutes;

-- Add billable duration column
ALTER TABLE time_entries ADD COLUMN billable_duration_minutes INTEGER;
```

## Rounding Logic

```typescript
function calculateBillableDuration(actualMinutes: number, incrementMinutes: number): number {
  if (incrementMinutes <= 1) return actualMinutes;
  return Math.ceil(actualMinutes / incrementMinutes) * incrementMinutes;
}
```

**Examples with 6-minute increment:**
| Actual | Billable |
|--------|----------|
| 1 min  | 6 min    |
| 6 min  | 6 min    |
| 7 min  | 12 min   |
| 20 min | 24 min   |

**Examples with 15-minute increment:**
| Actual | Billable |
|--------|----------|
| 3 min  | 15 min   |
| 15 min | 15 min   |
| 20 min | 30 min   |
| 21 min | 30 min   |

## UI Changes

### Settings Page (Practice → Billing Defaults)

Add "Minimum Billing Increment" dropdown:
- 1 minute (no rounding)
- 5 minutes
- 6 minutes (0.1 hour) - default
- 10 minutes
- 15 minutes (0.25 hour)

### Timer Stop Feedback

When timer stops, show toast notification:
```
Time logged: 3 min actual → 6 min billed
```

If no rounding needed (actual equals billable):
```
Time logged: 6 min
```

### Time Entry List

Display both values in the time entries table/list:
- Primary: billable duration (used for billing)
- Secondary: actual duration (for reference)

Format: "12 min (actual: 7 min)" or similar

## Implementation Touchpoints

### Database
- Migration to add `billing_increment_minutes` to `practice_settings`
- Migration to rename `duration_minutes` → `actual_duration_minutes` and add `billable_duration_minutes`

### Backend (actions.ts)
- `stopTimer()`: Calculate and store both durations
- `stopTimerFormAction()`: Same calculation
- `createTimeEntry()`: Calculate billable from actual
- `updateTimeEntry()`: Recalculate billable if actual changes
- `getPracticeSettings()`: Include billing increment

### Frontend
- `practice-settings-form.tsx`: Add billing increment dropdown
- `timer-context.tsx`: Return both durations from stop
- Toast notification on timer stop
- Time entry displays throughout app

### Types
- Update `database.types.ts` after migration
- Update `PracticeSettings` type in queries.ts

## Migration Strategy

1. Add new columns with defaults
2. Backfill `billable_duration_minutes = actual_duration_minutes` for existing entries (no rounding applied retroactively)
3. New entries use the rounding logic

## Testing

- Unit tests for rounding function with edge cases
- Integration test for timer stop with various increments
- Verify invoice calculations use billable duration
