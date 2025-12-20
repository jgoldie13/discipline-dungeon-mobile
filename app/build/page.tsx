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
  timeline: (
    | {
        type: 'dragon_attack'
        id: string
        createdAt: string
        damageAmount: number
        severity: number
        description: string
        segmentLabel: string
      }
    | {
        type: 'dragon_repair'
        id: string
        createdAt: string
        points: number
        notes: string | null
      }
  )[]
  lastRepair: {
    id: string
    createdAt: string
    points: number
    notes: string | null
  } | null
}

export default function BuildPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/build/status', { cache: 'no-store' })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Failed to load build status')
        }
        const data = (await res.json()) as StatusResponse
        setStatus(data)
      } catch (error) {
        console.error('Failed to load build status', error)
        setStatus(null)
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
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to load build status')
      }
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
  const severityIcons: Record<number, string> = {
    1: '🐉',
    2: '🔥🐉',
    3: '🔥🔥🐉',
    4: '🔥🔥🔥🐉',
    5: '💀🐉',
  }
  const timeline = status?.timeline ?? []

  return (
    <div className="min-h-dvh bg-transparent text-dd-text">
      <header className="glass-panel rounded-none p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm text-dd-muted mb-1">Meta Progression</div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-serif uppercase tracking-widest text-mana truncate">
            Cathedral Project
          </h1>
        </div>
        <Link href="/mobile" className="text-dd-text hover:text-mana shrink-0 text-xl">
          ← Back
        </Link>
      </header>

      <div className="p-4 pb-24 md:pb-8 space-y-4 overflow-x-hidden">
        <div className="flex flex-wrap items-center gap-2">
          <PillBadge variant="muted">{status?.blueprint.name ?? 'Loading...'}</PillBadge>
          <PillBadge variant="default">Current phase: {currentPhase}</PillBadge>
        </div>

        <Card className="glass-panel p-4">
          <div className="font-serif uppercase tracking-widest text-mana mb-3 text-sm sm:text-base">
            Journey Map
          </div>
          <div className="space-y-2">
            {phases.map((phase) => {
              const pct = phase.cost === 0 ? 0 : Math.min(100, Math.round((phase.applied / phase.cost) * 100))
              const isCurrent = phase.phase === currentPhase
              return (
                <div
                  key={phase.phase}
                  className="scroll-card flex items-center gap-2 sm:gap-3 p-3"
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full border shrink-0',
                      isCurrent
                        ? 'bg-mana border-mana/60'
                        : 'bg-dd-surface/60 border-dd-border/60'
                    )}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-dd-text text-sm sm:text-base">{phase.phase}</span>
                      {isCurrent && (
                        <PillBadge
                          size="sm"
                          className="bg-dd-surface/60 text-dd-text border-dd-border/60"
                        >
                          Next up
                        </PillBadge>
                      )}
                    </div>
                    <ProgressBar variant="xp" value={pct} max={100} className="mt-1" />
                  </div>
                  <span className="text-xs sm:text-sm text-dd-text shrink-0 w-10 sm:w-12 text-right tabular-nums">{pct}%</span>
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
            className="glass-panel"
          />
        )}

        {timeline.length > 0 && (
          <Card className="glass-panel p-4">
            <div className="font-serif uppercase tracking-widest text-mana mb-3 text-sm sm:text-base">
              Dragon Activity
            </div>
            <div className="space-y-3">
              {timeline.map((entry) => {
                const isAttack = entry.type === 'dragon_attack'
                const icon = isAttack
                  ? severityIcons[entry.severity] || '🐉'
                  : '✨'
                const title = isAttack
                  ? `Dragon Attack: -${entry.damageAmount} pts`
                  : `Cathedral Restoration: +${entry.points} pts`
                const subtitle = isAttack
                  ? `${entry.description} • ${entry.segmentLabel} damaged`
                  : entry.notes || 'Perfect day restoration'
                return (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="flex items-start gap-3 border border-dd-border/40 rounded-[--radius-lg] p-3 bg-dd-surface/40"
                  >
                    <div className="text-xl leading-none">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-semibold', isAttack ? 'text-blood' : 'text-mana')}>
                        {title}
                      </div>
                      <div className="text-xs text-dd-muted mt-1">{subtitle}</div>
                    </div>
                    <div className="text-[10px] text-dd-muted whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="glass-panel p-4">
            <div className="text-xs sm:text-sm text-dd-text">Overall Completion</div>
            <div className="text-2xl sm:text-3xl font-bold text-dd-text tabular-nums">{status?.stats.completionPct ?? 0}%</div>
            <ProgressBar
              variant="xp"
              value={status?.stats.completionPct ?? 0}
              max={100}
              className="mt-3"
            />
          </Card>

          <Card className="glass-panel p-4">
            <div className="text-xs sm:text-sm text-dd-text">Current Segment</div>
            <div className="font-semibold text-base sm:text-lg text-dd-text">
              {status?.stats.currentSegment?.label || 'All segments built'}
            </div>
            {status?.stats.currentSegment && (
              <>
                <div className="text-xs sm:text-sm text-dd-text mt-1 tabular-nums">
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

          <Card className="glass-panel p-4 sm:col-span-2 md:col-span-1">
            <div className="text-xs sm:text-sm text-dd-text">Build Points</div>
            <div className="font-semibold text-base sm:text-lg text-dd-text">Auto-applied</div>
            <div className="text-xs sm:text-sm text-dd-text mt-1">
              Earn points by completing tasks, urges, and phone-free blocks.
            </div>
          </Card>
        </div>

        {loading && (
          <Card className="glass-panel p-4 text-dd-text">
            Loading cathedral blueprint...
          </Card>
        )}

        {!loading && !status && (
          <Card className="glass-panel p-4 text-blood">Failed to load build status.</Card>
        )}

        <Card className="glass-panel p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-dd-text">Need to see progress updates?</div>
              <div className="font-semibold text-sm sm:text-base text-dd-text">Finish any task or phone-free block.</div>
            </div>
            <Link href="/phone/block" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto">
                Start a Block
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="glass-panel p-4 border border-blood/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="text-xs sm:text-sm text-blood">Danger zone</div>
              <div className="font-semibold text-sm sm:text-base text-dd-text">Reset Cathedral</div>
              <div className="text-xs sm:text-sm text-dd-text mt-1">
                This deletes your cathedral progress for this account. This cannot be undone.
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full sm:w-auto shrink-0"
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
