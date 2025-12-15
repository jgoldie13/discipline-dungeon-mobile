import { describe, expect, it } from 'vitest'
import crypto from 'node:crypto'

import { decrypt, encrypt } from '../lib/crypto'

describe('crypto', () => {
  it('roundtrips (encrypt -> decrypt)', () => {
    process.env.APP_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    const plaintext = 'super-secret-api-key'
    const enc = encrypt(plaintext)
    const dec = decrypt(enc)
    expect(dec).toBe(plaintext)
  })
})

