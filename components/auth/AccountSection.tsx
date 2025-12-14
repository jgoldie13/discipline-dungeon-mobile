'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AccountSection() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    let isMounted = true

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!isMounted) return
        if (error) {
          setError(error.message)
          setEmail(null)
        } else {
          setEmail(data.user?.email ?? null)
        }
      })
      .finally(() => {
        if (!isMounted) return
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    setSigningOut(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/login')
    router.refresh()
  }, [router])

  return (
    <div className="bg-green-900/30 border border-green-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Account</h2>
          <p className="text-xs text-green-300 mt-1">
            {loading ? 'Loading…' : email ? `Signed in as ${email}` : 'Not signed in'}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut || !email}
          className="px-4 py-2 rounded-lg font-semibold transition-all bg-green-900/50 border border-green-500/30 hover:border-green-500/60 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>

      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  )
}

