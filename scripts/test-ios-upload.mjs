#!/usr/bin/env node
/**
 * Minimal smoke test for the iOS companion upload endpoint.
 *
 * Usage:
 *   BASE_URL=http://localhost:3002 ACCESS_TOKEN=... DATE=2025-01-02 MINUTES=42 node scripts/test-ios-upload.mjs
 *
 * Or args:
 *   node scripts/test-ios-upload.mjs --baseUrl http://localhost:3002 --accessToken ... --date 2025-01-02 --minutes 42
 */

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const value = argv[i + 1]
    args[name] = value
    i++
  }
  return args
}

const args = parseArgs(process.argv)

const baseUrl = args.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:3002'
const accessToken = args.accessToken ?? process.env.ACCESS_TOKEN
const date = args.date ?? process.env.DATE
const minutesRaw = args.minutes ?? process.env.MINUTES

if (!accessToken) {
  console.error('Missing ACCESS_TOKEN (or --accessToken).')
  process.exit(1)
}
if (!date) {
  console.error('Missing DATE (YYYY-MM-DD).')
  process.exit(1)
}
if (!minutesRaw) {
  console.error('Missing MINUTES.')
  process.exit(1)
}

const verifiedMinutes = Number(minutesRaw)
if (!Number.isFinite(verifiedMinutes)) {
  console.error('MINUTES must be a number.')
  process.exit(1)
}

const url = `${baseUrl.replace(/\\/$/, '')}/api/verification/ios/upload`

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  body: JSON.stringify({
    date,
    verifiedMinutes,
    raw: {
      client: 'scripts/test-ios-upload.mjs',
      ts: new Date().toISOString(),
    },
  }),
})

const text = await res.text()
let json = null
try {
  json = JSON.parse(text)
} catch {
  // noop
}

if (!res.ok) {
  console.error(`HTTP ${res.status} ${res.statusText}`)
  console.error(json ?? text)
  process.exit(1)
}

console.log(JSON.stringify(json ?? text, null, 2))

