'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PillBadge } from '@/components/ui/PillBadge'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    // Dynamic import to avoid SSR issues during build
    const { createClient } = await import('@/lib/supabase/browser')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({
        type: 'success',
        text: 'Check your email for a magic link to sign in.',
      })
    }

    setLoading(false)
  }, [email])

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-3">
          <PillBadge variant="muted">Discipline Dungeon</PillBadge>
          <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
          <p className="text-base text-muted">
            Enter your email to receive a magic link.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label htmlFor="email" className="block text-sm font-medium text-muted mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-[--radius-lg] bg-surface-2 border border-border text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-[--radius-lg] text-sm ${
                message.type === 'success'
                  ? 'bg-positive/10 text-positive border border-positive/30'
                  : 'bg-negative/10 text-negative border border-negative/30'
              }`}
            >
              {message.text}
            </div>
          )}
        </Card>

        <p className="text-xs text-muted">
          No password required. We&apos;ll send you a secure link.
        </p>
      </div>
    </div>
  )
}
