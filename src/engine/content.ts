import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export interface PostData {
  slug: string
  title: string
  description: string
  date: Date
  tags: string[]
  authors: string[]
  draft: boolean
  rawContent: string
  /** Language code extracted from file path (e.g., "zh" from "zh/hello-world") */
  lang: string
}

export interface ReadPostsOptions {
  defaultLanguage?: string
  languages?: string[]
}

/**
 * Read all published MDX posts from the content directory.
 * Parses frontmatter, filters out drafts, and sorts by date descending.
 */
export async function readAllPosts(
  contentDir: string,
  options?: ReadPostsOptions,
): Promise<PostData[]> {
  const defaultLang = options?.defaultLanguage ?? 'en'
  const configuredLangs = options?.languages

  const entries = await readdir(contentDir, { recursive: true })
  const mdxFiles = entries.filter((entry) => typeof entry === 'string' && entry.endsWith('.mdx'))

  const posts: PostData[] = []

  for (const relativePath of mdxFiles) {
    const filePath = path.join(contentDir, relativePath)
    const raw = await readFile(filePath, 'utf-8')
    const parsed = parseFrontmatter(raw)
    if (!parsed) continue

    const slug = relativePath.replace(/\.mdx$/, '')

    // Detect language from directory structure (e.g., "zh/hello-world" → "zh")
    const lang = detectLang(slug, defaultLang, configuredLangs)

    const fm = parsed.frontmatter

    const post: PostData = {
      slug,
      title: typeof fm.title === 'string' ? fm.title : slug,
      description: typeof fm.description === 'string' ? fm.description : '',
      date: fm.date ? new Date(String(fm.date)) : new Date(0),
      tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
      authors: Array.isArray(fm.authors) ? (fm.authors as string[]) : [],
      draft: fm.draft === true,
      rawContent: parsed.content,
      lang,
    }

    if (!post.draft) {
      posts.push(post)
    }
  }

  // Sort by date descending
  posts.sort((a, b) => b.date.getTime() - a.date.getTime())

  return posts
}

/** Detect language from file path based on configured languages */
export function detectLang(slug: string, defaultLang: string, languages?: string[]): string {
  if (!languages || languages.length <= 1) return defaultLang

  const firstSegment = slug.split('/')[0]
  if (firstSegment && languages.includes(firstSegment)) {
    return firstSegment
  }
  return defaultLang
}

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>
  content: string
}

/**
 * Parse frontmatter from raw MDX content.
 * Hand-written parser for YAML-like key: value pairs.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter | undefined {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return undefined

  const frontmatterBlock = match[1]!
  const content = raw.slice(match[0].length).trim()
  const frontmatter: Record<string, unknown> = {}

  const lines = frontmatterBlock.split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    const rawValue = line.slice(colonIndex + 1).trim()

    if (!key) continue

    frontmatter[key] = parseValue(rawValue)
  }

  return { frontmatter, content }
}

/**
 * Parse a YAML-like value: supports arrays, booleans, dates, quoted strings.
 */
export function parseValue(raw: string): unknown {
  // Empty value
  if (!raw || raw === '""' || raw === "''") return ''

  // Boolean
  if (raw === 'true') return true
  if (raw === 'false') return false

  // Array: [a, b, c]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1)
    if (!inner.trim()) return []
    return inner.split(',').map((item) => {
      const trimmed = item.trim()
      // Remove quotes if present
      if (
        (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        return trimmed.slice(1, -1)
      }
      return trimmed
    })
  }

  // Quoted string
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    return raw.slice(1, -1)
  }

  // Date-like value (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw)
  }

  return raw
}
