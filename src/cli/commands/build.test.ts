import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSafeOutDir } from './build.js'

describe('assertSafeOutDir', () => {
  const project = path.resolve('/work/blog')

  it('accepts a separate folder', () => {
    expect(() => assertSafeOutDir(project, path.join(project, 'dist'))).not.toThrow()
    expect(() => assertSafeOutDir(project, path.resolve('/tmp/out'))).not.toThrow()
  })

  it('refuses the project, its parents and its source folders', () => {
    for (const out of [
      project,
      path.dirname(project),
      path.join(project, 'content'),
      path.join(project, 'asset/images'),
    ]) {
      expect(() => assertSafeOutDir(project, out), out).toThrow(/would delete/)
    }
  })
})
