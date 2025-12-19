const DEFAULT_TASK_TYPE_EMOJI: Record<string, string> = {
  exposure: '🎯',
  job_search: '💼',
  habit: '🔄',
  boss: '⚔️',
  other: '📋',
}

const FALLBACK_EMOJIS = [
  '🗺️',
  '📜',
  '🧭',
  '🕯️',
  '🧪',
  '🧠',
  '🛡️',
  '🗝️',
  '🏹',
  '🪶',
  '⚒️',
  '📘',
]

function hashSeed(seed: string): number {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  }
  return hash
}

export function getDefaultTaskTypeEmoji(params: {
  key?: string | null
  name?: string | null
}): string {
  const normalizedKey = params.key?.trim().toLowerCase() ?? ''
  if (normalizedKey && DEFAULT_TASK_TYPE_EMOJI[normalizedKey]) {
    return DEFAULT_TASK_TYPE_EMOJI[normalizedKey]
  }

  const seed = (params.name || params.key || '').trim().toLowerCase()
  if (!seed) return DEFAULT_TASK_TYPE_EMOJI.other

  const index = hashSeed(seed) % FALLBACK_EMOJIS.length
  return FALLBACK_EMOJIS[index]
}

export function resolveTaskTypeEmoji(params: {
  emoji?: string | null
  key?: string | null
  name?: string | null
}): string {
  const trimmed = typeof params.emoji === 'string' ? params.emoji.trim() : ''
  if (trimmed) return trimmed
  return getDefaultTaskTypeEmoji({ key: params.key, name: params.name })
}

export { DEFAULT_TASK_TYPE_EMOJI }
