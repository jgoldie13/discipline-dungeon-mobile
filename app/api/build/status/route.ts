import { NextResponse } from 'next/server'
import { getProjectStatus } from '@/lib/build'
import { prisma } from '@/lib/prisma'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { requireUser } from '@/lib/supabase/requireUser'

export async function GET() {
  try {
    const userId = await requireUser()
    const { blueprint, project } = await getProjectStatus(userId)

    const progressMap = new Map(
      (project?.progress || []).map((p) => [p.segmentKey, p.pointsApplied])
    )

    const totalCost = blueprint.segments.reduce((acc, seg) => acc + seg.cost, 0)
    const applied = blueprint.segments.reduce((acc, seg) => {
      const appliedPoints = Math.min(progressMap.get(seg.key) || 0, seg.cost)
      return acc + appliedPoints
    }, 0)

    const completionPct = totalCost === 0 ? 0 : Math.round((applied / totalCost) * 100)

    const currentSegment = blueprint.segments.find((seg) => {
      const appliedPoints = progressMap.get(seg.key) || 0
      return appliedPoints < seg.cost
    })

    const currentApplied = currentSegment
      ? Math.min(progressMap.get(currentSegment.key) || 0, currentSegment.cost)
      : 0

    const [attacks, repairs] = await Promise.all([
      prisma.dragonAttack.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          blueprint: {
            select: { label: true },
          },
        },
      }),
      prisma.buildEvent.findMany({
        where: { userId, sourceType: 'DRAGON_REPAIR' },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ])

    const timeline = [
      ...attacks.map((attack) => ({
        id: attack.id,
        type: 'dragon_attack' as const,
        createdAt: attack.createdAt,
        damageAmount: attack.damageAmount,
        severity: attack.severity,
        description: attack.description,
        segmentLabel: attack.blueprint.label,
      })),
      ...repairs.map((repair) => ({
        id: repair.id,
        type: 'dragon_repair' as const,
        createdAt: repair.createdAt,
        points: repair.points,
        notes: repair.notes,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 12)

    const lastRepair = repairs[0]
      ? {
          id: repairs[0].id,
          createdAt: repairs[0].createdAt,
          points: repairs[0].points,
          notes: repairs[0].notes,
        }
      : null

    return NextResponse.json({
      blueprint,
      project,
      stats: {
        completionPct,
        currentSegment: currentSegment
          ? {
              ...currentSegment,
              applied: currentApplied,
              remaining: currentSegment.cost - currentApplied,
              pct: Math.round((currentApplied / currentSegment.cost) * 100),
            }
          : null,
      },
      timeline,
      lastRepair,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching build status:', error)
    return NextResponse.json({ error: 'Failed to fetch build status' }, { status: 500 })
  }
}
