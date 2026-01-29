import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { isMultiLang, getPostSlug } from '../lib/i18n.ts'

export const GET: APIRoute = async () => {
  const config = blogConfig
  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const sorted = allPosts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  )

  const multiLang = isMultiLang(config)
  const lines: string[] = []

  lines.push(`# ${config.name}`)
  lines.push('')
  if (config.description) {
    lines.push(`> ${config.description}`)
    lines.push('')
  }

  if (sorted.length > 0) {
    if (multiLang) {
      const postsByLang = new Map<string, typeof sorted>()
      for (const post of sorted) {
        const slug = getPostSlug(post.id, config)
        const lang = detectLang(slug, config)
        const arr = postsByLang.get(lang) ?? []
        arr.push(post)
        postsByLang.set(lang, arr)
      }
      for (const [lang, posts] of postsByLang) {
        lines.push(`## Blog Posts (${lang})`)
        lines.push('')
        for (const post of posts) {
          const slug = getPostSlug(post.id, config)
          const desc = post.data.description ? `: ${post.data.description}` : ''
          lines.push(`- [${post.data.title}](/${slug})${desc}`)
        }
        lines.push('')
      }
    } else {
      lines.push('## Blog Posts')
      lines.push('')
      for (const post of sorted) {
        const slug = getPostSlug(post.id, config)
        const desc = post.data.description ? `: ${post.data.description}` : ''
        lines.push(`- [${post.data.title}](/${slug})${desc}`)
      }
      lines.push('')
    }
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function detectLang(slug: string, config: typeof blogConfig): string {
  if (config.languages && config.languages.length > 1) {
    for (const lang of config.languages) {
      if (slug.startsWith(`${lang}/`)) return lang
    }
  }
  return config.defaultLanguage
}
