/**
 * Simple in-memory rate limiter for API endpoints
 * TODO: Replace with durable store (Redis/Upstash) for production at scale
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of store.entries()) {
    if (record.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /**
   * Maximum requests allowed in the window
   */
  maxRequests: number
  /**
   * Time window in milliseconds (default: 60000ms = 1 minute)
   */
  windowMs?: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Check and increment rate limit for a given identifier
 * @param identifier - Unique key (e.g., "userId:route" or IP address)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const windowMs = config.windowMs || 60000 // 1 minute default
  const now = Date.now()

  let record = store.get(identifier)

  // Reset if window expired or doesn't exist
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + windowMs,
    }
    store.set(identifier, record)
  }

  // Check if over limit
  if (record.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  // Increment and allow
  record.count++
  store.set(identifier, record)

  return {
    success: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Helper to get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  }
}
