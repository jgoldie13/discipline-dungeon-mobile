#!/usr/bin/env node
/**
 * Smoke test for Dragon Attack + auto-repair system.
 *
 * Usage:
 *   BASE_URL=http://localhost:3002 ACCESS_TOKEN=... DATABASE_URL=... node scripts/smoke-dragon-system.mjs
 *
 * Optional args:
 *   --baseUrl http://localhost:3002 --accessToken ... --databaseUrl ...
 */

import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const name = key.slice(2)
    const value = argv[i + 1]
    args[name] = value
    i += 1
  }
  return args
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function decodeUserId(accessToken) {
  const parts = accessToken.split('.')
  if (parts.length < 2) {
    throw new Error('ACCESS_TOKEN does not look like a JWT.')
  }
  const payload = JSON.parse(base64UrlDecode(parts[1]))
  if (!payload?.sub) {
    throw new Error('ACCESS_TOKEN missing sub claim.')
  }
  return payload.sub
}

function startOfDayLocal(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function jsonFetch(url, { method = 'GET', accessToken, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${JSON.stringify(json ?? text)}`)
  }
  return json ?? text
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function ensureBlueprintSeed(prisma, userId) {
  const blueprintPath = path.join(process.cwd(), 'public', 'blueprints', 'cathedral_cologne_v1.json')
  const raw = fs.readFileSync(blueprintPath, 'utf-8')
  const blueprint = JSON.parse(raw)
  const sortedSegments = [...blueprint.segments].sort((a, b) => a.order - b.order)

  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {},
  })

  await Promise.all(
    sortedSegments.map((segment) =>
      prisma.blueprintSegment.upsert({
        where: {
          blueprintId_segmentKey: {
            blueprintId: blueprint.id,
            segmentKey: segment.key,
          },
        },
        create: {
          blueprintId: blueprint.id,
          segmentKey: segment.key,
          label: segment.label,
          cost: segment.cost,
          phase: segment.phase,
          orderIndex: segment.order,
        },
        update: {
          label: segment.label,
          cost: segment.cost,
          phase: segment.phase,
          orderIndex: segment.order,
        },
      })
    )
  )

  const project = await prisma.userProject.upsert({
    where: { userId_blueprintId: { userId, blueprintId: blueprint.id } },
    create: { userId, blueprintId: blueprint.id, active: true },
    update: { active: true },
  })

  const existingProgress = await prisma.userProjectProgress.findFirst({
    where: { userProjectId: project.id, pointsApplied: { gt: 0 } },
  })

  if (!existingProgress) {
    const first = sortedSegments[0]
    const seedPoints = Math.min(first.cost, 120)

    const progress = await prisma.userProjectProgress.upsert({
      where: { userProjectId_segmentKey: { userProjectId: project.id, segmentKey: first.key } },
      create: {
        userProjectId: project.id,
        blueprintId: blueprint.id,
        segmentKey: first.key,
        pointsApplied: seedPoints,
      },
      update: { pointsApplied: seedPoints },
    })

    const seedKey = `dragon_smoke_seed::${userId}`
    const existingSeed = await prisma.buildEvent.findUnique({ where: { dedupeKey: seedKey } })
    if (!existingSeed) {
      await prisma.buildEvent.create({
        data: {
          userProjectId: project.id,
          userId,
          blueprintId: blueprint.id,
          points: seedPoints,
          sourceType: 'SMOKE_TEST_SEED',
          dedupeKey: seedKey,
          allocations: [
            {
              segmentKey: first.key,
              applied: seedPoints,
              total: progress.pointsApplied,
              completed: progress.pointsApplied >= first.cost,
              cost: first.cost,
            },
          ],
          notes: 'Seed build points for dragon smoke test.',
        },
      })
    }
  }

  return { blueprintId: blueprint.id, segments: sortedSegments }
}

async function countAttacks(prisma, userId, triggerType, start, end) {
  return prisma.dragonAttack.count({
    where: {
      userId,
      triggerType,
      createdAt: { gte: start, lt: end },
    },
  })
}

async function countBuildEvents(prisma, userId, sourceType, start, end) {
  return prisma.buildEvent.count({
    where: {
      userId,
      sourceType,
      createdAt: { gte: start, lt: end },
    },
  })
}

async function clearStreakHistory(prisma, userId, date) {
  const start = startOfDayLocal(date)
  const end = addDays(start, 1)
  await prisma.streakHistory.deleteMany({
    where: { userId, date: { gte: start, lt: end } },
  })
}

const args = parseArgs(process.argv)

const baseUrl = args.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:3002'
const accessToken = args.accessToken ?? process.env.ACCESS_TOKEN
const databaseUrl = args.databaseUrl ?? process.env.DATABASE_URL

if (!accessToken) {
  console.error('Missing ACCESS_TOKEN (or --accessToken).')
  process.exit(1)
}
if (!databaseUrl) {
  console.error('Missing DATABASE_URL (or --databaseUrl).')
  process.exit(1)
}

process.env.DATABASE_URL = databaseUrl

const userId = decodeUserId(accessToken)
const prisma = new PrismaClient()

const now = new Date()
const todayStart = startOfDayLocal(now)
const todayEnd = addDays(todayStart, 1)
const dateKey = now.toISOString().slice(0, 10)

const yesterday = addDays(todayStart, -1)

console.log(`Using userId: ${userId}`)
console.log(`Testing date: ${dateKey}`)

try {
  await ensureBlueprintSeed(prisma, userId)

  const baseline = {
    violation: await countAttacks(prisma, userId, 'violation', todayStart, todayEnd),
    truth: await countAttacks(prisma, userId, 'truth_mismatch', todayStart, todayEnd),
    streak: await countAttacks(prisma, userId, 'streak_break', todayStart, todayEnd),
    attackEvents: await countBuildEvents(prisma, userId, 'DRAGON_ATTACK', todayStart, todayEnd),
    repairEvents: await countBuildEvents(prisma, userId, 'DRAGON_REPAIR', todayStart, todayEnd),
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: 3,
      lastStreakDate: yesterday,
    },
  })

  await clearStreakHistory(prisma, userId, todayStart)

  await jsonFetch(`${baseUrl.replace(/\\/$/, '')}/api/phone/log`, {
    method: 'POST',
    accessToken,
    body: {
      minutes: 140,
      limit: 30,
    },
  })

  const afterViolation = {
    violation: await countAttacks(prisma, userId, 'violation', todayStart, todayEnd),
    streak: await countAttacks(prisma, userId, 'streak_break', todayStart, todayEnd),
    attackEvents: await countBuildEvents(prisma, userId, 'DRAGON_ATTACK', todayStart, todayEnd),
  }

  assert(
    afterViolation.violation === baseline.violation + 1,
    'Usage violation did not create exactly one DragonAttack.'
  )
  assert(
    afterViolation.streak === baseline.streak + 1,
    'Streak break did not create exactly one DragonAttack.'
  )
  assert(
    afterViolation.attackEvents >= baseline.attackEvents + 2,
    'Dragon attacks did not create expected BuildEvents.'
  )

  const negativeAttack = await prisma.buildEvent.findFirst({
    where: {
      userId,
      sourceType: 'DRAGON_ATTACK',
      points: { lt: 0 },
      createdAt: { gte: todayStart, lt: todayEnd },
    },
  })
  assert(negativeAttack, 'No negative BuildEvent recorded for dragon attack.')

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: 3,
      lastStreakDate: yesterday,
    },
  })
  await clearStreakHistory(prisma, userId, todayStart)

  await jsonFetch(`${baseUrl.replace(/\\/$/, '')}/api/phone/log`, {
    method: 'POST',
    accessToken,
    body: {
      minutes: 140,
      limit: 30,
    },
  })

  const afterDuplicateViolation = {
    violation: await countAttacks(prisma, userId, 'violation', todayStart, todayEnd),
    streak: await countAttacks(prisma, userId, 'streak_break', todayStart, todayEnd),
    attackEvents: await countBuildEvents(prisma, userId, 'DRAGON_ATTACK', todayStart, todayEnd),
  }

  assert(
    afterDuplicateViolation.violation === afterViolation.violation,
    'Usage violation dedupe failed (DragonAttack duplicated).'
  )
  assert(
    afterDuplicateViolation.streak === afterViolation.streak,
    'Streak break dedupe failed (DragonAttack duplicated).'
  )
  assert(
    afterDuplicateViolation.attackEvents === afterViolation.attackEvents,
    'Dragon attack BuildEvents duplicated on rerun.'
  )

  await jsonFetch(`${baseUrl.replace(/\\/$/, '')}/api/verification/ios/upload`, {
    method: 'POST',
    accessToken,
    body: {
      date: dateKey,
      verifiedMinutes: 10,
      raw: { client: 'scripts/smoke-dragon-system.mjs' },
    },
  })

  const afterTruth = await countAttacks(prisma, userId, 'truth_mismatch', todayStart, todayEnd)
  assert(afterTruth === baseline.truth + 1, 'Truth mismatch did not create DragonAttack.')

  await jsonFetch(`${baseUrl.replace(/\\/$/, '')}/api/verification/ios/upload`, {
    method: 'POST',
    accessToken,
    body: {
      date: dateKey,
      verifiedMinutes: 10,
      raw: { client: 'scripts/smoke-dragon-system.mjs', rerun: true },
    },
  })

  const afterTruthDuplicate = await countAttacks(prisma, userId, 'truth_mismatch', todayStart, todayEnd)
  assert(afterTruthDuplicate === afterTruth, 'Truth mismatch dedupe failed.')

  await prisma.iosScreenTimeConnection.upsert({
    where: { userId },
    create: { userId, enabled: false, timezone: 'UTC' },
    update: { enabled: false },
  })

  const yesterdayStart = startOfDayLocal(yesterday)
  const yesterdayEnd = addDays(yesterdayStart, 1)

  await prisma.usageViolation.deleteMany({
    where: { userId, date: { gte: yesterdayStart, lt: yesterdayEnd } },
  })
  await prisma.truthViolation.deleteMany({
    where: { userId, date: yesterdayStart },
  })
  await prisma.streakHistory.deleteMany({
    where: { userId, date: { gte: yesterdayStart, lt: yesterdayEnd } },
  })

  await prisma.streakHistory.create({
    data: {
      userId,
      date: yesterdayStart,
      streakCount: 2,
      broken: false,
      underLimit: true,
      violationCount: 0,
    },
  })

  await clearStreakHistory(prisma, userId, todayStart)

  await jsonFetch(`${baseUrl.replace(/\\/$/, '')}/api/phone/log`, {
    method: 'POST',
    accessToken,
    body: {
      minutes: 20,
      limit: 30,
    },
  })

  const afterRepair = await countBuildEvents(prisma, userId, 'DRAGON_REPAIR', todayStart, todayEnd)
  assert(
    afterRepair === baseline.repairEvents + 1,
    'Perfect-day repair did not create DRAGON_REPAIR BuildEvent.'
  )

  await clearStreakHistory(prisma, userId, todayStart)
  await jsonFetch(`${baseUrl.replace(/\\/$/, '')}/api/phone/log`, {
    method: 'POST',
    accessToken,
    body: {
      minutes: 20,
      limit: 30,
    },
  })

  const afterRepairDuplicate = await countBuildEvents(prisma, userId, 'DRAGON_REPAIR', todayStart, todayEnd)
  assert(afterRepairDuplicate === afterRepair, 'Repair dedupe failed.')

  console.log('PASS: Dragon system smoke tests complete.')
  process.exit(0)
} catch (error) {
  console.error('FAIL: Dragon system smoke tests failed.')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
