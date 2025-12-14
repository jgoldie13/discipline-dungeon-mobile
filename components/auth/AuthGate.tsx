'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * AuthGate (client-side)
 * - Use on client pages/components that should only render for authenticated users.
 * - Redirects to `/login?next=...` when unauthenticated.
 *
 * Server-side protection should still be enforced via middleware / server checks.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const redirectToLogin = () => {
      const next = pathname || '/mobile'
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    }

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMounted) return
        if (!data.user) redirectToLogin()
      })
      .finally(() => {
        if (!isMounted) return
        setChecked(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) redirectToLogin()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [pathname, router])

  if (!checked) return null
  return children
}

