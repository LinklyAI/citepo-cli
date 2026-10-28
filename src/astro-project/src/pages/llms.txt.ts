import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { filterPostsByLang, isMultiLang } from '../lib/i18n.ts'
import { entriesToPostData } from '../lib/post-data.ts'
import { generateLlmsTxt } from '../../../engine/generators/llms-txt.js'

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
  const mappedPosts = entriesToPostData(langPosts, config)
  const siteUrl = context.site?.toString() || config.siteUrl
  const content = generateLlmsTxt(config, mappedPosts, siteUrl)

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
