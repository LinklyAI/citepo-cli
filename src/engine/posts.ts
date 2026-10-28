import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BlogConfig } from './config.js'
import { detectLang, parseFrontmatter, toEntryId } from './content.js'
import { postPathWithoutBase } from './sitemap.js'

/** One post as `citepo post list` shows it; drafts included. */
export interface PostSummary {
  /** Path relative to the project root, e.g. "content/zh/hello.mdx". */
  file: string
  title: string
  date: string
  lang: string
  /** URL path including basePath, e.g. "/blog/zh/hello". */
  url: string
  tags: string[]
  draft: boolean
  /** Languages this post exists in (multi-language blogs only). */
  translations: string[]
  /** Configured languages without a version of this post. */
  missingLanguages: string[]
}

export function isMultiLanguage(config: BlogConfig): boolean {
  return (config.languages?.length ?? 0) > 1
}

function basePrefix(config: BlogConfig): string {
  return config.basePath === '/' ? '' : config.basePath
}

/** Read every post (drafts too), newest first. Files without frontmatter are skipped. */
export async function listPosts(projectDir: string, config: BlogConfig): Promise<PostSummary[]> {
  const contentDir = path.join(projectDir, 'content')
  if (!existsSync(contentDir)) return []
  const files = (await readdir(contentDir, { recursive: true }))
    .map(String)
    .filter((f) => f.endsWith('.mdx'))

  const posts: (PostSummary & { key: string })[] = []
  for (const relative of files) {
    const parsed = parseFrontmatter(await readFile(path.join(contentDir, relative), 'utf-8'))
    if (!parsed) continue
    const fm = parsed.frontmatter
    const id = typeof fm.slug === 'string' && fm.slug ? fm.slug : toEntryId(relative)
    const lang = detectLang(id, config.defaultLanguage, config.languages)
    const urlPath = postPathWithoutBase({ slug: id, lang }, config)
    posts.push({
      file: ['content', ...relative.split(path.sep)].join('/'),
      title: typeof fm.title === 'string' ? fm.title : id,
      date: formatDate(fm.date),
      lang,
      url: `${basePrefix(config)}${urlPath}`,
      tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
      draft: fm.draft === true,
      translations: [],
      missingLanguages: [],
      // Same post in other languages shares the path after the language prefix
      key: isMultiLanguage(config) ? urlPath.replace(new RegExp(`^/${lang}(?=/)`), '') : urlPath,
    })
  }

  if (isMultiLanguage(config)) {
    const languages = config.languages ?? []
    const byKey = new Map<string, string[]>()
    for (const post of posts) byKey.set(post.key, [...(byKey.get(post.key) ?? []), post.lang])
    for (const post of posts) {
      post.translations = languages.filter((l) => byKey.get(post.key)?.includes(l))
      post.missingLanguages = languages.filter((l) => !post.translations.includes(l))
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file))
  return posts.map(({ key: _key, ...post }) => post)
}

function formatDate(value: unknown): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10)
}

export interface TagSummary {
  tag: string
  count: number
  /** Other spellings of the same tag (case or spacing), if any. */
  variants: string[]
}

/** Tags of published posts with their post counts, most used first. */
export function summarizeTags(posts: PostSummary[]): TagSummary[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    if (post.draft) continue
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  const tags = [...counts.entries()].map(([tag, count]) => ({ tag, count }))
  return tags
    .map(({ tag, count }) => ({
      tag,
      count,
      variants: tags
        .filter(
          (other) =>
            other.tag !== tag && other.tag.trim().toLowerCase() === tag.trim().toLowerCase(),
        )
        .map((other) => other.tag),
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export interface NewPostOptions {
  title: string
  slug: string
  languages: string[]
  description?: string
  tags?: string[]
  date: string
  draft?: boolean
}

export interface NewPostFile {
  file: string
  lang: string
  url: string
}

/** File a post lives in: content/<lang>/<slug>.mdx on multi-language blogs. */
export function postFilePath(config: BlogConfig, slug: string, lang: string): string {
  return isMultiLanguage(config) ? `content/${lang}/${slug}.mdx` : `content/${slug}.mdx`
}

/** Frontmatter and a short body for a new post. */
export function renderNewPost(options: Omit<NewPostOptions, 'languages' | 'slug'>): string {
  const yamlString = (value: string) => JSON.stringify(value)
  const lines = [
    '---',
    `title: ${yamlString(options.title)}`,
    `description: ${yamlString(options.description ?? '')}`,
    `date: ${options.date}`,
    `tags: [${(options.tags ?? []).map(yamlString).join(', ')}]`,
    ...(options.draft ? ['draft: true'] : []),
    '---',
    '',
    'Write the post here. Run `citepo docs components` for callouts, cards, steps and more.',
    '',
  ]
  return lines.join('\n')
}

/** Create one file per language. Fails before writing anything if a file exists. */
export async function createPost(
  projectDir: string,
  config: BlogConfig,
  options: NewPostOptions,
): Promise<NewPostFile[]> {
  const files = options.languages.map((lang) => ({
    lang,
    file: postFilePath(config, options.slug, lang),
    url: `${basePrefix(config)}${postPathWithoutBase({ slug: isMultiLanguage(config) ? `${lang}/${options.slug}` : options.slug, lang }, config)}`,
  }))
  const existing = files.find((f) => existsSync(path.join(projectDir, f.file)))
  if (existing) throw new PostExistsError(existing.file)

  for (const { file } of files) {
    const absolute = path.join(projectDir, file)
    await mkdir(path.dirname(absolute), { recursive: true })
    // wx: never overwrite a file created since the check above (e.g. by another agent)
    await writeFile(absolute, renderNewPost(options), { encoding: 'utf-8', flag: 'wx' })
  }
  return files
}

export class PostExistsError extends Error {
  constructor(readonly file: string) {
    super(`${file} already exists`)
    this.name = 'PostExistsError'
  }
}
