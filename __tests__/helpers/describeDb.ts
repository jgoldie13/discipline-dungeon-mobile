import { describe } from 'vitest'
import { prisma } from '../../lib/prisma'

async function canConnectToDb() {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) return false

  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  } finally {
    try {
      await prisma.$disconnect()
    } catch {
      // Ignore disconnect errors in test setup
    }
  }
}

const hasDb = await canConnectToDb()

export const describeDb = hasDb ? describe : describe.skip
