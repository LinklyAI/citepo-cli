import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import blogConfig from 'virtual:blog-config'
import { isMultiLang, getPostSlug } from '../lib/i18n.ts'

export const GET: APIRoute = async () => {
  const config = blogConfig
  const multiLang = isMultiLang(config)
  const allPosts = await getCollection('blog', ({ data }) => !data.draft)
  const sorted = allPosts.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
  )

  const lines: string[] = []

  // YAML frontmatter
  lines.push('---')
  lines.push(`name: "${config.name}"`)
  lines.push(`description: "${config.description}"`)
  lines.push(`type: blog`)
  lines.push(`theme: "${config.theme}"`)
  lines.push(`language: "${config.defaultLanguage}"`)
  if (multiLang && config.languages) {
    lines.push(`languages: [${config.languages.map((l: string) => `"${l}"`).join(', ')}]`)
  }
  lines.push(`post_count: ${sorted.length}`)
  lines.push('---')
  lines.push('')

  lines.push(`# ${config.name}`)
  lines.push('')
  if (config.description) {
    lines.push(config.description)
    lines.push('')
  }

  // Post list
  if (sorted.length > 0) {
    lines.push('## Posts')
    lines.push('')
    for (const post of sorted) {
      const slug = getPostSlug(post.id, config)
      const dateStr = new Date(post.data.date).toISOString().split('T')[0]
      const tags = post.data.tags.length > 0 ? ` [${post.data.tags.join(', ')}]` : ''
      const langTag = multiLang ? ` (${detectLang(slug, config)})` : ''
      lines.push(`- **${post.data.title}** (${dateStr})${langTag}${tags}`)
      if (post.data.description) {
        lines.push(`  ${post.data.description}`)
      }
    }
    lines.push('')
  }

  // Tag statistics
  const tagCounts = new Map<string, number>()
  for (const post of sorted) {
    for (const tag of post.data.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  if (tagCounts.size > 0) {
    lines.push('## Tags')
    lines.push('')
    const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])
    for (const [tag, count] of sortedTags) {
      lines.push(`- **${tag}**: ${count} ${count === 1 ? 'post' : 'posts'}`)
    }
    lines.push('')
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
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
