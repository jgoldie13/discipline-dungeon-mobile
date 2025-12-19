'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PillBadge } from '@/components/ui/PillBadge'
import { createClient } from '@/lib/supabase/client'

export function LoginClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const nextPath = useMemo(() => searchParams.get('next') ?? '/mobile', [searchParams])
  const urlError = useMemo(() => searchParams.get('error'), [searchParams])

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (urlError === 'auth_failed') {
      setMessage({ type: 'error', text: 'Authentication failed. Please try again.' })
    }
  }, [urlError])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setLoading(true)
      setMessage(null)

      const supabase = createClient()

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          setMessage({ type: 'error', text: error.message })
          setLoading(false)
          return
        }

        router.push(nextPath)
        router.refresh()
        return
      }

      // Sign up (email confirmation is ON, so session may be null until the user confirms)
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
        return
      }

      if (!data.session) {
        setMessage({
          type: 'success',
          text: 'Check your email to confirm your account, then sign in.',
        })
        setMode('signin')
        setLoading(false)
        return
      }

      router.push(nextPath)
      router.refresh()
    },
    [email, mode, nextPath, password, router]
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-3">
          <PillBadge className="bg-slate-900/60 text-slate-200 border-white/10">
            Discipline Dungeon
          </PillBadge>
          <h1 className="text-3xl font-serif uppercase tracking-widest text-mana">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-base text-slate-300">
            {mode === 'signin'
              ? 'Sign in with your email and password.'
              : 'Sign up with email and password (email confirmation required).'}
          </p>
        </div>

        <Card className="scroll-card p-6">
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={mode === 'signin' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('signin')}
              disabled={loading}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant={mode === 'signup' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('signup')}
              disabled={loading}
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-left">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-[--radius-lg] bg-slate-900/10 border border-slate-900/20 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-mana/50"
              />
            </div>

            <div className="text-left">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-[--radius-lg] bg-slate-900/10 border border-slate-900/20 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-mana/50"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? 'Working...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-[--radius-lg] text-sm ${
                message.type === 'success'
                  ? 'bg-mana/10 text-mana border border-mana/30'
                  : 'bg-blood/10 text-blood border border-blood/30'
              }`}
            >
              {message.text}
            </div>
          )}
        </Card>

        <p className="text-xs text-slate-300">
          {mode === 'signup'
            ? 'Email confirmation is required before you can sign in.'
            : 'New here? Use “Sign Up” to create an account.'}
        </p>
      </div>
    </div>
  )
}
