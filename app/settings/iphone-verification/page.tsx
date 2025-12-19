'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AuthGate } from '@/components/auth/AuthGate'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'

type Connection = {
  enabled: boolean
  timezone: string
  lastSyncAt: string | null
  selection: unknown
}

type TruthRow = {
  date: string
  status: 'match' | 'mismatch' | 'missing_report' | 'missing_verification'
  deltaMinutes: number | null
  reportedMinutes: number | null
  verifiedMinutes: number | null
  source: string
}

function formatTimestamp(value: string | null) {
  if (!value) return 'Never'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function statusLabel(status: TruthRow['status']) {
  switch (status) {
    case 'match':
      return 'Match'
    case 'mismatch':
      return 'Mismatch'
    case 'missing_report':
      return 'Missing report'
    case 'missing_verification':
      return 'Missing verification'
  }
}

export default function IphoneVerificationSettingsPage() {
  const toast = useToast()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [truthRows, setTruthRows] = useState<TruthRow[]>([])
  const [truthLastSyncAt, setTruthLastSyncAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [connRes, truthRes] = await Promise.all([
        fetch('/api/verification/ios/connection', { cache: 'no-store' }),
        fetch('/api/verification/truth', { cache: 'no-store' }),
      ])

      const connJson = await connRes.json()
      const truthJson = await truthRes.json()

      if (!connRes.ok) throw new Error(connJson?.error || 'Failed to load connection')
      if (!truthRes.ok) throw new Error(truthJson?.error || 'Failed to load truth rows')

      setConnection(connJson)
      setTruthRows(truthJson?.rows || [])
      setTruthLastSyncAt(truthJson?.lastSyncAt || null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load'
      toast({ title: 'iPhone verification', description: message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const selectionJson = useMemo(() => {
    if (!connection) return ''
    if (connection.selection == null) return ''
    try {
      return JSON.stringify(connection.selection, null, 2)
    } catch {
      return ''
    }
  }, [connection])

  const setEnabled = async (enabled: boolean) => {
    if (!connection) return
    setSaving(true)
    try {
      const res = await fetch('/api/verification/ios/connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          timezone: enabled ? connection.timezone : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to update')
      setConnection(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update'
      toast({ title: 'iPhone verification', description: message })
    } finally {
      setSaving(false)
    }
  }

  const updateTimezone = async () => {
    if (!connection) return
    setSaving(true)
    try {
      const res = await fetch('/api/verification/ios/connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: connection.timezone,
          enabled: connection.enabled,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to update timezone')
      setConnection(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update timezone'
      toast({ title: 'iPhone verification', description: message })
    } finally {
      setSaving(false)
    }
  }

  const updateSelection = async (value: string) => {
    if (!connection) return
    setSaving(true)
    try {
      const parsed = value.trim() ? JSON.parse(value) : null
      const res = await fetch('/api/verification/ios/connection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selection: parsed,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to update selection')
      setConnection(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update selection'
      toast({ title: 'iPhone verification', description: message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-transparent text-dd-text">
        <header className="glass-panel rounded-none p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-2xl">
              ←
            </Link>
            <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
              iPhone Verification
            </h1>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchAll} disabled={loading || saving}>
            Refresh
          </Button>
        </header>

        <div className="p-4 space-y-4">
          <Card className="scroll-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-dd-text">iPhone Screen Time</div>
                <div className="text-sm text-dd-muted">
                  The web app can’t read Screen Time directly — a native companion app uploads daily verified minutes.
                </div>
              </div>
              <Switch
                checked={!!connection?.enabled}
                disabled={loading || saving}
                onChange={(v) => setEnabled(v)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-dd-muted block mb-1">Timezone (IANA)</label>
                <div className="flex gap-2">
                  <input
                    value={connection?.timezone ?? ''}
                    disabled={loading || saving}
                    onChange={(e) =>
                      setConnection((c) => (c ? { ...c, timezone: e.target.value } : c))
                    }
                    placeholder="America/Los_Angeles"
                    className="w-full px-3 py-2 rounded-lg bg-dd-surface/60 border border-dd-border/60 text-dd-text"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={loading || saving || !connection?.enabled}
                    onClick={updateTimezone}
                  >
                    Save
                  </Button>
                </div>
                <div className="text-xs text-dd-muted mt-1">
                  Only required when enabled.
                </div>
              </div>

              <div>
                <label className="text-xs text-dd-muted block mb-1">Selection (optional JSON)</label>
                <textarea
                  defaultValue={selectionJson}
                  disabled={loading || saving}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-dd-surface/60 border border-dd-border/60 text-dd-text font-mono text-xs"
                  placeholder='{"apps":["..."],"categories":["..."]}'
                  onBlur={(e) => updateSelection(e.target.value)}
                />
                <div className="text-xs text-dd-muted mt-1">
                  Stored as raw metadata; the companion app controls its meaning.
                </div>
              </div>
            </div>
          </Card>

          <Card className="scroll-card p-4 space-y-2">
            <div className="font-semibold text-dd-text">Connect iPhone</div>
            <ol className="text-sm text-dd-muted space-y-1 list-decimal list-inside">
              <li>Install the Discipline Dungeon iPhone companion app (coming soon).</li>
              <li>Grant Screen Time access and choose which apps/categories to verify.</li>
              <li>Open the iPhone app daily to upload yesterday’s verified minutes.</li>
            </ol>
            <div className="text-xs text-dd-muted">
              Last uploaded: {formatTimestamp(truthLastSyncAt)}
            </div>
          </Card>

          <Card className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-dd-text">Truth (last 7 days)</div>
              <div className="text-xs text-dd-muted">
                Penalties apply only when both reported and verified exist and mismatch exceeds 5 minutes.
              </div>
            </div>

            {loading ? (
              <div className="text-dd-muted">Loading…</div>
            ) : (
              <div className="space-y-2">
                {truthRows.length === 0 ? (
                  <div className="text-dd-muted text-sm">No truth rows yet.</div>
                ) : (
                  truthRows.map((r) => (
                    <div
                      key={r.date}
                      className="scroll-card flex items-center justify-between gap-3 p-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-dd-text">{r.date}</div>
                        <div className="text-xs text-dd-muted">
                          reported {r.reportedMinutes ?? '—'}m · verified {r.verifiedMinutes ?? '—'}m · Δ {r.deltaMinutes ?? '—'}
                        </div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-dd-surface/60 border border-dd-border/60 text-dd-text">
                        {statusLabel(r.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthGate>
  )
}
