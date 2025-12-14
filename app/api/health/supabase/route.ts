import { NextResponse } from 'next/server'

function getProjectInfo(url: string) {
  const host = new URL(url).host
  const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i)
  const projectRef = match?.[1] ?? null
  return { host, projectRef }
}

// GET /api/health/supabase
// Verifies Supabase env vars are present server-side (no secrets returned).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing: string[] = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return NextResponse.json(
      {
        ok: false,
        error: 'Supabase env vars missing on server',
        missing,
      },
      { status: 500 }
    )
  }

  try {
    const info = getProjectInfo(url)
    return NextResponse.json({
      ok: true,
      supabase: info,
    })
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Invalid NEXT_PUBLIC_SUPABASE_URL',
      },
      { status: 500 }
    )
  }
}
