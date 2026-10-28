import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { filterPostsByLang, isMultiLang } from '../lib/i18n.ts'
import { entriesToPostData } from '../lib/post-data.ts'
import { generateSkillMd } from '../../../engine/generators/skill-md.js'

export const GET: APIRoute = async () => {
  const config = blogConfig
  if (!config.skillMd) {
    return new Response(null, { status: 404 })
  }

  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const defaultLang = config.defaultLanguage || 'en'
  const langPosts = isMultiLang(config)
    ? filterPostsByLang(allPosts, defaultLang, config)
    : allPosts
  const mappedPosts = entriesToPostData(langPosts, config)
  const content = generateSkillMd(config, mappedPosts, { language: defaultLang })

  return new Response(content, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  })
}
