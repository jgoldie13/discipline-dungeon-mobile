'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthGate } from '@/components/auth/AuthGate'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { PillBadge } from '@/components/ui/PillBadge'
import { useToast } from '@/components/ui/Toast'

type Connection = {
  enabled: boolean
  timezone: string
  lastSyncAt: string | null
  hasApiKey: boolean
}

type TruthCheck = {
  id: string
  date: string
  status: string
  reportedMinutes: number | null
  verifiedMinutes: number | null
  deltaMinutes: number | null
}

const COMMON_TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const

function statusVariant(status: string): 'positive' | 'negative' | 'warning' | 'muted' {
  if (status === 'match') return 'positive'
  if (status === 'mismatch') return 'negative'
  if (status === 'missing_report') return 'warning'
  return 'muted'
}

export default function RescueTimeSettingsPage() {
  const pushToast = useToast()

  const [connection, setConnection] = useState<Connection>({
    enabled: false,
    timezone: '',
    lastSyncAt: null,
    hasApiKey: false,
  })
  const [truthChecks, setTruthChecks] = useState<TruthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [timezone, setTimezone] = useState('')

  const saveConnection = useCallback(
    async (next: Partial<{ enabled: boolean; timezone: string }>) => {
      if (saving) return
      const nextEnabled = next.enabled ?? connection.enabled
      const nextTimezone = (next.timezone ?? timezone).trim()

      if (nextEnabled && !nextTimezone) {
        pushToast({ title: 'Timezone required', description: 'Select a timezone first.' })
        return
      }

      setSaving(true)
      try {
        const res = await fetch('/api/rescuetime/connection', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: nextEnabled,
            timezone: nextTimezone,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to update connection')
        setConnection(data)
        setTimezone(data.timezone || '')
        pushToast({ title: 'RescueTime', description: 'Updated' })
      } catch (err) {
        pushToast({
          title: 'RescueTime',
          description: err instanceof Error ? err.message : 'Failed to update',
        })
      } finally {
        setSaving(false)
      }
    },
    [connection.enabled, pushToast, saving, timezone]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [connRes, truthRes] = await Promise.all([
        fetch('/api/rescuetime/connection', { cache: 'no-store' }),
        fetch('/api/rescuetime/truth?days=7', { cache: 'no-store' }),
      ])
      const connData = await connRes.json()
      const truthData = await truthRes.json()
      if (!connRes.ok) throw new Error(connData?.error || 'Failed to load connection')
      if (!truthRes.ok) throw new Error(truthData?.error || 'Failed to load truth checks')
      setConnection(connData)
      setTimezone(connData.timezone || '')
      setTruthChecks(truthData.truthChecks || [])
    } catch (err) {
      pushToast({
        title: 'RescueTime',
        description: err instanceof Error ? err.message : 'Failed to load',
      })
    } finally {
      setLoading(false)
    }
  }, [pushToast])

  useEffect(() => {
    load()
  }, [load])

  const saveApiKey = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/rescuetime/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save API key')
      setApiKey('')
      setConnection((c) => ({ ...c, hasApiKey: true }))
      pushToast({ title: 'RescueTime', description: 'API key saved' })
    } catch (err) {
      pushToast({
        title: 'RescueTime',
        description: err instanceof Error ? err.message : 'Failed to save API key',
      })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/rescuetime/test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.ok !== true) throw new Error(data?.error || 'Test failed')
      pushToast({ title: 'RescueTime', description: 'Connection OK' })
    } catch (err) {
      pushToast({
        title: 'RescueTime',
        description: err instanceof Error ? err.message : 'Test failed',
      })
    } finally {
      setSaving(false)
    }
  }

  const syncNow = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/rescuetime/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Sync failed')
      pushToast({
        title: 'RescueTime',
        description: `Synced ${data.date} (${data.status})`,
      })
      await load()
    } catch (err) {
      pushToast({
        title: 'RescueTime',
        description: err instanceof Error ? err.message : 'Sync failed',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthGate>
      <div className="min-h-screen bg-bg text-text">
        <header className="bg-surface-1 border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link href="/settings" className="text-2xl" aria-label="Back to settings">
                ←
              </Link>
              <div>
                <h1 className="text-xl font-bold">RescueTime</h1>
                <p className="text-xs text-muted">Truth sync + deterministic penalties.</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="text-center text-muted py-10">Loading…</div>
          ) : (
            <>
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">Enable RescueTime</div>
                    <div className="text-sm text-muted">
                      Syncs yesterday hourly (and on demand).
                    </div>
                  </div>
                  <Switch
                    checked={connection.enabled}
                    onChange={(v) => saveConnection({ enabled: v })}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1">Timezone (IANA)</label>
                  <select
                    value={timezone}
                    onChange={(e) => {
                      const next = e.target.value
                      setTimezone(next)
                      if (connection.enabled) {
                        saveConnection({ timezone: next })
                      }
                    }}
                    className="w-full bg-bg border border-border rounded-[--radius-lg] p-3 focus:outline-none focus:border-focus text-text"
                    disabled={saving}
                  >
                    <option value="">Select…</option>
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-muted mt-1">
                    Last sync:{' '}
                    <span className="tabular-nums">
                      {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">API key</div>
                    <div className="text-sm text-muted">
                      Stored encrypted server-side. Never sent back to the client.
                    </div>
                  </div>
                  {connection.hasApiKey && <PillBadge variant="positive">Saved</PillBadge>}
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste RescueTime API key"
                  className="w-full bg-bg border border-border rounded-[--radius-lg] p-3 focus:outline-none focus:border-focus text-text"
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={saveApiKey}
                    disabled={saving || apiKey.trim().length < 10}
                  >
                    Save key
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={testConnection}
                    disabled={saving || !connection.hasApiKey}
                  >
                    Test
                  </Button>
                </div>
              </Card>

              <Card className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Manual sync</div>
                  <div className="text-sm text-muted">Fetch yesterday and apply truth rules.</div>
                </div>
                <Button
                  size="sm"
                  onClick={syncNow}
                  disabled={saving || !connection.enabled || !connection.hasApiKey}
                >
                  Sync now
                </Button>
              </Card>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">Truth (last 7 days)</h2>
                </div>
                {truthChecks.length === 0 ? (
                  <Card>
                    <div className="text-center text-muted py-6">No truth checks yet.</div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {truthChecks.map((t) => (
                      <Card key={t.id} padding="md">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold tabular-nums">
                              {new Date(t.date).toISOString().slice(0, 10)}
                            </div>
                            <div className="text-sm text-muted tabular-nums">
                              Reported {t.reportedMinutes ?? '—'}m · Verified {t.verifiedMinutes ?? '—'}m · Δ{' '}
                              {t.deltaMinutes ?? '—'}m
                            </div>
                          </div>
                          <PillBadge variant={statusVariant(t.status)}>{t.status}</PillBadge>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGate>
  )
}
