/**
 * Date-only utilities for daily records
 * Ensures consistent YYYY-MM-DD handling across the app
 * Prevents timezone drift by normalizing to UTC midnight
 */

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validates a string is in YYYY-MM-DD format
 */
export function isValidDateOnly(value: string): boolean {
  return ISO_DATE_REGEX.test(value)
}

/**
 * Converts a Date to YYYY-MM-DD string (UTC-based)
 */
export function toDateOnly(date: Date): string {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/**
 * Creates a Date object from YYYY-MM-DD string at UTC midnight
 * Throws if format is invalid
 */
export function fromDateOnly(dateString: string): Date {
  if (!isValidDateOnly(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`)
  }
  const d = new Date(`${dateString}T00:00:00.000Z`)
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date value: ${dateString}`)
  }
  return d
}

/**
 * Gets today's date as YYYY-MM-DD in UTC
 */
export function todayDateOnly(): string {
  return toDateOnly(new Date())
}

/**
 * Gets yesterday's date as YYYY-MM-DD in UTC
 */
export function yesterdayDateOnly(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return toDateOnly(d)
}

/**
 * Converts a Date to YYYY-MM-DD string in a specific IANA timezone
 */
export function dateOnlyInTZ(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * Adds days to a date-only string, returns new date-only string
 */
export function addDays(dateString: string, days: number): string {
  const d = fromDateOnly(dateString)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateOnly(d)
}

/**
 * Normalizes a Date to UTC midnight (for database storage)
 */
export function normalizeToUtcMidnight(date: Date): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}
