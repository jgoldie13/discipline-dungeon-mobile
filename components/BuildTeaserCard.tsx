'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from './ui/Card'
import { PillBadge } from './ui/PillBadge'
import { ProgressBar } from './ui/ProgressBar'
import { Button } from './ui/Button'

type StatusResponse = {
  blueprint: {
    name: string
    segments: { key: string; cost: number; phase: string }[]
  }
  project: {
    progress: { segmentKey: string; pointsApplied: number }[]
  } | null
  stats: {
    completionPct: number
    currentSegment: {
      label: string
      phase: string
      cost: number
      applied: number
      remaining: number
      pct: number
    } | null
  }
}

export function BuildTeaserCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/build/status', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as StatusResponse
        setStatus(data)
      } catch (err) {
        console.error('Failed to fetch build status', err)
      }
    }
    load()
  }, [])

  const completedSegments = useMemo(() => {
    if (!status?.project?.progress) return 0
    const progressMap = new Map(
      status.project.progress.map((p) => [p.segmentKey, p.pointsApplied])
    )
    return status.blueprint.segments.filter((seg) => {
      const applied = progressMap.get(seg.key) || 0
      return applied >= seg.cost
    }).length
  }, [status])

  const totalSegments = status?.blueprint?.segments.length || 0

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Cathedral Build</span>
          {status?.stats.currentSegment?.phase && (
            <PillBadge variant="muted" size="sm">
              {status.stats.currentSegment.phase}
            </PillBadge>
          )}
        </div>
        <Link href="/build" className="text-sm text-focus hover:underline">
          Open →
        </Link>
      </div>

      <div className="flex items-center justify-between text-sm text-muted mb-2">
        <span>
          {completedSegments}/{totalSegments} segments done
        </span>
        <span>{status?.stats.completionPct ?? 0}%</span>
      </div>

      <ProgressBar
        variant="xp"
        value={status?.stats.completionPct ?? 0}
        max={100}
      />

      {status?.stats.currentSegment && (
        <div className="mt-3 text-sm text-muted">
          Next: <span className="text-text">{status.stats.currentSegment.label}</span>{' '}
          ({status.stats.currentSegment.remaining} pts left)
        </div>
      )}

      <div className="mt-4">
        <Link href="/build">
          <Button variant="primary" size="sm" className="w-full">
            View Build
          </Button>
        </Link>
      </div>
    </Card>
  )
}
