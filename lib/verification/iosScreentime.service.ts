import { prisma } from '../prisma'

export async function upsertIosScreenTimeDaily(
  userId: string,
  date: Date,
  verifiedMinutes: number,
  raw?: unknown
) {
  const fetchedAt = new Date()
  return prisma.iosScreenTimeDaily.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      verifiedMinutes,
      raw: raw as any,
      fetchedAt,
    },
    update: {
      verifiedMinutes,
      raw: raw as any,
      fetchedAt,
    },
  })
}
