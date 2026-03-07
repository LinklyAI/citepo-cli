import { describe, it, expect } from 'vitest'
import { validateBlogConfig } from '../../../engine/config.js'
import {
  buildIndexPageProps,
  buildListPageProps,
  buildPostPageProps,
  buildSiteProps,
  mapPostEntryToPost,
  mapPostEntryToSummary,
} from './theme-props'

describe('theme props adapters', () => {
  it('builds site props for single-language config', () => {
    const config = validateBlogConfig({ name: 'Test Blog' })
    const site = buildSiteProps({
      config,
      lang: 'en',
      translations: { en: '/' },
    })

    expect(site.name).toBe('Test Blog')
    expect(site.basePath).toBe('/')
    expect(site.languages).toBeUndefined()
    expect(site.translations).toBeUndefined()
    expect(site.urls?.home).toBe('/')
  })

  it('builds site props for multi-language config', () => {
    const config = validateBlogConfig({
      name: 'Test Blog',
      basePath: '/blog',
      languages: ['en', 'zh'],
      defaultLanguage: 'en',
    })
    const site = buildSiteProps({
      config,
      lang: 'en',
      translations: { en: '/', zh: '/zh/' },
    })

    expect(site.languages).toEqual(['en', 'zh'])
    expect(site.translations).toEqual({ en: '/', zh: '/zh/' })
    expect(site.urls?.home).toBe('/blog')
  })

  it('builds index page props', () => {
    const config = validateBlogConfig({
      name: 'Test Blog',
      hero: { image: '/hero.png' },
    })
    const props = buildIndexPageProps({
      config,
      lang: 'en',
      posts: [
        {
          title: 'Hello',
          url: '/hello',
          date: '2024-01-01',
        },
      ],
    })

    expect(props.site.name).toBe('Test Blog')
    expect(props.hero?.image).toBe('/hero.png')
    expect(props.posts.length).toBe(1)
  })

  it('builds list page props', () => {
    const config = validateBlogConfig({ name: 'Test Blog' })
    const props = buildListPageProps({
      config,
      lang: 'en',
      title: 'Tags',
      items: [],
    })

    expect(props.title).toBe('Tags')
    expect(props.items).toEqual([])
  })

  it('builds post page props with navigation', () => {
    const config = validateBlogConfig({ name: 'Test Blog' })
    const props = buildPostPageProps({
      config,
      lang: 'en',
      post: {
        title: 'Post',
        date: '2024-01-01',
      },
      navigation: {
        prev: { title: 'Prev', url: '/prev' },
        next: { title: 'Next', url: '/next' },
      },
      contextualOptions: ['copy', 'view'],
    })

    expect(props.post.title).toBe('Post')
    expect(props.navigation?.prev?.url).toBe('/prev')
    expect(props.contextualOptions).toEqual(['copy', 'view'])
  })

  it('prefixes logo with basePath', () => {
    const config = validateBlogConfig({
      name: 'Test Blog',
      basePath: '/blog',
      logo: '/images/logo.png',
    })
    const site = buildSiteProps({ config, lang: 'en' })
    expect(site.logo).toBe('/blog/images/logo.png')
  })

  it('does not prefix external logo URLs', () => {
    const config = validateBlogConfig({
      name: 'Test Blog',
      basePath: '/blog',
      logo: 'https://cdn.example.com/logo.png',
    })
    const site = buildSiteProps({ config, lang: 'en' })
    expect(site.logo).toBe('https://cdn.example.com/logo.png')
  })

  it('keeps logo as-is when basePath is root', () => {
    const config = validateBlogConfig({
      name: 'Test Blog',
      logo: '/images/logo.png',
    })
    const site = buildSiteProps({ config, lang: 'en' })
    expect(site.logo).toBe('/images/logo.png')
  })

  it('maps post entry to summary with basePath', () => {
    const config = validateBlogConfig({ name: 'Test Blog', basePath: '/blog' })
    const summary = mapPostEntryToSummary(
      {
        id: 'hello-world',
        data: {
          title: 'Hello',
          date: new Date('2024-01-01T00:00:00Z'),
        },
      },
      config,
    )

    expect(summary.url).toBe('/blog/hello-world')
    expect(summary.slug).toBe('hello-world')
    expect(summary.date).toBe('2024-01-01T00:00:00.000Z')
  })

  it('handles empty tags/authors/headings', () => {
    const post = mapPostEntryToPost(
      {
        id: 'hello-world',
        data: {
          title: 'Hello',
          date: new Date('2024-01-01T00:00:00Z'),
        },
      },
      undefined,
    )

    expect(post.tags).toBeUndefined()
    expect(post.authors).toBeUndefined()
    expect(post.headings).toBeUndefined()
  })
})
