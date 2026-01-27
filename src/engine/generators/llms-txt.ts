import type { BlogConfig } from '../config.js'
import type { PostData } from '../content.js'

/**
 * Generate llms.txt content following the llmstxt.org spec.
 * Provides a structured overview of blog posts for LLM consumption.
 * Groups posts by language when multi-language is enabled.
 */
export function generateLlmsTxt(config: BlogConfig, posts: PostData[], siteUrl?: string): string {
  const lines: string[] = []

  lines.push(`# ${config.name}`)
  lines.push('')

  if (config.description) {
    lines.push(`> ${config.description}`)
    lines.push('')
  }

  const isMultiLang = (config.languages?.length ?? 0) > 1

  if (posts.length > 0) {
    if (isMultiLang) {
      // Group posts by language
      const postsByLang = new Map<string, PostData[]>()
      for (const post of posts) {
        const langPosts = postsByLang.get(post.lang) ?? []
        langPosts.push(post)
        postsByLang.set(post.lang, langPosts)
      }

      for (const [lang, langPosts] of postsByLang) {
        lines.push(`## Blog Posts (${lang})`)
        lines.push('')

        for (const post of langPosts) {
          const url = buildPostUrl(post, config, siteUrl)
          const desc = post.description ? `: ${post.description}` : ''
          lines.push(`- [${post.title}](${url})${desc}`)
        }

        lines.push('')
      }
    } else {
      lines.push('## Blog Posts')
      lines.push('')

      for (const post of posts) {
        const url = siteUrl ? `${siteUrl}/${post.slug}` : `/${post.slug}`
        const desc = post.description ? `: ${post.description}` : ''
        lines.push(`- [${post.title}](${url})${desc}`)
      }

      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Generate llms-full.txt content with full post bodies.
 * Provides complete blog content for LLM deep reading.
 */
export function generateLlmsFullTxt(config: BlogConfig, posts: PostData[]): string {
  const lines: string[] = []

  lines.push(`# ${config.name}`)
  lines.push('')

  if (config.description) {
    lines.push(`> ${config.description}`)
    lines.push('')
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]!
    lines.push(`## ${post.title}`)
    lines.push('')
    lines.push(post.rawContent)

    if (i < posts.length - 1) {
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  lines.push('')

  return lines.join('\n')
}

/** Build the correct URL for a post, handling multi-lang prefix stripping */
function buildPostUrl(post: PostData, config: BlogConfig, siteUrl?: string): string {
  const isMultiLang = (config.languages?.length ?? 0) > 1
  let urlPath: string

  if (isMultiLang) {
    // Strip language prefix from slug to get clean path
    const langPrefix = post.lang + '/'
    const cleanSlug = post.slug.startsWith(langPrefix)
      ? post.slug.slice(langPrefix.length)
      : post.slug

    // ALL languages get prefix in multi-lang mode
    urlPath = `/${post.lang}/${cleanSlug}`
  } else {
    urlPath = `/${post.slug}`
  }

  return siteUrl ? `${siteUrl}${urlPath}` : urlPath
}
