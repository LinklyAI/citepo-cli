import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { isMultiLang, filterPostsByLang, getPostUrl } from '../lib/i18n.ts'
import blogConfig from 'virtual:blog-config'

export async function GET(context: APIContext) {
  const i18nConfig = {
    defaultLanguage: blogConfig.defaultLanguage || 'en',
    languages: blogConfig.languages,
    basePath: blogConfig.basePath || '/',
  }

  if (!blogConfig.rss) {
    return new Response(null, { status: 404 })
  }

  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const langPosts = isMultiLang(i18nConfig)
    ? filterPostsByLang(allPosts, i18nConfig.defaultLanguage, i18nConfig)
    : allPosts
  const sortedPosts = langPosts.sort(
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
