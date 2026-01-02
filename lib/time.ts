import { DateTime, IANAZone } from 'luxon'

export const DEFAULT_TIMEZONE = 'America/Chicago'

export function isValidIanaTimezone(timezone?: string | null): timezone is string {
  return !!timezone && IANAZone.isValidZone(timezone)
}

export function resolveUserTimezone(timezone?: string | null): string {
  return isValidIanaTimezone(timezone) ? timezone : DEFAULT_TIMEZONE
}

export function getUserDayBoundsUtc(
  timezone: string,
  instant: Date = new Date()
): { startUtc: Date; endUtc: Date } {
  const zone = resolveUserTimezone(timezone)
  const local = DateTime.fromJSDate(instant, { zone: 'utc' }).setZone(zone)
  const startLocal = local.startOf('day')
  const endLocal = startLocal.plus({ days: 1 })

  return {
    startUtc: startLocal.toUTC().toJSDate(),
    endUtc: endLocal.toUTC().toJSDate(),
  }
}

export function getUserDayKeyUtc(
  timezone: string,
  instant: Date = new Date()
): Date {
  return getUserDayBoundsUtc(timezone, instant).startUtc
}

export function getUserLocalDayString(
  timezone: string,
  instant: Date = new Date()
): string {
  const zone = resolveUserTimezone(timezone)
  return DateTime.fromJSDate(instant, { zone: 'utc' })
    .setZone(zone)
    .toFormat('yyyy-LL-dd')
}

export function addUserLocalDaysUtcKey(
  timezone: string,
  dayKeyUtc: Date,
  days: number
): Date {
  const zone = resolveUserTimezone(timezone)
  const localMidnight = DateTime.fromJSDate(dayKeyUtc, { zone: 'utc' })
    .setZone(zone)
    .startOf('day')
    .plus({ days })

  return localMidnight.toUTC().toJSDate()
}
