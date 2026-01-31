import type { APIRoute } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { filterPostsByLang, getPostLang, isMultiLang } from '../lib/i18n.ts'
import { generateLlmsTxt } from '../../../engine/generators/llms-txt.js'
import type { PostData } from '../../../engine/content.js'

export const GET: APIRoute = async (context) => {
  const config = blogConfig
  if (!config.llmsText) {
    return new Response(null, { status: 404 })
  }

  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const defaultLang = config.defaultLanguage || 'en'
  const langPosts = isMultiLang(config)
    ? filterPostsByLang(allPosts, defaultLang, config)
    : allPosts
  const mappedPosts = mapEntriesToPostData(langPosts, config)
  const siteUrl = context.site?.toString() || config.siteUrl
  const content = generateLlmsTxt(config, mappedPosts, siteUrl)

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function mapEntriesToPostData(
  entries: CollectionEntry<'blog'>[],
  config: typeof blogConfig,
): PostData[] {
  return entries
    .map((post) => ({
      slug: post.id,
      title: post.data.title,
      description: post.data.description ?? '',
      date: new Date(post.data.date),
      tags: post.data.tags ?? [],
      authors: post.data.authors ?? [],
      draft: false,
      rawContent: post.body ?? '',
      lang: getPostLang(post.id, config),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}
