import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regression test: every backend route is mounted under /api in app.js, so a
 * request that forgets the prefix silently returns 404 "Ruta no encontrada".
 * This caught a real bug where the login/register calls were missing it.
 */
const SRC = new URL('../', import.meta.url).pathname

const collectFiles = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc)
    } else if (/\.(jsx?|tsx?)$/.test(entry) && !/\.test\./.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

describe('API route prefix', () => {
  const files = collectFiles(SRC)
  const offenders = []

  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const relative = file.replace(SRC, '')

    // Match api.get('/...'), api.post('/...') etc. with a static URL.
    const calls = content.matchAll(/api\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)

    for (const [, method, url] of calls) {
      if (!url.startsWith('/')) {
        offenders.push(`${relative}: ${method}('${url}') no es una ruta absoluta`)
      } else if (!url.startsWith('/api/')) {
        offenders.push(`${relative}: ${method}('${url}') le falta el prefijo /api`)
      }
    }
  }

  it('no source file calls the API without the /api prefix', () => {
    expect(offenders).toEqual([])
  })

  it('actually inspects the source files (guard against a broken glob)', () => {
    expect(files.length).toBeGreaterThan(5)
  })
})