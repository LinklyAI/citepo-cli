import { describe, expect, it } from 'vitest'
import { displayWidth, formatSize, renderTable } from './output.js'
import { renderError } from './run.js'
import { CliError, toErrorDetails } from './error.js'
import { ZodError } from 'zod'

describe('displayWidth', () => {
  it('counts CJK characters as two columns and ignores ANSI codes', () => {
    expect(displayWidth('abc')).toBe(3)
    expect(displayWidth('中文')).toBe(4)
    expect(displayWidth('\x1b[32mok\x1b[39m')).toBe(2)
  })
})

describe('renderTable', () => {
  it('aligns columns by display width', () => {
    const table = renderTable(
      ['Lang', 'Title'],
      [
        ['zh', '你好'],
        ['en', 'Hello'],
      ],
    )
    const lines = table.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('  zh    你好')
    expect(lines[2]).toBe('  en    Hello')
  })
})

describe('formatSize', () => {
  it('uses the largest fitting unit', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('toErrorDetails', () => {
  it('keeps CliError details', () => {
    const err = new CliError({ code: 'x', message: 'boom', hint: 'do y' })
    expect(toErrorDetails(err)).toEqual({ code: 'x', message: 'boom', hint: 'do y' })
  })

  it('maps a missing blog.json to config_not_found with a hint', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT', path: '/tmp/x/blog.json' })
    const details = toErrorDetails(err)
    expect(details.code).toBe('config_not_found')
    expect(details.hint).toContain('citepo init')
  })

  it('maps zod issues to config_invalid', () => {
    const err = new ZodError([{ code: 'custom', path: ['name'], message: 'name is required' }])
    expect(toErrorDetails(err)).toMatchObject({ code: 'config_invalid', file: 'blog.json' })
  })
})

describe('renderError', () => {
  it('shows location, expectation and hint', () => {
    const text = renderError({
      code: 'x',
      message: 'Bad',
      file: 'a.mdx',
      line: 3,
      expected: 'a date',
      hint: 'fix it',
    })
    expect(text).toContain('a.mdx:3')
    expect(text).toContain('a date')
    expect(text).toContain('fix it')
  })
})
