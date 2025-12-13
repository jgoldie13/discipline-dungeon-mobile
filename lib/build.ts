import fs from 'fs'
import path from 'path'
import { prisma } from './prisma'
import type { Prisma, User } from '@prisma/client'

type BlueprintSegment = {
  key: string
  label: string
  cost: number
  phase: string
  order: number
}

type Blueprint = {
  id: string
  name: string
  asset: string
  units: string
  segments: BlueprintSegment[]
}

type Allocation = {
  segmentKey: string
  applied: number
  total: number
  completed: boolean
  cost: number
}

type ApplyArgs = {
  userId: string
  points: number
  sourceType?: string
  sourceId?: string
  blueprintId?: string
}

const BLUEPRINT_PATH = path.join(
  process.cwd(),
  'public',
  'blueprints',
  'cathedral_cologne_v1.json'
)

let cachedBlueprint: Blueprint | null = null

function loadBlueprint(): Blueprint {
  if (cachedBlueprint) return cachedBlueprint
  const raw = fs.readFileSync(BLUEPRINT_PATH, 'utf-8')
  const parsed = JSON.parse(raw) as Blueprint
  parsed.segments.sort((a, b) => a.order - b.order)
  cachedBlueprint = parsed
  return parsed
}

async function ensureUser(tx: Prisma.TransactionClient, userId: string): Promise<User> {
  const existing = await tx.user.findUnique({ where: { id: userId } })
  if (existing) return existing
  return tx.user.create({ data: { id: userId } })
}

async function ensureBlueprintSegments(tx: Prisma.TransactionClient, blueprint: Blueprint) {
  await Promise.all(
    blueprint.segments.map((seg) =>
      tx.blueprintSegment.upsert({
        where: {
          blueprintId_segmentKey: {
            blueprintId: blueprint.id,
            segmentKey: seg.key,
          },
        },
        create: {
          blueprintId: blueprint.id,
          segmentKey: seg.key,
          label: seg.label,
          cost: seg.cost,
          phase: seg.phase,
          orderIndex: seg.order,
        },
        update: {
          label: seg.label,
          cost: seg.cost,
          phase: seg.phase,
          orderIndex: seg.order,
        },
      })
    )
  )
}

export async function applyBuildPoints(args: ApplyArgs) {
  const { userId, points, sourceType, sourceId, blueprintId } = args
  if (!points || points <= 0) {
    return { applied: false, reason: 'no_points' as const }
  }

  const blueprint = loadBlueprint()
  const activeBlueprintId = blueprintId || blueprint.id

  return prisma.$transaction(async (tx) => {
    // Ensure user + project + blueprint metadata exist
    await ensureUser(tx, userId)
    await ensureBlueprintSegments(tx, blueprint)

    const project = await tx.userProject.upsert({
      where: {
        userId_blueprintId: {
          userId,
          blueprintId: activeBlueprintId,
        },
      },
      update: {},
      create: {
        userId,
        blueprintId: activeBlueprintId,
      },
    })

    const existingProgress = await tx.userProjectProgress.findMany({
      where: { userProjectId: project.id },
    })
    const progressMap = new Map(existingProgress.map((p) => [p.segmentKey, p]))

    let remaining = points
    const allocations: Allocation[] = []

    for (const seg of blueprint.segments) {
      const progress = progressMap.get(seg.key)
      const current = progress?.pointsApplied ?? 0
      if (current >= seg.cost) continue

      const needed = seg.cost - current
      const apply = Math.min(remaining, needed)
      if (apply > 0) {
        const total = current + apply
        const completedAt = total >= seg.cost ? new Date() : null

        const updated = await tx.userProjectProgress.upsert({
          where: {
            userProjectId_segmentKey: {
              userProjectId: project.id,
              segmentKey: seg.key,
            },
          },
          create: {
            userProjectId: project.id,
            blueprintId: activeBlueprintId,
            segmentKey: seg.key,
            pointsApplied: total,
            completedAt,
          },
          update: {
            pointsApplied: total,
            completedAt: completedAt ?? progress?.completedAt ?? null,
          },
        })

        allocations.push({
          segmentKey: seg.key,
          applied: apply,
          total: updated.pointsApplied,
          completed: !!updated.completedAt,
          cost: seg.cost,
        })

        remaining -= apply
      }

      if (remaining <= 0) break
    }

    await tx.buildEvent.create({
      data: {
        userProjectId: project.id,
        userId,
        blueprintId: activeBlueprintId,
        points,
        sourceType,
        sourceId,
        allocations,
      },
    })

    const allProgress = await tx.userProjectProgress.findMany({
      where: { userProjectId: project.id },
    })

    const totals = blueprint.segments.reduce(
      (acc, seg) => {
        const prog = allProgress.find((p) => p.segmentKey === seg.key)
        const applied = prog?.pointsApplied ?? 0
        const clamped = Math.min(applied, seg.cost)
        acc.applied += clamped
        acc.totalCost += seg.cost

        if (!acc.current && clamped < seg.cost) {
          acc.current = {
            segmentKey: seg.key,
            label: seg.label,
            cost: seg.cost,
            pointsApplied: clamped,
            remaining: seg.cost - clamped,
            phase: seg.phase,
          }
        }
        return acc
      },
      {
        applied: 0,
        totalCost: 0,
        current: null as
          | {
              segmentKey: string
              label: string
              cost: number
              pointsApplied: number
              remaining: number
              phase: string
            }
          | null,
      }
    )

    const completionPct =
      totals.totalCost === 0 ? 0 : Math.round((totals.applied / totals.totalCost) * 100)
    const currentSegmentPct =
      totals.current && totals.current.cost > 0
        ? Math.round((totals.current.pointsApplied / totals.current.cost) * 100)
        : 100

    return {
      applied: true,
      allocations,
      remainingPoints: remaining,
      summary: {
        completionPct,
        currentSegment: totals.current,
        currentSegmentPct,
      },
    }
  })
}

export async function getProjectStatus(userId: string, blueprintId?: string) {
  const blueprint = loadBlueprint()
  const activeBlueprintId = blueprintId || blueprint.id

  const project = await prisma.$transaction(async (tx) => {
    await ensureUser(tx, userId)
    await ensureBlueprintSegments(tx, blueprint)

    return tx.userProject.upsert({
      where: {
        userId_blueprintId: { userId, blueprintId: activeBlueprintId },
      },
      create: {
        userId,
        blueprintId: activeBlueprintId,
      },
      update: {},
      include: {
        progress: true,
      },
    })
  })

  return {
    blueprint,
    project,
  }
}

export function getBlueprintMetadata() {
  return loadBlueprint()
}
