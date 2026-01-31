import { describe, it, expect } from 'vitest'
import { buildAlternateLanguagesForTag, buildAlternateLanguagesForPagination } from './i18n.ts'

const config = {
  defaultLanguage: 'en',
  languages: ['en', 'zh', 'ja'],
  basePath: '/blog',
}

describe('i18n alternates', () => {
  it('builds tag alternates only for languages that contain the tag', () => {
    const posts = [
      { id: 'hello-world', data: { tags: ['alpha'] } },
      { id: 'zh/nihao', data: { tags: ['alpha'] } },
      { id: 'ja/konnichiwa', data: { tags: ['beta'] } },
    ]

    const result = buildAlternateLanguagesForTag('alpha', posts, config)
    expect(result).toEqual({
      en: '/blog/tags/alpha',
      zh: '/blog/zh/tags/alpha',
    })
  })

  it('builds pagination alternates only for languages that have the page', () => {
    const posts = [
      { id: 'post-1' },
      { id: 'post-2' },
      { id: 'post-3' },
      { id: 'zh/one' },
      { id: 'ja/a' },
      { id: 'ja/b' },
      { id: 'ja/c' },
      { id: 'ja/d' },
    ]

    const result = buildAlternateLanguagesForPagination(2, posts, config, 2)
    expect(result).toEqual({
      en: '/blog/page/2',
      ja: '/blog/ja/page/2',
    })
  })
})
