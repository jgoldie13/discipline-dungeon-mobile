type RescueTimeDataResponse = {
  row_headers?: string[]
  rows?: any[]
  [key: string]: any
}

export type RescueTimeDailySummary = {
  verifiedMinutes: number
  totalMinutes?: number
  raw: unknown
}

function getHeaderMap(rowHeaders: unknown): string[] {
  if (!Array.isArray(rowHeaders)) return []
  return rowHeaders.map((h) => String(h))
}

function extractMinutesFromRow(headers: string[], row: unknown[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i].toLowerCase().trim()
    const value = row[i]
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isNaN(n)) out[key] = n
  }
  return out
}

function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60)
}

/**
 * Fetch a daily summary for a single date.
 *
 * Policy (v1):
 * - `verifiedMinutes` = distracting + very distracting minutes (derived from RescueTime daily interval summary).
 * - `totalMinutes` = total tracked minutes (if present in payload).
 */
export async function fetchDailySummary(
  apiKey: string,
  date: Date,
  timezone: string
): Promise<RescueTimeDailySummary> {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const day = `${y}-${m}-${d}`

  const url = new URL('https://www.rescuetime.com/anapi/data')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('perspective', 'interval')
  url.searchParams.set('resolution_time', 'day')
  url.searchParams.set('restrict_begin', day)
  url.searchParams.set('restrict_end', day)
  url.searchParams.set('timezone', timezone)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  const rawText = await res.text()
  let rawJson: RescueTimeDataResponse | null = null
  try {
    rawJson = JSON.parse(rawText) as RescueTimeDataResponse
  } catch {
    // keep rawText in raw for debugging
  }

  if (!res.ok) {
    const hint =
      rawJson && typeof rawJson === 'object'
        ? JSON.stringify(rawJson).slice(0, 500)
        : rawText.slice(0, 500)
    throw new Error(`RescueTime API error (${res.status}): ${hint}`)
  }

  const raw = rawJson ?? rawText
  const headers = getHeaderMap(rawJson?.row_headers)
  const rows = Array.isArray(rawJson?.rows) ? rawJson!.rows! : []

  if (rows.length === 0) {
    return { verifiedMinutes: 0, totalMinutes: 0, raw }
  }

  const row0 = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : []
  const mapped = extractMinutesFromRow(headers, row0)

  // Try multiple common header names to be robust across RescueTime formats.
  // Some accounts return seconds; some may return minutes. We treat large numbers as seconds.
  const distracting = mapped['distracting time'] ?? mapped['distracting'] ?? 0
  const veryDistracting = mapped['very distracting time'] ?? mapped['very distracting'] ?? 0
  const allTime = mapped['all time'] ?? mapped['total time'] ?? mapped['time spent'] ?? 0

  const asMinutes = (n: number) => (n > 24 * 60 ? secondsToMinutes(n) : Math.round(n))

  const verifiedMinutes = asMinutes(distracting) + asMinutes(veryDistracting)
  const totalMinutes = allTime ? asMinutes(allTime) : undefined

  return {
    verifiedMinutes,
    totalMinutes,
    raw,
  }
}

