/**
 * Event Client - Client-side helpers for logging microtask events
 * Sends events to /api/events for persistence via AuditService
 */

import type { MicrotaskEventPayload } from './eventTypes'

export async function logMicrotaskEvent(payload: MicrotaskEventPayload): Promise<void> {
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('[EventClient] Failed to log event:', response.status)
    }
  } catch (error) {
    // Don't throw - event logging failures shouldn't block UX
    console.error('[EventClient] Error logging event:', error)
  }
}

export async function getRecentEvents(limit = 20): Promise<unknown[]> {
  try {
    const response = await fetch(`/api/events?limit=${limit}`)
    if (!response.ok) {
      console.error('[EventClient] Failed to fetch events:', response.status)
      return []
    }
    const data = await response.json()
    return data.events || []
  } catch (error) {
    console.error('[EventClient] Error fetching events:', error)
    return []
  }
}
