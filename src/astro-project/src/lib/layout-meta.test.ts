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
    expect(meta.resolvedOgImage).toBe('https://example.com/og/posts/hello.png')
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

describe('layout meta SEO details', () => {
  const config = validateBlogConfig({
    name: 'Linkly',
    basePath: '/blog',
    defaultLanguage: 'en',
    languages: ['en', 'zh', 'ja'],
  })

  it('uses one URL form: no trailing slash, siteUrl slash tolerated', () => {
    const meta = buildLayoutMeta({ config, siteUrl: 'https://x.com/', pathname: '/blog/hello/', lang: 'en' })
    expect(meta.canonicalUrl).toBe('https://x.com/blog/hello')
  })

  it('points posts at their own PNG card and other pages at the site card', () => {
    const post = buildLayoutMeta({ config, siteUrl: 'https://x.com', pathname: '/blog/zh/hello', lang: 'zh', type: 'article' })
    expect(post.resolvedOgImage).toBe('https://x.com/blog/og/zh/hello.png')
    const tag = buildLayoutMeta({ config, siteUrl: 'https://x.com', pathname: '/blog/tags/AI', lang: 'en' })
    expect(tag.resolvedOgImage).toBe('https://x.com/blog/og/index.png')
  })

  it('keeps an explicit cover image', () => {
    const meta = buildLayoutMeta({ config, siteUrl: 'https://x.com', pathname: '/blog/a', lang: 'en', type: 'article', ogImage: '/blog/images/a.webp' })
    expect(meta.resolvedOgImage).toBe('https://x.com/blog/images/a.webp')
  })

  it('emits OpenGraph locales and article JSON-LD fields', () => {
    const meta = buildLayoutMeta({ config: { ...config, logo: '/images/logo.png' }, siteUrl: 'https://x.com', pathname: '/blog/ja/a', lang: 'ja', type: 'article' })
    expect(meta.ogLocale).toBe('ja_JP')
    expect(meta.ogLocaleAlternates).toEqual(['en_US', 'zh_CN'])
    expect(meta.jsonLd.inLanguage).toBe('ja')
    expect(meta.jsonLd.mainEntityOfPage).toEqual({ '@type': 'WebPage', '@id': 'https://x.com/blog/ja/a' })
    expect(meta.jsonLd.publisher).toEqual({
      '@type': 'Organization',
      name: 'Linkly',
      logo: { '@type': 'ImageObject', url: 'https://x.com/blog/images/logo.png' },
    })
  })
})

describe('layout meta hreflang links', () => {
  const config = validateBlogConfig({ name: 'B', basePath: '/blog', defaultLanguage: 'en', languages: ['en', 'zh'] })

  it('uses the normalized site URL, encodes paths and falls back to the blog home for x-default', () => {
    const meta = buildLayoutMeta({
      config,
      siteUrl: 'https://x.com/',
      pathname: '/blog/zh/%E4%BD%A0%E5%A5%BD',
      lang: 'zh',
      type: 'article',
      alternateLanguages: { zh: '/blog/zh/你好' },
    })
    expect(meta.canonicalUrl).toBe('https://x.com/blog/zh/%E4%BD%A0%E5%A5%BD')
    expect(meta.alternateLinks).toEqual([
      { hreflang: 'zh', href: 'https://x.com/blog/zh/%E4%BD%A0%E5%A5%BD' },
      { hreflang: 'x-default', href: 'https://x.com/blog' },
    ])
  })

  it('emits no canonical or hreflang for noindex pages', () => {
    const meta = buildLayoutMeta({ config, siteUrl: 'https://x.com', pathname: '/blog/404', lang: 'en', noindex: true })
    expect(meta.canonicalUrl).toBeUndefined()
    expect(meta.alternateLinks).toEqual([])
  })

  it('uses a canonical override and adds dateModified for updated posts', () => {
    const meta = buildLayoutMeta({
      config,
      siteUrl: 'https://x.com',
      pathname: '/blog/hello',
      lang: 'en',
      type: 'article',
      publishedTime: '2026-01-01T00:00:00.000Z',
      modifiedTime: '2026-03-01T00:00:00.000Z',
      canonical: 'https://original.example/post',
    })
    expect(meta.canonicalUrl).toBe('https://original.example/post')
    expect(meta.jsonLd).toMatchObject({
      dateModified: '2026-03-01T00:00:00.000Z',
      mainEntityOfPage: { '@id': 'https://original.example/post' },
    })
  })
})
