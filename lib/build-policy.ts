import type { Task, Urge } from '@prisma/client'

type TaskWithDuration = Pick<Task, 'type' | 'durationMin'>

export function pointsForTask(task: TaskWithDuration, xpEarned: number) {
  const base = 20
  const durationBonus = task.durationMin ? Math.round(task.durationMin / 5) : 0
  const xpBonus = Math.max(0, Math.round(xpEarned / 5))
  return base + durationBonus + xpBonus
}

export function pointsForUrge(urge: Partial<Urge>) {
  // Reward resisting + completing a micro-task a bit more
  const base = 12
  const completionBonus = urge.completed ? 6 : 0
  return base + completionBonus
}

export function pointsForPhoneBlock(durationMin: number) {
  // 1 point per minute, capped for sanity in a single chunk
  return Math.max(1, Math.min(durationMin, 240))
}
