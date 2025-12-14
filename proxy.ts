/**
 * Next.js Proxy (formerly middleware.ts)
 * Handles auth token refresh and route protection
 */

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that should redirect to login if not authenticated
const protectedRoutes = [
  '/mobile',
  '/tasks',
  '/phone',
  '/build',
  '/ledger',
  '/boss',
  '/sleep',
  '/protocol',
  '/stakes',
  '/settings',
]

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
}

function applyNoStoreHeaders(response: NextResponse) {
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) response.headers.set(k, v)
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if Supabase is configured
  const supabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  // If Supabase is not configured:
  // - In production: fail loudly (misconfigured deploy should not silently run unauthenticated)
  // - In dev: allow requests through (local dev without Supabase)
  if (!supabaseConfigured) {
    if (isProduction) {
      // Allow the health endpoint to report missing variables (instead of being intercepted here).
      if (pathname === '/api/health/supabase' || pathname.startsWith('/api/health/supabase/')) {
        return NextResponse.next()
      }

      const message =
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      if (pathname.startsWith('/api/')) {
        return applyNoStoreHeaders(NextResponse.json({ ok: false, error: message }, { status: 500 }))
      }
      return applyNoStoreHeaders(new NextResponse(message, { status: 500 }))
    }
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Defense-in-depth: never allow caching of any API response, even if a route forgets.
  if (pathname.startsWith('/api/')) {
    applyNoStoreHeaders(supabaseResponse)
  }

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // For protected routes, redirect to login if not authenticated
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return applyNoStoreHeaders(NextResponse.redirect(loginUrl))
  }

  // If user is logged in and visits login page, redirect to mobile
  if (pathname === '/login' && user) {
    return applyNoStoreHeaders(NextResponse.redirect(new URL('/mobile', request.url)))
  }

  // If user visits root and is logged in, redirect to mobile
  if (pathname === '/' && user) {
    return applyNoStoreHeaders(NextResponse.redirect(new URL('/mobile', request.url)))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
