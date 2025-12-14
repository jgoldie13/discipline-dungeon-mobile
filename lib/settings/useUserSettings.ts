'use client'

import { useCallback, useEffect, useState } from 'react'
import type { UserSettingsV1 } from '@/lib/policy/settings.schema'

type State = {
  settings: UserSettingsV1 | null
  isLoading: boolean
  error: string | null
  saveSettings: (next: UserSettingsV1) => Promise<void>
  reload: () => Promise<void>
}

export function useUserSettings(): State {
  const [settings, setSettings] = useState<UserSettingsV1 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      setSettings(data.settings as UserSettingsV1)
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const saveSettings = useCallback(
    async (next: UserSettingsV1) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: next }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Failed to save settings')
        }
        const data = await res.json()
        setSettings(data.settings as UserSettingsV1)
      } catch (err: any) {
        setError(err?.message || 'Failed to save settings')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    reload: load,
  }
}
