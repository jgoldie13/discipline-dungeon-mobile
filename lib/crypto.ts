import crypto from 'node:crypto'

const KEY_BYTES = 32
const IV_BYTES = 12 // recommended for GCM

function getKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'Missing APP_ENCRYPTION_KEY (expected base64-encoded 32 bytes)'
    )
  }

  let key: Buffer
  try {
    key = Buffer.from(raw, 'base64')
  } catch {
    throw new Error('Invalid APP_ENCRYPTION_KEY (must be base64)')
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `Invalid APP_ENCRYPTION_KEY length: got ${key.length} bytes, expected ${KEY_BYTES}`
    )
  }

  return key
}

/**
 * Encrypt a UTF-8 string using AES-256-GCM.
 * Output format: v1:<iv_b64>:<tag_b64>:<cipher_b64>
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString(
    'base64'
  )}`
}

export function decrypt(payload: string): string {
  const key = getKey()
  const [version, ivB64, tagB64, cipherB64] = payload.split(':')
  if (version !== 'v1' || !ivB64 || !tagB64 || !cipherB64) {
    throw new Error('Invalid encrypted payload format')
  }

  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(cipherB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

