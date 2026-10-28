import { describe, expect, it } from 'vitest'
import { resolveInitOptions, toKebabCase } from './init.js'
import { CliError } from '../error.js'

describe('toKebabCase', () => {
  it('converts names to directory names', () => {
    expect(toKebabCase('My Blog')).toBe('my-blog')
    expect(toKebabCase('  Hello__World  ')).toBe('hello-world')
    expect(toKebabCase('中文博客')).toBeNull()
  })
})

describe('resolveInitOptions', () => {
  it('fills defaults from the directory', () => {
    expect(resolveInitOptions('my-blog', {})).toEqual({
      name: 'my-blog',
      directory: 'my-blog',
      description: '',
      theme: 'clean',
      defaultLanguage: 'en',
      additionalLanguages: [],
    })
  })

  it('derives the directory from the name', () => {
    const options = resolveInitOptions(undefined, {
      name: 'My Blog',
      lang: 'zh',
      langs: 'en, ja',
      theme: 'wabi',
    })
    expect(options).toMatchObject({
      directory: 'my-blog',
      defaultLanguage: 'zh',
      additionalLanguages: ['en', 'ja'],
      theme: 'wabi',
    })
  })

  it('rejects missing name and directory', () => {
    expect(() => resolveInitOptions(undefined, {})).toThrow(CliError)
  })

  it('rejects names that cannot become a directory', () => {
    expect(() => resolveInitOptions(undefined, { name: '中文博客' })).toThrow(/directory/)
  })

  it('rejects unknown themes and languages with the expected values', () => {
    try {
      resolveInitOptions('x-blog', { theme: 'dark' })
      expect.unreachable()
    } catch (err) {
      expect((err as CliError).details.expected).toContain('clean')
    }
    expect(() => resolveInitOptions('x-blog', { langs: 'zh,xx' })).toThrow(/Unknown language/)
  })

  it('rejects invalid directory names', () => {
    expect(() => resolveInitOptions('My Blog', {})).toThrow(/Invalid directory/)
  })
})
