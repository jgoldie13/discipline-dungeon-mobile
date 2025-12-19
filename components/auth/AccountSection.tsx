'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '../ui/Button'

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
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-serif uppercase tracking-widest text-mana">
            Account
          </h2>
          <p className="text-xs text-slate-200/70 mt-1">
            {loading ? 'Loading…' : email ? `Signed in as ${email}` : 'Not signed in'}
          </p>
        </div>

        <Button
          onClick={handleSignOut}
          disabled={signingOut || !email}
          variant="destructive"
          size="sm"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>

      {error && <p className="text-xs text-blood mt-2">{error}</p>}
    </div>
  )
}
