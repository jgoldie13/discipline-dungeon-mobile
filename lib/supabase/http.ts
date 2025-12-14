/**
 * Small helpers for consistent API route error handling.
 */

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized'
}

