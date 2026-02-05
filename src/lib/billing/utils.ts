// src/lib/billing/utils.ts

/**
 * Calculate billable duration by rounding up to the nearest billing increment.
 *
 * @param actualMinutes - The actual time worked in minutes
 * @param incrementMinutes - The billing increment (e.g., 6 for 0.1 hour billing)
 * @returns The billable duration rounded up to the nearest increment
 *
 * @example
 * calculateBillableDuration(7, 6)  // returns 12 (rounds up to next 6-min increment)
 * calculateBillableDuration(6, 6)  // returns 6 (exact match)
 * calculateBillableDuration(20, 15) // returns 30 (rounds up to next 15-min increment)
 */
export function calculateBillableDuration(
  actualMinutes: number,
  incrementMinutes: number | null | undefined
): number {
  // No rounding if no increment set or increment is 1 or less
  if (!incrementMinutes || incrementMinutes <= 1) {
    return actualMinutes;
  }

  // Handle 0 minutes
  if (actualMinutes === 0) {
    return 0;
  }

  // Round up to nearest increment
  return Math.ceil(actualMinutes / incrementMinutes) * incrementMinutes;
}
