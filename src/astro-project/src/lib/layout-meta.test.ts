import { describe, it, expect } from 'vitest'
import { validateBlogConfig } from '../../../engine/config.js'
import { buildLayoutMeta } from './layout-meta'

describe('layout meta builder', () => {
  it('builds article JSON-LD and resolves og image', () => {
    const config = validateBlogConfig({ name: 'Citepo', theme: 'clean' })
    const meta = buildLayoutMeta({
      config,
      siteUrl: 'https://example.com',
      pathname: '/posts/hello',
      title: 'Hello',
      description: 'World',
      type: 'article',
      publishedTime: '2024-01-01',
      authors: ['Ada'],
      tags: ['astro'],
      lang: 'en',
    })

    expect(meta.pageTitle).toBe('Hello - Citepo')
    expect(meta.canonicalUrl).toBe('https://example.com/posts/hello')
    expect(meta.resolvedOgImage).toContain('/og-image.png')
    expect(meta.jsonLd['@type']).toBe('BlogPosting')
  })

  it('builds alternate languages for website pages', () => {
    const config = validateBlogConfig({
      name: 'Citepo',
      basePath: '/blog',
      defaultLanguage: 'en',
      languages: ['en', 'zh'],
    })

    const meta = buildLayoutMeta({
      config,
      siteUrl: 'https://example.com',
      pathname: '/blog/about',
      lang: 'en',
      type: 'website',
    })

    expect(meta.resolvedAlternateLanguages.en).toBe('/blog/about')
    expect(meta.resolvedAlternateLanguages.zh).toBe('/blog/zh/about')
  })

  it('builds color overrides when configured', () => {
    const config = validateBlogConfig({
      name: 'Citepo',
      colors: { primary: '#000', background: '#fff' },
    })
    const meta = buildLayoutMeta({
      config,
      pathname: '/',
      lang: 'en',
    })

    expect(meta.colorOverrides).toContain('--primary: #000;')
    expect(meta.colorOverrides).toContain('--background: #fff;')
  })
})
