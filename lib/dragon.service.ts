import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { getBlueprintMetadata } from './build'

const MAX_LOOKBACK_DAYS = 30
const MAX_REPAIR_DAYS = 7
const REPAIR_POINTS = 50
const SEVERITY_STEP = 200
const SEVERITY_MAX = 5

export type DragonTriggerType = 'violation' | 'truth_mismatch' | 'streak_break'

type DragonAttackResult = {
  applied: boolean
  deduped?: boolean
  damageApplied?: number
  severity?: number
  segmentLabel?: string
  segmentKey?: string
  createdAt?: Date
  reason?: string
}

type DragonRepairResult = {
  applied: boolean
  deduped?: boolean
  pointsApplied?: number
  segmentLabel?: string
  segmentKey?: string
  createdAt?: Date
  reason?: string
}

function startOfDayUtc(date: Date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function addDaysUtc(date: Date, days: number) {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function isoDateOnly(date: Date) {
  return startOfDayUtc(date).toISOString().slice(0, 10)
}

function dayRangeUtc(date: Date) {
  const start = startOfDayUtc(date)
  const end = addDaysUtc(start, 1)
  return { start, end }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function computeSeverity(damage: number) {
  return clamp(Math.ceil(damage / SEVERITY_STEP), 1, SEVERITY_MAX)
}

function calculateUsageViolationDamage(
  overageMin: number,
  dailyLimitMin: number,
  consecutiveDays: number
) {
  if (overageMin <= 0) return 0
  const overageMultiplier =
    dailyLimitMin > 0 ? Math.min(3, overageMin / dailyLimitMin) : 3
  const consecutiveMultiplier = 1 + consecutiveDays * 0.5
  return Math.floor(overageMin * overageMultiplier * consecutiveMultiplier)
}

function calculateTruthMismatchDamage(deltaMin: number, consecutiveDays: number) {
  if (deltaMin <= 0) return 0
  const lieMultiplier = deltaMin > 60 ? 3 : deltaMin > 30 ? 2 : 1
  const consecutiveMultiplier = 1 + consecutiveDays * 0.75
  return Math.floor(deltaMin * lieMultiplier * consecutiveMultiplier * 2)
}

function calculateStreakBreakDamage(previousStreakDays: number) {
  if (previousStreakDays <= 0) return 0
  return Math.min(1000, previousStreakDays * 50)
}

async function getActiveProject(
  tx: Prisma.TransactionClient,
  userId: string
) {
  const blueprint = getBlueprintMetadata()
  const project = await tx.userProject.findFirst({
    where: {
      userId,
      blueprintId: blueprint.id,
      active: true,
    },
    include: {
      progress: {
        include: {
          blueprint: true,
        },
      },
    },
  })
  return { project, blueprintId: blueprint.id }
}

function selectAttackTarget(
  progress: Array<
    Prisma.UserProjectProgressGetPayload<{
      include: { blueprint: true }
    }>
  >
) {
  const completed = progress.filter(
    (item) => item.pointsApplied >= item.blueprint.cost
  )
  const mostRecentCompleted = [...completed].sort((a, b) => {
    const aTime = (a.completedAt ?? a.updatedAt).getTime()
    const bTime = (b.completedAt ?? b.updatedAt).getTime()
    return bTime - aTime
  })[0]
  if (mostRecentCompleted) return mostRecentCompleted

  const oldestCompleted = [...completed].sort((a, b) => {
    const aTime = (a.completedAt ?? a.updatedAt).getTime()
    const bTime = (b.completedAt ?? b.updatedAt).getTime()
    return aTime - bTime
  })[0]
  if (oldestCompleted) return oldestCompleted

  const inProgress = progress
    .filter(
      (item) => item.pointsApplied > 0 && item.pointsApplied < item.blueprint.cost
    )
    .sort((a, b) => a.blueprint.orderIndex - b.blueprint.orderIndex)[0]

  return inProgress ?? null
}

async function countConsecutiveDays(
  userId: string,
  date: Date,
  triggerType: DragonTriggerType
) {
  const day = startOfDayUtc(date)
  const start = addDaysUtc(day, -(MAX_LOOKBACK_DAYS - 1))
  const end = addDaysUtc(day, 1)

  let rows: { date: Date }[] = []

  if (triggerType === 'violation') {
    rows = await prisma.usageViolation.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
      select: { date: true },
    })
  } else if (triggerType === 'truth_mismatch') {
    rows = await prisma.truthViolation.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
      select: { date: true },
    })
  } else if (triggerType === 'streak_break') {
    rows = await prisma.streakHistory.findMany({
      where: {
        userId,
        broken: true,
        date: { gte: start, lt: end },
      },
      select: { date: true },
    })
  }

  const dateKeys = new Set(rows.map((row) => isoDateOnly(row.date)))
  let count = 0

  for (let i = 0; i < MAX_LOOKBACK_DAYS; i += 1) {
    const key = isoDateOnly(addDaysUtc(day, -i))
    if (!dateKeys.has(key)) break
    count += 1
  }

  return Math.max(1, count)
}

async function applyDragonAttack(params: {
  userId: string
  date: Date
  triggerType: DragonTriggerType
  requestedDamage: number
  consecutiveDays: number
  description: string
}): Promise<DragonAttackResult> {
  const { userId, date, triggerType, requestedDamage, consecutiveDays, description } = params
  if (requestedDamage <= 0) {
    return { applied: false, reason: 'no_damage' }
  }

  const dateKey = isoDateOnly(date)
  const dedupeKey = `dragon_attack::${userId}::${dateKey}::${triggerType}`

  try {
    const result = await prisma.$transaction(async (tx) => {
      const { project, blueprintId } = await getActiveProject(tx, userId)
      if (!project) return { applied: false, reason: 'no_project' } as DragonAttackResult

      const target = selectAttackTarget(project.progress)
      if (!target) return { applied: false, reason: 'no_progress' } as DragonAttackResult

      const availablePoints = Math.max(
        0,
        Math.min(target.pointsApplied, target.blueprint.cost)
      )
      const damageApplied = Math.min(requestedDamage, availablePoints)
      if (damageApplied <= 0) {
        return { applied: false, reason: 'no_points' } as DragonAttackResult
      }

      const newPoints = Math.max(0, target.pointsApplied - damageApplied)
      const completedAt =
        newPoints >= target.blueprint.cost ? target.completedAt ?? new Date() : null

      await tx.userProjectProgress.update({
        where: { id: target.id },
        data: {
          pointsApplied: newPoints,
          completedAt,
        },
      })

      const attack = await tx.dragonAttack.create({
        data: {
          userId,
          userProjectId: project.id,
          blueprintId,
          segmentKey: target.segmentKey,
          damageAmount: damageApplied,
          triggerType,
          severity: computeSeverity(damageApplied),
          consecutiveDays,
          description,
          dedupeKey,
        },
      })

      await tx.buildEvent.create({
        data: {
          userProjectId: project.id,
          userId,
          blueprintId,
          points: -damageApplied,
          sourceType: 'DRAGON_ATTACK',
          sourceId: attack.id,
          allocations: [
            {
              segmentKey: target.segmentKey,
              applied: -damageApplied,
              total: newPoints,
              completed: newPoints >= target.blueprint.cost,
              cost: target.blueprint.cost,
            },
          ],
          notes: `Dragon attack: ${description}`,
        },
      })

      return {
        applied: true,
        damageApplied,
        severity: attack.severity,
        segmentLabel: target.blueprint.label,
        segmentKey: target.segmentKey,
        createdAt: attack.createdAt,
      } as DragonAttackResult
    })

    return result
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { applied: false, deduped: true }
    }
    throw error
  }
}

async function isPerfectDay(userId: string, date: Date, iosVerificationEnabled: boolean) {
  const { start, end } = dayRangeUtc(date)

  const [usageViolation, truthViolation, streakEntry, truthCheck] = await Promise.all([
    prisma.usageViolation.findFirst({
      where: { userId, date: { gte: start, lt: end } },
      select: { id: true },
    }),
    prisma.truthViolation.findFirst({
      where: { userId, date },
      select: { id: true },
    }),
    prisma.streakHistory.findFirst({
      where: { userId, date: { gte: start, lt: end } },
      select: { broken: true, underLimit: true, violationCount: true },
    }),
    iosVerificationEnabled
      ? prisma.truthCheckDaily.findUnique({
          where: { userId_date: { userId, date } },
          select: { status: true },
        })
      : Promise.resolve(null),
  ])

  if (usageViolation || truthViolation) return false
  if (!streakEntry || streakEntry.broken || !streakEntry.underLimit || streakEntry.violationCount > 0) {
    return false
  }
  if (iosVerificationEnabled && truthCheck?.status !== 'match') return false

  return true
}

async function applyAutoRepairForDate(
  userId: string,
  date: Date,
  iosVerificationEnabled: boolean
): Promise<DragonRepairResult> {
  const day = startOfDayUtc(date)
  const dateKey = isoDateOnly(day)
  const dedupeKey = `dragon_repair::${userId}::${dateKey}`

  const isPerfect = await isPerfectDay(userId, day, iosVerificationEnabled)
  if (!isPerfect) return { applied: false, reason: 'not_perfect' }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.buildEvent.findUnique({
        where: { dedupeKey },
        select: { id: true },
      })
      if (existing) return { applied: false, deduped: true } as DragonRepairResult

      const { project, blueprintId } = await getActiveProject(tx, userId)
      if (!project) return { applied: false, reason: 'no_project' } as DragonRepairResult

      const damaged = project.progress
        .map((item) => ({
          ...item,
          deficit: Math.max(0, item.blueprint.cost - item.pointsApplied),
        }))
        .filter((item) => item.deficit > 0)
        .sort((a, b) => b.deficit - a.deficit)[0]

      if (!damaged) return { applied: false, reason: 'no_damage' } as DragonRepairResult

      const pointsApplied = Math.min(REPAIR_POINTS, damaged.deficit)
      if (pointsApplied <= 0) return { applied: false, reason: 'no_points' } as DragonRepairResult

      const newPoints = damaged.pointsApplied + pointsApplied
      const completedAt =
        newPoints >= damaged.blueprint.cost ? damaged.completedAt ?? new Date() : damaged.completedAt

      await tx.userProjectProgress.update({
        where: { id: damaged.id },
        data: {
          pointsApplied: newPoints,
          completedAt,
        },
      })

      const note = `Cathedral Restoration: +${pointsApplied} (perfect day ${dateKey})`

      const event = await tx.buildEvent.create({
        data: {
          userProjectId: project.id,
          userId,
          blueprintId,
          points: pointsApplied,
          sourceType: 'DRAGON_REPAIR',
          dedupeKey,
          allocations: [
            {
              segmentKey: damaged.segmentKey,
              applied: pointsApplied,
              total: newPoints,
              completed: newPoints >= damaged.blueprint.cost,
              cost: damaged.blueprint.cost,
            },
          ],
          notes: note,
        },
      })

      return {
        applied: true,
        pointsApplied,
        segmentLabel: damaged.blueprint.label,
        segmentKey: damaged.segmentKey,
        createdAt: event.createdAt,
      } as DragonRepairResult
    })

    return result
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { applied: false, deduped: true }
    }
    throw error
  }
}

export class DragonService {
  static async applyUsageViolationAttack(
    userId: string,
    date: Date,
    overageMin: number,
    dailyLimitMin: number
  ) {
    const consecutiveDays = await countConsecutiveDays(userId, date, 'violation')
    const requestedDamage = calculateUsageViolationDamage(
      overageMin,
      dailyLimitMin,
      consecutiveDays
    )
    const description = `${overageMin}min over limit (day ${consecutiveDays})`
    return applyDragonAttack({
      userId,
      date,
      triggerType: 'violation',
      requestedDamage,
      consecutiveDays,
      description,
    })
  }

  static async applyTruthMismatchAttack(
    userId: string,
    date: Date,
    reportedMinutes: number,
    verifiedMinutes: number
  ) {
    const deltaMin = Math.abs(reportedMinutes - verifiedMinutes)
    const consecutiveDays = await countConsecutiveDays(userId, date, 'truth_mismatch')
    const requestedDamage = calculateTruthMismatchDamage(deltaMin, consecutiveDays)
    const description = `Reported ${reportedMinutes}min, actually ${verifiedMinutes}min`
    return applyDragonAttack({
      userId,
      date,
      triggerType: 'truth_mismatch',
      requestedDamage,
      consecutiveDays,
      description,
    })
  }

  static async applyStreakBreakAttack(
    userId: string,
    date: Date,
    previousStreakDays: number
  ) {
    const consecutiveDays = await countConsecutiveDays(userId, date, 'streak_break')
    const requestedDamage = calculateStreakBreakDamage(previousStreakDays)
    const description = `Lost ${previousStreakDays}-day streak`
    return applyDragonAttack({
      userId,
      date,
      triggerType: 'streak_break',
      requestedDamage,
      consecutiveDays,
      description,
    })
  }

  static async applyAutoRepairs(userId: string, date: Date) {
    const connection = await prisma.iosScreenTimeConnection.findUnique({
      where: { userId },
      select: { enabled: true },
    })
    const iosEnabled = connection?.enabled ?? false
    const day = startOfDayUtc(date)

    const results: DragonRepairResult[] = []
    for (let i = 0; i < MAX_REPAIR_DAYS; i += 1) {
      const targetDay = addDaysUtc(day, -i)
      const result = await applyAutoRepairForDate(userId, targetDay, iosEnabled)
      results.push(result)
    }

    return results
  }
}
