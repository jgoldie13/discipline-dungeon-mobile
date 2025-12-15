export function dateKeyUtc(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function utcDateFromDateKey(dateKey: string): Date {
  const d = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }
  return d
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = dtf.formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  if (!year || !month || !day) throw new Error('Failed to format date in timezone')
  return `${year}-${month}-${day}`
}

export function yesterdayDateUtcForTimeZone(timeZone: string, now = new Date()): Date {
  const todayKey = dateKeyInTimeZone(now, timeZone)
  const todayUtc = utcDateFromDateKey(todayKey)
  todayUtc.setUTCDate(todayUtc.getUTCDate() - 1)
  return todayUtc
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

