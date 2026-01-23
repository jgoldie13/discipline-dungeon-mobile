export function calculateElapsedMinutes(startTime: Date, endTime: Date): number {
  const elapsedMs = endTime.getTime() - startTime.getTime()
  if (elapsedMs <= 0) return 0
  return Math.floor(elapsedMs / 60000)
}

export function calculateAwardedMinutes(
  startTime: Date,
  endTime: Date,
  plannedDurationMin: number
) {
  const elapsedMin = calculateElapsedMinutes(startTime, endTime)
  const awardMin = Math.max(0, Math.min(elapsedMin, plannedDurationMin))
  return { elapsedMin, awardMin }
}
