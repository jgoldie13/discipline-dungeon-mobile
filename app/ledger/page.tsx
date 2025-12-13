'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Surface } from '@/components/ui/Surface'
import { Button } from '@/components/ui/Button'

interface AuditEvent {
  id: string
  type: string
  description: string | null
  createdAt: string
  metadata: Record<string, unknown> | null
}

export default function LedgerPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLedger = useCallback(async () => {
    try {
      const response = await fetch('/api/audit/ledger')
      const data = await response.json()
      setEvents(data.events)
    } catch (error) {
      console.error('Error fetching ledger:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'block_started':
        return '▶️'
      case 'block_completed':
        return '✅'
      case 'block_failed':
        return '❌'
      case 'boss_attack':
        return '⚔️'
      case 'boss_defeated':
        return '🏆'
      case 'stake_created':
        return '💰'
      case 'stake_evaluated':
        return '⚖️'
      case 'urge_logged':
        return '🚫'
      case 'task_completed':
        return '✓'
      case 'override':
        return '⚠️'
      case 'cheat_admitted':
        return '🔴'
      default:
        return '•'
    }
  }

  const getEventLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <p className="text-muted">Loading ledger...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="bg-surface-1 border-b border-border p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-bold">Today&apos;s Ledger</h1>
      </header>

      <div className="p-4 space-y-4">
        <Surface elevation="1">
          <p className="text-sm text-muted">
            Immutable audit trail of all actions today. Radical honesty enforced.
          </p>
        </Surface>

        {events.length === 0 ? (
          <Surface elevation="1">
            <p className="text-center text-muted py-8">
              No events recorded today
            </p>
          </Surface>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <Surface key={event.id} elevation="1" className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getEventIcon(event.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text">
                      {getEventLabel(event.type)}
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted mt-1">
                        {event.description}
                      </p>
                    )}
                    <div className="text-xs text-muted mt-2 tabular-nums">
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
        )}

        <Link href="/mobile">
          <Button variant="secondary" size="md" className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
