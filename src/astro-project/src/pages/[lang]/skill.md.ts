import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { filterPostsByLang, getNonDefaultLanguages, isMultiLang } from '../../lib/i18n.ts'
import { entriesToPostData } from '../../lib/post-data.ts'
import { generateSkillMd } from '../../../../engine/generators/skill-md.js'

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
  const mappedPosts = entriesToPostData(langPosts, config)
  const content = generateSkillMd(config, mappedPosts, { language: lang })

  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
