import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import { validateBlogConfig } from './config.js'

describe('validateBlogConfig', () => {
  it('should accept minimal valid config', () => {
    const config = validateBlogConfig({ name: 'test' })
    expect(config.name).toBe('test')
  })

  it('should accept full valid config', () => {
    const config = validateBlogConfig({
      name: 'My Blog',
      description: 'A tech blog',
      theme: 'clean',
      defaultLanguage: 'en',
      languages: ['en', 'zh'],
      basePath: '/blog',
      rss: true,
      sitemap: true,
      llmsText: true,
      skillMd: true,
      postsPerPage: 20,
      colors: { primary: '#3b82f6' },
      font: { sans: 'Inter' },
      seo: { title: 'My Blog', keywords: ['tech'] },
      navigation: [{ label: 'Home', href: '/' }],
      social: { github: 'user', twitter: 'user' },
    })

    expect(config.name).toBe('My Blog')
    expect(config.description).toBe('A tech blog')
    expect(config.languages).toEqual(['en', 'zh'])
    expect(config.postsPerPage).toBe(20)
  })

  it('should reject empty name', () => {
    expect(() => validateBlogConfig({ name: '' })).toThrow(ZodError)
  })

  it('should reject missing name', () => {
    expect(() => validateBlogConfig({})).toThrow(ZodError)
  })

  it('should reject invalid defaultLanguage', () => {
    expect(() => validateBlogConfig({ name: 'test', defaultLanguage: 'xx' })).toThrow(ZodError)
  })

  it('should reject postsPerPage = 0', () => {
    expect(() => validateBlogConfig({ name: 'test', postsPerPage: 0 })).toThrow(ZodError)
  })

  it('should reject negative postsPerPage', () => {
    expect(() => validateBlogConfig({ name: 'test', postsPerPage: -5 })).toThrow(ZodError)
  })

  it('should reject non-integer postsPerPage', () => {
    expect(() => validateBlogConfig({ name: 'test', postsPerPage: 5.5 })).toThrow(ZodError)
  })

  it('should fill correct defaults for minimal config', () => {
    const config = validateBlogConfig({ name: 'test' })

    expect(config.theme).toBe('clean')
    expect(config.defaultLanguage).toBe('en')
    expect(config.basePath).toBe('/')
    expect(config.rss).toBe(true)
    expect(config.sitemap).toBe(true)
    expect(config.llmsText).toBe(true)
    expect(config.skillMd).toBe(true)
    expect(config.postsPerPage).toBe(10)
    expect(config.description).toBe('')
  })

  it('should normalize basePath without leading slash', () => {
    const config = validateBlogConfig({ name: 'test', basePath: 'blog/' })
    expect(config.basePath).toBe('/blog')
  })

  it('should normalize basePath with extra slashes', () => {
    const config = validateBlogConfig({ name: 'test', basePath: '//blog//' })
    expect(config.basePath).toBe('/blog')
  })

  it('should reject basePath as full URL', () => {
    expect(() => validateBlogConfig({ name: 'test', basePath: 'https://example.com/blog' }))
      .toThrowError()
  })

  // --- theme field validation ---

  it('should accept theme "clean"', () => {
    const config = validateBlogConfig({ name: 'test', theme: 'clean' })
    expect(config.theme).toBe('clean')
  })

  it('should accept theme "wabi"', () => {
    const config = validateBlogConfig({ name: 'test', theme: 'wabi' })
    expect(config.theme).toBe('wabi')
  })

  it('should reject invalid theme value', () => {
    expect(() => validateBlogConfig({ name: 'test', theme: 'invalid' })).toThrow(ZodError)
  })

  // --- logo field validation ---

  it('should accept logo as a string URL', () => {
    const config = validateBlogConfig({
      name: 'test',
      logo: 'https://example.com/logo.png',
    })
    expect(config.logo).toBe('https://example.com/logo.png')
  })

  it('should allow missing logo field', () => {
    const config = validateBlogConfig({ name: 'test' })
    expect(config.logo).toBeUndefined()
  })

  // --- hero field validation ---

  it('should accept hero with image', () => {
    const config = validateBlogConfig({
      name: 'test',
      hero: { image: '/images/hero.webp' },
    })
    expect(config.hero?.image).toBe('/images/hero.webp')
  })

  it('should allow missing hero field', () => {
    const config = validateBlogConfig({ name: 'test' })
    expect(config.hero).toBeUndefined()
  })

  it('should accept hero without image', () => {
    const config = validateBlogConfig({ name: 'test', hero: {} })
    expect(config.hero).toBeDefined()
    expect(config.hero?.image).toBeUndefined()
  })

  // --- contextual field validation ---

  it('should accept contextual with valid options', () => {
    const config = validateBlogConfig({
      name: 'test',
      contextual: { options: ['copy', 'view', 'chatgpt', 'claude'] },
    })
    expect(config.contextual?.options).toEqual(['copy', 'view', 'chatgpt', 'claude'])
  })

  it('should allow missing contextual field', () => {
    const config = validateBlogConfig({ name: 'test' })
    expect(config.contextual).toBeUndefined()
  })

  it('should reject invalid contextual option', () => {
    expect(() =>
      validateBlogConfig({
        name: 'test',
        contextual: { options: ['copy', 'invalid_option'] },
      }),
    ).toThrow(ZodError)
  })

  // --- social field validation ---

  it('should allow missing social field', () => {
    const config = validateBlogConfig({ name: 'test' })
    expect(config.social).toBeUndefined()
  })

  it('should accept social with partial fields', () => {
    const config = validateBlogConfig({
      name: 'test',
      social: { github: 'user123' },
    })
    expect(config.social?.github).toBe('user123')
    expect(config.social?.twitter).toBeUndefined()
  })
})
