import { prisma } from '../prisma'

export type IosEnforcementEventInput = {
  dedupeKey: string
  type: string
  eventTs: Date
  planHash?: string | null
  timezone?: string | null
  dailyCapMinutes?: number | null
  note?: string | null
  raw?: unknown
}

export async function appendIosEnforcementEvents(
  userId: string,
  events: IosEnforcementEventInput[]
) {
  if (events.length === 0) {
    return { count: 0 }
  }

  const data = events.map((event) => ({
    userId,
    dedupeKey: event.dedupeKey,
    type: event.type,
    eventTs: event.eventTs,
    planHash: event.planHash ?? null,
    timezone: event.timezone ?? null,
    dailyCapMinutes: event.dailyCapMinutes ?? null,
    note: event.note ?? null,
    raw: event.raw as any,
  }))

  return prisma.iosEnforcementEvent.createMany({
    data,
    skipDuplicates: true,
  })
}
