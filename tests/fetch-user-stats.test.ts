import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(__dirname, '..')
const SEARCH_DIRS = ['app', 'components', 'hooks', 'lib']
const ALLOWED = new Set([
  path.join(ROOT, 'lib/client/fetchUserStats.ts'),
  path.join(ROOT, 'app/api/user/stats/route.ts'),
])

function walk(dir: string, files: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
    } else if (entry.isFile()) {
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }
}

describe('stats fetch usage', () => {
  it('centralizes /api/user/stats fetch in helper', () => {
    const files: string[] = []
    for (const dir of SEARCH_DIRS) {
      walk(path.join(ROOT, dir), files)
    }

    const offenders = files.filter((file) => {
      if (ALLOWED.has(file)) return false
      const content = fs.readFileSync(file, 'utf8')
      return content.includes('/api/user/stats')
    })

    expect(offenders).toEqual([])
  })
})
