'use client'

export async function fetchUserStats(init: RequestInit = {}) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const headers = new Headers(init.headers)

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }

  if (timezone) {
    headers.set('x-user-timezone', timezone)
  }

  return fetch('/api/user/stats', {
    ...init,
    cache: init.cache ?? 'no-store',
    headers,
  })
}
