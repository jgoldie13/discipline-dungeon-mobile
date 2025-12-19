import { Suspense } from 'react'
import { LoginClient } from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
          <div className="text-sm text-slate-400">Loading…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  )
}
