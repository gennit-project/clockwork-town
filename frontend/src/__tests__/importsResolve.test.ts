import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every relative import in the frontend must point at a file that exists.
 *
 * vue-tsc can't check this for `.vue` files (the type shim accepts any `*.vue` path) and the
 * unit tests don't load every view, so a deleted component that another view still imports
 * only blows up when someone opens that page in the browser.
 */
const ROOT = resolve(__dirname, '..')
const EXTENSIONS = ['', '.ts', '.vue', '.js', '.mjs', '.json', '/index.ts', '/index.vue', '/index.js']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(path)
    return /\.(vue|ts)$/.test(name) ? [path] : []
  })
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)|import\s+['"](\.{1,2}\/[^'"]+)['"]/g

function resolves(base: string): boolean {
  return EXTENSIONS.some((ext) => existsSync(base + ext) && statSync(base + ext).isFile())
}

/** Relative imports, across every .vue and .ts file, that point at nothing. */
export function findMissingImports(root: string): string[] {
  const missing: string[] = []
  for (const file of sourceFiles(root)) {
    const code = readFileSync(file, 'utf8')
    for (const match of code.matchAll(IMPORT_RE)) {
      const specifier = match[1] ?? match[2] ?? match[3]
      if (!resolves(resolve(dirname(file), specifier))) {
        missing.push(`${file.slice(root.length + 1)} -> ${specifier}`)
      }
    }
  }
  return missing
}

describe('frontend imports', () => {
  it('every relative import resolves to a real file', () => {
    expect(findMissingImports(ROOT)).toEqual([])
  })

  it('actually finds files (the scan is not vacuous)', () => {
    expect(sourceFiles(ROOT).length).toBeGreaterThan(50)
    expect(resolves(resolve(ROOT, 'components/Panel'))).toBe(true)
    expect(resolves(resolve(ROOT, 'components/charts/DoesNotExist'))).toBe(false)
  })
})
