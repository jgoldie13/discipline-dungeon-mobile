'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CathedralBlueprint } from '@/components/CathedralBlueprint'
import { Card } from '@/components/ui/Card'
import { PillBadge } from '@/components/ui/PillBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'

type Segment = {
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
  segments: Segment[]
}

type StatusResponse = {
  blueprint: Blueprint
  project: {
    id: string
    progress: { segmentKey: string; pointsApplied: number }[]
  } | null
  stats: {
    completionPct: number
    currentSegment: {
      key: string
      label: string
      phase: string
      cost: number
      applied: number
      remaining: number
      pct: number
    } | null
  }
}

export default function BuildPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/build/status')
        const data = (await res.json()) as StatusResponse
        setStatus(data)
      } catch (error) {
        console.error('Failed to load build status', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const reloadStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/build/status', { cache: 'no-store' })
      const data = (await res.json()) as StatusResponse
      setStatus(data)
    } catch (error) {
      console.error('Failed to load build status', error)
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Reset Cathedral?\n\nThis deletes your cathedral progress for this account. This cannot be undone.'
    )
    if (!confirmed) return

    setResetting(true)
    try {
      const res = await fetch('/api/build/reset', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to reset cathedral progress')
      }
      await reloadStatus()
    } catch (error) {
      console.error(error)
      window.alert(error instanceof Error ? error.message : 'Failed to reset cathedral progress')
    } finally {
      setResetting(false)
    }
  }

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {}
    status?.project?.progress.forEach((p) => {
      map[p.segmentKey] = p.pointsApplied
    })
    return map
  }, [status])

  const phases = useMemo(() => {
    if (!status) return []
    const grouped: Record<
      string,
      { phase: string; cost: number; applied: number; order: number }
    > = {}
    status.blueprint.segments.forEach((seg) => {
      if (!grouped[seg.phase]) {
        grouped[seg.phase] = { phase: seg.phase, cost: 0, applied: 0, order: seg.order }
      }
      grouped[seg.phase].cost += seg.cost
      grouped[seg.phase].applied += Math.min(progressMap[seg.key] || 0, seg.cost)
    })
    return Object.values(grouped).sort((a, b) => a.order - b.order)
  }, [status, progressMap])

  const currentPhase = phases.find((p) => p.applied < p.cost)?.phase || 'Foundations'

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="bg-surface-1 border-b border-border p-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted mb-1">Meta Progression</div>
          <h1 className="text-2xl font-bold">Cathedral Project</h1>
        </div>
        <Link href="/mobile" className="text-muted hover:text-text">
          ← Back
        </Link>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <PillBadge variant="muted">{status?.blueprint.name ?? 'Loading...'}</PillBadge>
          <PillBadge variant="default">Current phase: {currentPhase}</PillBadge>
        </div>

        <Card className="p-4">
          <div className="font-semibold mb-3">Journey Map</div>
          <div className="space-y-2">
            {phases.map((phase) => {
              const pct = phase.cost === 0 ? 0 : Math.min(100, Math.round((phase.applied / phase.cost) * 100))
              const isCurrent = phase.phase === currentPhase
              return (
                <div key={phase.phase} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border',
                      isCurrent ? 'bg-focus border-focus' : 'bg-surface-2 border-border'
                    )}
                    aria-hidden
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{phase.phase}</span>
                      {isCurrent && <PillBadge variant="muted" size="sm">Next up</PillBadge>}
                    </div>
                    <ProgressBar variant="xp" value={pct} max={100} className="mt-1" />
                  </div>
                  <span className="text-sm text-muted w-12 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </Card>

        {status && (
          <CathedralBlueprint
            svgPath={status.blueprint.asset}
            segments={status.blueprint.segments}
            progress={progressMap}
            className="bg-surface-1"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="text-sm text-muted">Overall Completion</div>
            <div className="text-3xl font-bold">{status?.stats.completionPct ?? 0}%</div>
            <ProgressBar
              variant="xp"
              value={status?.stats.completionPct ?? 0}
              max={100}
              className="mt-3"
            />
          </Card>

          <Card className="p-4">
            <div className="text-sm text-muted">Current Segment</div>
            <div className="font-semibold text-lg">
              {status?.stats.currentSegment?.label || 'All segments built'}
            </div>
            {status?.stats.currentSegment && (
              <>
                <div className="text-sm text-muted mt-1">
                  {status.stats.currentSegment.remaining} pts remaining
                </div>
                <ProgressBar
                  variant="boss"
                  value={status.stats.currentSegment.pct}
                  max={100}
                  className="mt-3"
                />
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="text-sm text-muted">Build Points</div>
            <div className="font-semibold text-lg">Auto-applied</div>
            <div className="text-sm text-muted mt-1">
              Earn points by completing tasks, urges, and phone-free blocks.
            </div>
          </Card>
        </div>

        {loading && <Card className="p-4 text-muted">Loading cathedral blueprint...</Card>}

        {!loading && !status && (
          <Card className="p-4 text-negative">Failed to load build status.</Card>
        )}

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">Need to see progress updates?</div>
              <div className="font-semibold">Finish any task or phone-free block.</div>
            </div>
            <Link href="/phone/block">
              <Button variant="primary" size="sm">
                Start a Block
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-4 border border-negative/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-muted">Danger zone</div>
              <div className="font-semibold">Reset Cathedral</div>
              <div className="text-sm text-muted mt-1">
                This deletes your cathedral progress for this account. This cannot be undone.
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? 'Resetting…' : 'Reset'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
