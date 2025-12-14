import { NextResponse } from 'next/server'
import { getProjectStatus } from '@/lib/build'
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
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching build status:', error)
    return NextResponse.json({ error: 'Failed to fetch build status' }, { status: 500 })
  }
}
