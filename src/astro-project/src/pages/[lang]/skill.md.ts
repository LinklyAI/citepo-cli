import type { APIRoute } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { filterPostsByLang, getPostLang, getNonDefaultLanguages, isMultiLang } from '../../lib/i18n.ts'
import { generateSkillMd } from '../../../../engine/generators/skill-md.js'
import type { PostData } from '../../../../engine/content.js'

export function getStaticPaths() {
  if (!blogConfig.skillMd || !isMultiLang(blogConfig)) return []
  return getNonDefaultLanguages(blogConfig).map((lang) => ({
    params: { lang },
    props: { lang },
  }))
}

export const GET: APIRoute = async (context) => {
  const config = blogConfig
  if (!config.skillMd) {
    return new Response(null, { status: 404 })
  }

  const lang = context.params.lang
  if (!lang || !isMultiLang(config) || !config.languages?.includes(lang)) {
    return new Response(null, { status: 404 })
  }

  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const langPosts = filterPostsByLang(allPosts, lang, config)
  const mappedPosts = mapEntriesToPostData(langPosts, config)
  const content = generateSkillMd(config, mappedPosts, { language: lang })

  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
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
