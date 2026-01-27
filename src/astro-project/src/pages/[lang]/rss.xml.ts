import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { isMultiLang, getAllLanguages, filterPostsByLang, getPostUrl } from '../../lib/i18n.ts'

/** Generate static paths for ALL languages */
export function getStaticPaths() {
  const blogConfig = JSON.parse(process.env.CITEPO_BLOG_CONFIG || '{}') as {
    defaultLanguage?: string
    languages?: string[]
    basePath?: string
  }

  const i18nConfig = {
    defaultLanguage: blogConfig.defaultLanguage || 'en',
    languages: blogConfig.languages,
    basePath: blogConfig.basePath || '/',
  }

  if (!isMultiLang(i18nConfig)) return []

  return getAllLanguages(i18nConfig).map((lang) => ({
    params: { lang },
    props: { lang },
  }))
}

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

  const lang = context.params.lang || i18nConfig.defaultLanguage
  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const langPosts = filterPostsByLang(allPosts, lang, i18nConfig)
  const sortedPosts = langPosts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  )

  return rss({
    title: `${blogConfig.name || 'Blog'} (${lang})`,
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
