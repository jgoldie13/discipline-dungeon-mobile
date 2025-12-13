/**
 * Next.js Middleware
 * Handles auth token refresh and route protection
 */

import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that should redirect to login if not authenticated
const protectedRoutes = ['/mobile', '/tasks', '/phone', '/build', '/ledger', '/boss', '/sleep', '/protocol', '/stakes']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Check if Supabase is configured
  const supabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // If Supabase is not configured, skip all auth enforcement
  if (!supabaseConfigured) {
    return supabaseResponse
  }

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
