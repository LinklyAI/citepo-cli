import type { BlogConfig } from '../../../engine/config.js'
import type { PostData } from '../../../engine/content.js'
import { getPostLang } from './i18n.ts'

/** The fields of a content collection entry the text endpoints need. */
export type BlogEntryLike = {
  id: string
  body?: string
  data: {
    title: string
    description?: string
    date: Date
    tags?: string[]
    authors?: string[]
  }
}

/** Map collection entries to the generators' PostData, newest first. */
export function entriesToPostData(entries: BlogEntryLike[], config: BlogConfig): PostData[] {
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

/**
 * Markdown version of a post (served at "{post}.md"): YAML frontmatter with the
 * metadata, then the MDX body. Built from the parsed entry so the title and date are
 * always present, whatever the source file looks like.
 */
export function renderPostMarkdown(post: BlogEntryLike): string {
  const { title, description, date, tags = [], authors = [] } = post.data
  const lines = ['---', `title: ${JSON.stringify(title)}`]
  if (description) lines.push(`description: ${JSON.stringify(description)}`)
  lines.push(`date: ${new Date(date).toISOString().split('T')[0]}`)
  if (authors.length > 0) lines.push(`authors: ${JSON.stringify(authors)}`)
  if (tags.length > 0) lines.push(`tags: ${JSON.stringify(tags)}`)
  lines.push('---', '', `# ${title}`, '', (post.body ?? '').trim(), '')
  return lines.join('\n')
}
