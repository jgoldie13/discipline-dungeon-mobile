import { Suspense } from 'react'
import { LoginClient } from './LoginClient'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent text-dd-text flex items-center justify-center p-6">
          <div className="text-sm text-dd-muted">Loading…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  )
}
