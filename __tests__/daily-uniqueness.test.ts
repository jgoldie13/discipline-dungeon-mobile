import { it, expect, beforeEach } from 'vitest'
import { prisma } from '../lib/prisma'
import { toDateOnly } from '../lib/dateOnly'
import { describeDb } from './helpers/describeDb'

describeDb('Daily Table Uniqueness (Multi-User)', () => {
  const testDate = toDateOnly(new Date('2025-12-20'))
  const user1Id = 'test-user-1-daily-uniqueness'
  const user2Id = 'test-user-2-daily-uniqueness'

  beforeEach(async () => {
    // Clean up test data (in order due to foreign key constraints)
    await prisma.phoneDailyLog.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } }
    })
    await prisma.streakHistory.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } }
    })
    await prisma.dailyProtocol.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } }
    })
    // Delete users last
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } }
    })

    // Create test users
    await prisma.user.createMany({
      data: [
        { id: user1Id, email: 'test1@dailyuniqueness.test' },
        { id: user2Id, email: 'test2@dailyuniqueness.test' },
      ],
      skipDuplicates: true,
    })
  })

  it('should allow two different users to create PhoneDailyLog for the same date', async () => {
    // User 1 creates log for testDate
    const log1 = await prisma.phoneDailyLog.create({
      data: {
        userId: user1Id,
        date: new Date(testDate),
        socialMediaMin: 30,
        limitMin: 30,
        overage: 0
      }
    })

    // User 2 creates log for the SAME date
    const log2 = await prisma.phoneDailyLog.create({
      data: {
        userId: user2Id,
        date: new Date(testDate),
        socialMediaMin: 60,
        limitMin: 30,
        overage: 30
      }
    })

    expect(log1.userId).toBe(user1Id)
    expect(log2.userId).toBe(user2Id)
    expect(toDateOnly(log1.date)).toBe(testDate)
    expect(toDateOnly(log2.date)).toBe(testDate)
  })

  it('should allow upsert by (userId, date) for PhoneDailyLog', async () => {
    const createData = {
      userId: user1Id,
      date: new Date(testDate),
      socialMediaMin: 30,
      limitMin: 30,
      overage: 0
    }

    // First upsert creates
    const log1 = await prisma.phoneDailyLog.upsert({
      where: { userId_date: { userId: user1Id, date: new Date(testDate) } },
      create: createData,
      update: { socialMediaMin: 45, overage: 15 }
    })

    expect(log1.socialMediaMin).toBe(30)

    // Second upsert updates
    const log2 = await prisma.phoneDailyLog.upsert({
      where: { userId_date: { userId: user1Id, date: new Date(testDate) } },
      create: createData,
      update: { socialMediaMin: 45, overage: 15 }
    })

    expect(log2.id).toBe(log1.id) // Same record
    expect(log2.socialMediaMin).toBe(45) // Updated
  })

  it('should allow two users to create StreakHistory for the same date', async () => {
    const streak1 = await prisma.streakHistory.create({
      data: {
        userId: user1Id,
        date: new Date(testDate),
        streakCount: 5,
        underLimit: true
      }
    })

    const streak2 = await prisma.streakHistory.create({
      data: {
        userId: user2Id,
        date: new Date(testDate),
        streakCount: 10,
        underLimit: false
      }
    })

    expect(streak1.userId).toBe(user1Id)
    expect(streak2.userId).toBe(user2Id)
    expect(toDateOnly(streak1.date)).toBe(testDate)
    expect(toDateOnly(streak2.date)).toBe(testDate)
  })

  it('should allow two users to create DailyProtocol for the same date', async () => {
    const protocol1 = await prisma.dailyProtocol.create({
      data: {
        userId: user1Id,
        date: new Date(testDate),
        wokeOnTime: true,
        gotMorningLight: true,
        drankWater: true,
        completed: true
      }
    })

    const protocol2 = await prisma.dailyProtocol.create({
      data: {
        userId: user2Id,
        date: new Date(testDate),
        wokeOnTime: false,
        gotMorningLight: true,
        drankWater: false,
        completed: false
      }
    })

    expect(protocol1.userId).toBe(user1Id)
    expect(protocol2.userId).toBe(user2Id)
    expect(toDateOnly(protocol1.date)).toBe(testDate)
    expect(toDateOnly(protocol2.date)).toBe(testDate)
  })
})
