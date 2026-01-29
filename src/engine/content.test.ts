import { describe, it, expect } from 'vitest'
import { parseFrontmatter, detectLang } from './content.js'

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
    expect(result!.frontmatter.date).toEqual(new Date('2025-01-01'))
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
    expect(result!.frontmatter.description).toBe(null)
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
