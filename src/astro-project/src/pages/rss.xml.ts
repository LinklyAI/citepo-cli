import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { isMultiLang, getPostUrl } from '../lib/i18n.ts'

export async function GET(context: APIContext) {
  const blogConfig = JSON.parse(process.env.CITEPO_BLOG_CONFIG || '{}') as {
    name?: string
    description?: string
    siteUrl?: string
    defaultLanguage?: string
    languages?: string[]
    basePath?: string
  }

  const i18nConfig = {
    defaultLanguage: blogConfig.defaultLanguage || 'en',
    languages: blogConfig.languages,
    basePath: blogConfig.basePath || '/',
  }

  // Multi-lang: RSS is under /[lang]/rss.xml; root /rss.xml not generated
  if (isMultiLang(i18nConfig)) {
    return new Response(null, { status: 404 })
  }

  // Single-lang: generate RSS for all posts
  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const sortedPosts = allPosts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  )

  return rss({
    title: blogConfig.name || 'Blog',
    description: blogConfig.description || '',
    site: context.site?.toString() || blogConfig.siteUrl || 'https://example.com',
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: getPostUrl(post.id, i18nConfig),
    })),
  })
}
