import type { BlogConfig } from '../config.js'
import type { PostData } from '../content.js'

/**
 * Generate skill.md content — a structured overview for AI agents.
 * Includes YAML frontmatter, blog metadata, post list, and tag statistics.
 */
export function generateSkillMd(
  config: BlogConfig,
  posts: PostData[],
  options?: { language?: string },
): string {
  const lines: string[] = []

  const isMultiLang = (config.languages?.length ?? 0) > 1
  const language = options?.language ?? config.defaultLanguage

  // YAML frontmatter
  lines.push('---')
  lines.push(`name: "${config.name}"`)
  lines.push(`description: "${config.description}"`)
  lines.push(`type: blog`)
  lines.push(`theme: "${config.theme}"`)
  lines.push(`language: "${language}"`)
  if (isMultiLang && config.languages) {
    lines.push(`languages: [${config.languages.map((l) => `"${l}"`).join(', ')}]`)
  }
  lines.push(`post_count: ${posts.length}`)
  lines.push('---')
  lines.push('')

  // Blog description
  lines.push(`# ${config.name}`)
  lines.push('')
  if (config.description) {
    lines.push(config.description)
    lines.push('')
  }

  // Post list
  if (posts.length > 0) {
    lines.push('## Posts')
    lines.push('')

    for (const post of posts) {
      const dateStr = post.date.toISOString().split('T')[0]
      const tags = post.tags.length > 0 ? ` [${post.tags.join(', ')}]` : ''
      const langTag = isMultiLang ? ` (${post.lang})` : ''
      lines.push(`- **${post.title}** (${dateStr})${langTag}${tags}`)
      if (post.description) {
        lines.push(`  ${post.description}`)
      }
    }

    lines.push('')
  }

  // Tag statistics
  const tagCounts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) {
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

  return lines.join('\n')
}
