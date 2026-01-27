import { describe, it, expect } from 'vitest'
import { parseFrontmatter, parseValue, detectLang } from './content.js'

describe('parseFrontmatter', () => {
  it('should parse standard frontmatter', () => {
    const raw = `---
title: Hello World
date: 2025-01-01
tags: [tech, blog]
---

This is the content.`

    const result = parseFrontmatter(raw)
    expect(result).toBeDefined()
    expect(result!.frontmatter.title).toBe('Hello World')
    expect(result!.frontmatter.date).toBe('2025-01-01')
    expect(result!.frontmatter.tags).toEqual(['tech', 'blog'])
    expect(result!.content).toBe('This is the content.')
  })

  it('should return undefined when no frontmatter', () => {
    const raw = 'Just some content without frontmatter.'
    expect(parseFrontmatter(raw)).toBeUndefined()
  })

  it('should extract content correctly after frontmatter', () => {
    const raw = `---
title: Test
---

Line 1

Line 2`

    const result = parseFrontmatter(raw)
    expect(result).toBeDefined()
    expect(result!.content).toBe('Line 1\n\nLine 2')
  })

  it('should handle boolean values in frontmatter', () => {
    const raw = `---
draft: true
published: false
---

Content`

    const result = parseFrontmatter(raw)
    expect(result).toBeDefined()
    expect(result!.frontmatter.draft).toBe(true)
    expect(result!.frontmatter.published).toBe(false)
  })

  it('should handle empty frontmatter values', () => {
    const raw = `---
title: Test
description:
---

Content`

    const result = parseFrontmatter(raw)
    expect(result).toBeDefined()
    expect(result!.frontmatter.description).toBe('')
  })
})

describe('parseValue', () => {
  it('should return empty string for empty value', () => {
    expect(parseValue('')).toBe('')
  })

  it('should return empty string for empty quotes', () => {
    expect(parseValue('""')).toBe('')
    expect(parseValue("''")).toBe('')
  })

  it('should parse boolean true', () => {
    expect(parseValue('true')).toBe(true)
  })

  it('should parse boolean false', () => {
    expect(parseValue('false')).toBe(false)
  })

  it('should parse arrays', () => {
    expect(parseValue('[a, b, c]')).toEqual(['a', 'b', 'c'])
  })

  it('should parse empty arrays', () => {
    expect(parseValue('[]')).toEqual([])
  })

  it('should parse arrays with quoted strings', () => {
    expect(parseValue('["hello", "world"]')).toEqual(['hello', 'world'])
    expect(parseValue("['hello', 'world']")).toEqual(['hello', 'world'])
  })

  it('should parse quoted strings', () => {
    expect(parseValue('"hello world"')).toBe('hello world')
    expect(parseValue("'hello world'")).toBe('hello world')
  })

  it('should parse date-like values as strings', () => {
    expect(parseValue('2025-01-01')).toBe('2025-01-01')
  })

  it('should parse numbers', () => {
    expect(parseValue('42')).toBe(42)
    expect(parseValue('3.14')).toBe(3.14)
    expect(parseValue('-7')).toBe(-7)
  })

  it('should return raw string for unrecognized values', () => {
    expect(parseValue('hello')).toBe('hello')
  })
})

describe('detectLang', () => {
  it('should return default language for single language', () => {
    expect(detectLang('hello-world', 'en')).toBe('en')
  })

  it('should return default language when no languages configured', () => {
    expect(detectLang('hello-world', 'en', undefined)).toBe('en')
  })

  it('should return default language when only one language configured', () => {
    expect(detectLang('zh/hello-world', 'en', ['en'])).toBe('en')
  })

  it('should detect language from path prefix', () => {
    expect(detectLang('zh/hello-world', 'en', ['en', 'zh'])).toBe('zh')
    expect(detectLang('en/hello-world', 'en', ['en', 'zh'])).toBe('en')
  })

  it('should return default when path does not match any language', () => {
    expect(detectLang('hello-world', 'en', ['en', 'zh'])).toBe('en')
    expect(detectLang('fr/hello-world', 'en', ['en', 'zh'])).toBe('en')
  })
})
