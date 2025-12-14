/**
 * Next.js Middleware
 * Handles auth token refresh and route protection
 */

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that should redirect to login if not authenticated
const protectedRoutes = ['/mobile', '/tasks', '/phone', '/build', '/ledger', '/boss', '/sleep', '/protocol', '/stakes', '/settings']

export async function middleware(request: NextRequest) {
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
        return NextResponse.json({ ok: false, error: message }, { status: 500 })
      }
      return new NextResponse(message, { status: 500 })
    }
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Check if this is a protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // For protected routes, redirect to login if not authenticated
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is logged in and visits login page, redirect to mobile
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/mobile', request.url))
  }

  // If user visits root and is logged in, redirect to mobile
  if (pathname === '/' && user) {
    return NextResponse.redirect(new URL('/mobile', request.url))
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
