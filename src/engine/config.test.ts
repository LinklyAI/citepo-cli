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
      siteUrl: 'https://example.com',
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
    expect(() => validateBlogConfig({ name: 'test', defaultLanguage: 'fr' })).toThrow(ZodError)
  })

  it('should reject invalid siteUrl', () => {
    expect(() => validateBlogConfig({ name: 'test', siteUrl: 'not-a-url' })).toThrow(ZodError)
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
})
