import { describe, it, expect } from 'vitest'
import type { SitemapItem } from '@astrojs/sitemap'
import { validateBlogConfig } from './config.js'
import type { PostData } from './content.js'
import { buildSitemapOptions } from './sitemap.js'

const config = validateBlogConfig({
  name: 'Blog',
  basePath: '/blog',
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
})

const post = (slug: string, lang: string, date: string): PostData => ({
  slug,
  lang,
  title: slug,
  description: '',
  date: new Date(date),
  tags: [],
  authors: [],
  draft: false,
  rawContent: '',
})

describe('buildSitemapOptions', () => {
  const options = buildSitemapOptions(config, [post('hello', 'en', '2026-01-02'), post('zh/hello', 'zh', '2026-01-03')])

  it('leaves tag and pagination pages out', () => {
    expect(options.filter!('https://x.com/blog/hello')).toBe(true)
    expect(options.filter!('https://x.com/blog/tags/AI')).toBe(false)
    expect(options.filter!('https://x.com/blog/zh/tags/AI')).toBe(false)
    expect(options.filter!('https://x.com/blog/page/2')).toBe(false)
  })

  it('adds lastmod for posts and strips trailing slashes from alternates', async () => {
    const item: SitemapItem = {
      url: 'https://x.com/blog/zh/hello',
      links: [{ lang: 'en', url: 'https://x.com/blog/' }],
    }
    const out = await options.serialize!(item)
    expect(out).toMatchObject({
      lastmod: '2026-01-03T00:00:00.000Z',
      links: [{ lang: 'en', url: 'https://x.com/blog' }],
    })
  })

  it('declares hreflang locales for multi-language blogs', () => {
    expect(options.i18n).toEqual({ defaultLocale: 'en', locales: { en: 'en', zh: 'zh' } })
  })
})
