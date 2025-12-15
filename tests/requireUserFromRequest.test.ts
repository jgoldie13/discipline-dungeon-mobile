import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireAuthUserId = vi.fn()
vi.mock('../lib/supabase/auth', () => ({ requireAuthUserId }))

const createClient = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient }))

const { requireUserFromRequest } = await import('../lib/supabase/requireUser')

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'
})

describe('requireUserFromRequest', () => {
  it('prefers cookie session (requireAuthUserId success)', async () => {
    requireAuthUserId.mockResolvedValueOnce('user_cookie')

    const userId = await requireUserFromRequest(new Request('http://localhost/test'))

    expect(userId).toBe('user_cookie')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('falls back to Bearer token when cookie auth is missing', async () => {
    requireAuthUserId.mockRejectedValueOnce(new Error('Unauthorized'))

    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user_bearer' } },
      error: null,
    })

    createClient.mockReturnValueOnce({ auth: { getUser } })

    const userId = await requireUserFromRequest(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer token123' },
      })
    )

    expect(userId).toBe('user_bearer')
    expect(getUser).toHaveBeenCalledWith('token123')
  })

  it('rejects invalid Bearer token', async () => {
    requireAuthUserId.mockRejectedValueOnce(new Error('Unauthorized'))

    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'bad token' },
    })

    createClient.mockReturnValueOnce({ auth: { getUser } })

    await expect(
      requireUserFromRequest(
        new Request('http://localhost/test', {
          headers: { Authorization: 'Bearer token123' },
        })
      )
    ).rejects.toThrow('Unauthorized')
  })
})

