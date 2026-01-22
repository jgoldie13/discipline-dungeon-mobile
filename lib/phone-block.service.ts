import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { XpService } from './xp.service'
import { applyBuildPoints } from './build'
import { pointsForPhoneBlock } from './build-policy'

type PomodoroConfig = {
  enabled?: boolean
  focusMinutes?: number
  breakMinutes?: number
}

export class PhoneBlockService {
  static async getActiveBlock(userId: string) {
    return prisma.phoneFreeBlock.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        startTime: 'desc',
      },
    })
  }

  static async startBlock(
    userId: string,
    plannedDurationMin: number,
    pomodoroConfig?: PomodoroConfig
  ) {
    const existing = await this.getActiveBlock(userId)
    if (existing) {
      return { block: existing, wasExisting: true }
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    })

    try {
      const block = await prisma.phoneFreeBlock.create({
        data: {
          userId,
          startTime: new Date(),
          durationMin: plannedDurationMin,
          status: 'ACTIVE',
          verified: false,
          verifyMethod: 'honor_system',
          xpEarned: 0,
          pomodoroEnabled: pomodoroConfig?.enabled ?? false,
          pomodoroFocusMin: pomodoroConfig?.enabled ? pomodoroConfig.focusMinutes ?? 25 : null,
          pomodoroBreakMin: pomodoroConfig?.enabled ? pomodoroConfig.breakMinutes ?? 5 : null,
        },
      })
      return { block, wasExisting: false }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const active = await this.getActiveBlock(userId)
        if (active) {
          return { block: active, wasExisting: true }
        }
      }
      throw error
    }
  }

  static async completeBlock(userId: string, blockId: string, xpEarned: number) {
    const block = await prisma.phoneFreeBlock.findFirst({
      where: { id: blockId, userId },
    })
    if (!block) {
      throw new Error('Block not found')
    }

    if (block.status === 'COMPLETED') {
      return {
        block,
        xpEarned: block.xpEarned,
        buildPoints: pointsForPhoneBlock(block.durationMin),
        build: { applied: false, reason: 'deduped' as const },
        deduped: true,
      }
    }

    const endTime = new Date()

    const updateResult = await prisma.phoneFreeBlock.updateMany({
      where: { id: blockId, userId, status: 'ACTIVE' },
      data: {
        endTime,
        status: 'COMPLETED',
        xpEarned,
        verified: true,
        verifyMethod: 'honor_system',
      },
    })

    const updated = await prisma.phoneFreeBlock.findUnique({
      where: { id: blockId },
    })
    if (!updated) {
      throw new Error('Block not found')
    }

    if (updateResult.count === 0) {
      return {
        block: updated,
        xpEarned: updated.xpEarned,
        buildPoints: pointsForPhoneBlock(updated.durationMin),
        build: { applied: false, reason: 'deduped' as const },
        deduped: true,
      }
    }

    const xpResult = await XpService.createEvent({
      userId,
      type: 'block_complete',
      delta: xpEarned,
      relatedModel: 'PhoneFreeBlock',
      relatedId: updated.id,
      description: `Phone-free block: ${updated.durationMin} minutes`,
      dedupeKey: `block:${updated.id}:complete`,
    })

    const buildPoints = pointsForPhoneBlock(updated.durationMin)
    const build = await applyBuildPoints({
      userId,
      points: buildPoints,
      sourceType: 'phone_block',
      sourceId: updated.id,
      dedupeKey: `block:${updated.id}:build`,
    })

    return {
      block: updated,
      xpEarned,
      xpResult,
      buildPoints,
      build,
      deduped: false,
    }
  }
}
