import { prisma } from '../lib/prisma'
import {
  addUserLocalDaysUtcKey,
  getUserDayBoundsUtc,
  getUserDayKeyUtc,
  getUserLocalDayString,
  resolveUserTimezone,
} from '../lib/time'

type DuplicateReport = {
  userId: string
  timezone: string
  localDay: string
  logs: Array<{ id: string; date: string }>
}

async function main() {
  const windowDays = Number.parseInt(process.argv[2] ?? '60', 10)
  if (Number.isNaN(windowDays) || windowDays <= 0) {
    throw new Error('Provide a positive integer day window, e.g. 60')
  }

  const users = await prisma.user.findMany({
    select: { id: true, timezone: true },
  })
  const now = new Date()
  const duplicates: DuplicateReport[] = []

  for (const user of users) {
    const timezone = resolveUserTimezone(user.timezone)
    const todayKey = getUserDayKeyUtc(timezone, now)

    for (let offset = 0; offset < windowDays; offset += 1) {
      const dayKey = addUserLocalDaysUtcKey(timezone, todayKey, -offset)
      const { startUtc, endUtc } = getUserDayBoundsUtc(timezone, dayKey)
      const logs = await prisma.sleepLog.findMany({
        where: {
          userId: user.id,
          date: {
            gte: startUtc,
            lt: endUtc,
          },
        },
        orderBy: { date: 'asc' },
        select: { id: true, date: true },
      })

      if (logs.length > 1) {
        duplicates.push({
          userId: user.id,
          timezone,
          localDay: getUserLocalDayString(timezone, dayKey),
          logs: logs.map((log) => ({
            id: log.id,
            date: log.date.toISOString(),
          })),
        })
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        windowDays,
        duplicateCount: duplicates.length,
        duplicates,
      },
      null,
      2
    )
  )
}

main()
  .catch((error) => {
    console.error('[detect-sleep-log-duplicates] Failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
